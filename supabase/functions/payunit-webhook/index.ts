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

const PAYUNIT_BASE_URL = "https://gateway.payunit.net";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Two flows reach this function, same shape as flutterwave-webhook:
//  1. Webhook (server→server): PayUnit posts to notify_url. We never trust
//     the POST body's stated status — we always re-verify by calling
//     GET /api/gateway/paymentstatus/{transactionID} (authoritative).
//  2. Redirect callback (browser): the user lands back on the app with our
//     own ?transaction_id=... (we set it ourselves in payunit-checkout's
//     return_url). The frontend calls this function (GET) to verify.

const CYCLE_MONTHS: Record<string, number> = { monthly: 1, yearly: 12 };

function parseTxRef(txRef: string): { planId: string | null; cycle: "monthly" | "yearly" | null; userId: string | null } {
  // Format produced by payunit-checkout: mafo-<plan>-<cycle>-<userId8>-<ts>
  const parts = txRef.split("-");
  if (parts.length < 5 || parts[0] !== "mafo") return { planId: null, cycle: null, userId: null };
  return { planId: parts[1], cycle: parts[2] as "monthly" | "yearly", userId: parts[3] };
}

async function verifyAndActivate(transactionId: string) {
  const PU_API_USER = Deno.env.get("PAYUNIT_API_USER");
  const PU_API_PASSWORD = Deno.env.get("PAYUNIT_API_PASSWORD");
  const PU_API_KEY = Deno.env.get("PAYUNIT_API_KEY");
  const PU_MODE = (Deno.env.get("PAYUNIT_MODE") ?? "test").toLowerCase();
  if (!PU_API_USER || !PU_API_PASSWORD || !PU_API_KEY) {
    throw new Error("PayUnit secrets are not configured.");
  }

  const authB64 = btoa(`${PU_API_USER}:${PU_API_PASSWORD}`);
  const resp = await fetch(`${PAYUNIT_BASE_URL}/api/gateway/paymentstatus/${encodeURIComponent(transactionId)}`, {
    headers: {
      Authorization: `Basic ${authB64}`,
      "x-api-key": PU_API_KEY,
      mode: PU_MODE,
      "Content-Type": "application/json",
    },
  });
  const data = await resp.json().catch(() => null);

  if (!data || data.status !== "SUCCESS" || data.data?.transaction_status !== "SUCCESS") {
    return {
      activated: false,
      reason: data?.data?.message || data?.message || "Transaction not successful",
      status: data?.data?.transaction_status,
    };
  }

  const { planId, cycle, userId } = parseTxRef(transactionId);
  if (!userId || !planId || !cycle || !(cycle in CYCLE_MONTHS)) {
    return { activated: false, reason: "Cannot determine user/plan/cycle from transaction_id" };
  }

  const months = CYCLE_MONTHS[cycle];
  const periodEnd = new Date(Date.now() + months * 30 * 86400000).toISOString();

  const { error } = await supabase.from("subscriptions").upsert(
    {
      user_id: userId,
      plan_id: planId,
      cycle,
      provider: "payunit",
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
    // Browser-driven verification (GET): ?transaction_id=...
    if (req.method === "GET") {
      const url = new URL(req.url);
      const txId = url.searchParams.get("transaction_id");
      if (!txId) return json({ error: "Missing transaction_id" }, 400);
      const result = await verifyAndActivate(txId).catch((e) => ({ activated: false, reason: e.message }));
      return json(result);
    }

    // Webhook (POST): PayUnit's notify_url payload shape isn't strictly
    // documented, so we defensively look for the transaction_id under a few
    // likely keys rather than assuming one exact shape.
    if (req.method === "POST") {
      const body = await req.json().catch(() => null);
      if (!body) return json({ error: "Invalid JSON body" }, 400);

      const txId =
        body.transaction_id ??
        body.data?.transaction_id ??
        body.transactionId ??
        body.data?.transactionId;

      if (!txId) {
        // Not a payment event we can act on; acknowledge to stop retries.
        return json({ received: true, skipped: true });
      }
      const result = await verifyAndActivate(txId).catch((e) => ({ activated: false, reason: e.message }));
      console.log(`PayUnit webhook tx=${txId} result=`, result);
      return json({ received: true, ...result });
    }

    return json({ error: "Method not allowed" }, 405);
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
