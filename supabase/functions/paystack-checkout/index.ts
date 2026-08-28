import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const PS_SECRET = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!PS_SECRET) {
      return new Response(
        JSON.stringify({ error: "Paystack is not configured. Add PAYSTACK_SECRET_KEY secret." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { plan_id, cycle, email, user_id } = await req.json();

    // Platform currency is USD. Paystack merchant accounts are usually
    // provisioned for one settlement currency (NGN/GHS/ZAR/KES/USD…) — set
    // PAYSTACK_CURRENCY if the account isn't USD-enabled. Amount is in the
    // smallest unit of that currency (cents/kobo — 2 decimal currencies,
    // ×100), per https://paystack.com/docs/payments/accept-payments/.
    const AMOUNTS_USD: Record<string, Record<string, number>> = {
      premium: { monthly: 4, yearly: 40 },
      family: { monthly: 19, yearly: 190 },
      premium_plus: { monthly: 69, yearly: 690 },
    };
    const amountUsd = AMOUNTS_USD[plan_id]?.[cycle];
    if (!amountUsd) {
      return new Response(
        JSON.stringify({ error: "Invalid plan or cycle." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!email || !user_id) {
      return new Response(
        JSON.stringify({ error: "Missing email or user_id." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user && user.id !== user_id) {
        return new Response(
          JSON.stringify({ error: "User ID mismatch." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    const currency = Deno.env.get("PAYSTACK_CURRENCY") ?? "USD";
    const origin = req.headers.get("origin") || "https://mafo.app";
    const reference = `mafo-${plan_id}-${cycle}-${String(user_id).slice(0, 8)}-${Date.now()}`;

    await supabase.from("subscriptions").upsert(
      { user_id, plan_id, cycle, provider: "paystack", status: "past_due" },
      { onConflict: "user_id" },
    );

    const resp = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PS_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: Math.round(amountUsd * 100),
        currency,
        reference,
        callback_url: `${origin}/?checkout=success&provider=paystack&reference=${encodeURIComponent(reference)}`,
        metadata: { user_id, plan_id, cycle },
      }),
    });

    const data = await resp.json().catch(() => null);
    if (!data || !data.status || !data.data?.authorization_url) {
      return new Response(
        JSON.stringify({ error: data?.message || "Paystack error" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ url: data.data.authorization_url, provider: "paystack" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
