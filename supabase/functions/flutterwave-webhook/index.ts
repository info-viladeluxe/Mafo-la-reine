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

// Two flows reach this function:
//  1. Webhook (server→server): FLW posts an event. We re-verify via the
//     /transactions/:id/verify endpoint (authoritative) and activate.
//  2. Redirect callback (browser): the user lands back on the app with
//     `transaction_id` / `tx_ref`. The frontend calls this function (GET)
//     to verify the transaction and activate the subscription.

const CYCLE_MONTHS: Record<string, number> = { monthly: 1, yearly: 12 };

function parseTxRef(txRef: string): { planId: string | null; cycle: "monthly" | "yearly" | null; userId: string | null } {
  // Format produced by flutterwave-checkout: mafo-<plan>-<cycle>-<userId8>-<ts>
  const parts = txRef.split("-");
  if (parts.length < 5 || parts[0] !== "mafo") return { planId: null, cycle: null, userId: null };
  return { planId: parts[1], cycle: parts[2] as "monthly" | "yearly", userId: parts[3] };
}

async function verifyAndActivate(txId: string | number, txRef?: string) {
  const FLW_SECRET = Deno.env.get("FLUTTERWAVE_SECRET_KEY");
  if (!FLW_SECRET) throw new Error("FLUTTERWAVE_SECRET_KEY is not configured.");

  const resp = await fetch(`https://api.flutterwave.com/v3/transactions/${txId}/verify`, {
    headers: { Authorization: `Bearer ${FLW_SECRET}` },
  });
  const data = await resp.json();
  if (data.status !== "success" || data.data?.status !== "successful") {
    return { activated: false, reason: data.message || "Transaction not successful", status: data.data?.status };
  }

  const ref = txRef ?? data.data.tx_ref;
  const { planId, cycle, userId } = parseTxRef(ref);
  const meta = data.data.meta ?? {};
  const finalUserId = userId ?? meta.user_id;
  const finalPlan = planId ?? meta.plan_id;
  const finalCycle = cycle ?? (meta.cycle ?? null);

  if (!finalUserId || !finalPlan || !finalCycle || !(finalCycle in CYCLE_MONTHS)) {
    return { activated: false, reason: "Cannot determine user/plan/cycle from transaction" };
  }

  const months = CYCLE_MONTHS[finalCycle];
  const periodEnd = new Date(Date.now() + months * 30 * 86400000).toISOString();

  const { error } = await supabase.from("subscriptions").upsert(
    {
      user_id: finalUserId,
      plan_id: finalPlan,
      cycle: finalCycle,
      provider: "flutterwave",
      status: "active",
      current_period_end: periodEnd,
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) return { activated: false, reason: error.message };
  return { activated: true, userId: finalUserId, planId: finalPlan, cycle: finalCycle, periodEnd };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Browser-driven verification (GET): ?transaction_id=...&tx_ref=...
    if (req.method === "GET") {
      const url = new URL(req.url);
      const txId = url.searchParams.get("transaction_id") || url.searchParams.get("tx_id");
      const txRef = url.searchParams.get("tx_ref");
      if (!txId) return json({ error: "Missing transaction_id" }, 400);
      const result = await verifyAndActivate(txId, txRef).catch((e) => ({ activated: false, reason: e.message }));
      return json(result);
    }

    // Webhook (POST): FLW sends { event, data: { id, tx_ref, ... } }
    if (req.method === "POST") {
      const body = await req.json().catch(() => null);
      if (!body) return json({ error: "Invalid JSON body" }, 400);

      const txId = body.data?.id;
      const txRef = body.data?.tx_ref;
      if (!txId) {
        // Not a payment event we handle; acknowledge to stop retries.
        return json({ received: true, skipped: true });
      }
      const result = await verifyAndActivate(txId, txRef).catch((e) => ({ activated: false, reason: e.message }));
      console.log(`FLW webhook tx=${txId} result=`, result);
      return json({ received: true, ...result });
    }

    return json({ error: "Method not allowed" }, 405);
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
