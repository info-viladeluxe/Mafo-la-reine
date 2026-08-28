import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const CYCLE_MONTHS: Record<string, number> = { monthly: 1, yearly: 12 };

function parseTxRef(ref: string): { planId: string | null; cycle: "monthly" | "yearly" | null; userId: string | null } {
  // Format produced by paystack-checkout: mafo-<plan>-<cycle>-<userId8>-<ts>
  const parts = ref.split("-");
  if (parts.length < 5 || parts[0] !== "mafo") return { planId: null, cycle: null, userId: null };
  return { planId: parts[1], cycle: parts[2] as "monthly" | "yearly", userId: parts[3] };
}

async function hmacSha512Hex(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw", enc.encode(key), { name: "HMAC", hash: "SHA-512" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Never trust the POST body's stated status — always re-verify with
// GET /transaction/verify/:reference (authoritative), same pattern as the
// Flutterwave/PayUnit webhooks.
async function verifyAndActivate(reference: string) {
  const PS_SECRET = Deno.env.get("PAYSTACK_SECRET_KEY");
  if (!PS_SECRET) throw new Error("PAYSTACK_SECRET_KEY is not configured.");

  const resp = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${PS_SECRET}` },
  });
  const data = await resp.json().catch(() => null);

  if (!data || !data.status || data.data?.status !== "success") {
    return { activated: false, reason: data?.data?.gateway_response || data?.message || "Transaction not successful", status: data?.data?.status };
  }

  const { planId, cycle, userId } = parseTxRef(reference);
  if (!userId || !planId || !cycle || !(cycle in CYCLE_MONTHS)) {
    return { activated: false, reason: "Cannot determine user/plan/cycle from reference" };
  }

  const months = CYCLE_MONTHS[cycle];
  const periodEnd = new Date(Date.now() + months * 30 * 86400000).toISOString();

  const { error } = await supabase.from("subscriptions").upsert(
    {
      user_id: userId,
      plan_id: planId,
      cycle,
      provider: "paystack",
      status: "active",
      current_period_end: periodEnd,
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) return { activated: false, reason: error.message };
  return { activated: true, userId, planId, cycle, periodEnd };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Browser-driven verification (GET): ?reference=... (also accept
    // Paystack's own ?trxref= param name for compatibility).
    if (req.method === "GET") {
      const url = new URL(req.url);
      const ref = url.searchParams.get("reference") || url.searchParams.get("trxref");
      if (!ref) return json({ error: "Missing reference" }, 400);
      const result = await verifyAndActivate(ref).catch((e) => ({ activated: false, reason: e.message }));
      return json(result);
    }

    // Webhook (POST): Paystack signs the raw body with HMAC-SHA512 using the
    // secret key — reject anything that doesn't match before touching it.
    // https://paystack.com/docs (Verify webhook signature).
    if (req.method === "POST") {
      const PS_SECRET = Deno.env.get("PAYSTACK_SECRET_KEY");
      const rawBody = await req.text();
      const signature = req.headers.get("x-paystack-signature");

      if (PS_SECRET && signature) {
        const expected = await hmacSha512Hex(PS_SECRET, rawBody);
        if (expected !== signature) {
          return json({ error: "Invalid signature" }, 401);
        }
      } else if (PS_SECRET) {
        // Secret configured but no signature header present — reject rather
        // than silently trusting an unsigned POST.
        return json({ error: "Missing signature" }, 401);
      }

      const body = JSON.parse(rawBody || "null");
      if (!body) return json({ error: "Invalid JSON body" }, 400);

      const ref = body.data?.reference;
      if (!ref) return json({ received: true, skipped: true });

      const result = await verifyAndActivate(ref).catch((e) => ({ activated: false, reason: e.message }));
      console.log(`Paystack webhook ref=${ref} result=`, result);
      return json({ received: true, ...result });
    }

    return json({ error: "Method not allowed" }, 405);
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
