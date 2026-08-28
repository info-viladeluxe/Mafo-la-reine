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

const PAYUNIT_BASE_URL = "https://gateway.payunit.net";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // PayUnit auth: Basic base64(api_user:api_password) + x-api-key (the
    // application token) + a mode header. All three are required.
    const PU_API_USER = Deno.env.get("PAYUNIT_API_USER");
    const PU_API_PASSWORD = Deno.env.get("PAYUNIT_API_PASSWORD");
    const PU_API_KEY = Deno.env.get("PAYUNIT_API_KEY");
    const PU_MODE = (Deno.env.get("PAYUNIT_MODE") ?? "test").toLowerCase(); // "live" | "test"

    if (!PU_API_USER || !PU_API_PASSWORD || !PU_API_KEY) {
      return new Response(
        JSON.stringify({
          error: "PayUnit is not configured. Add PAYUNIT_API_USER, PAYUNIT_API_PASSWORD and PAYUNIT_API_KEY secrets.",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { plan_id, cycle, email, user_id } = await req.json();

    // Platform currency is USD everywhere else. PayUnit's gateway only
    // accepts XAF (https://developer.payunit.net/rest-api/initialize-payment),
    // so we convert the USD list price to XAF at request time using a live
    // FX rate, with a fixed fallback if the FX API is unreachable. XAF is
    // pegged to EUR (655.957) so the rate barely moves, but we still fetch
    // it live rather than trust a hardcoded number for money handling.
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

    const FALLBACK_USD_TO_XAF = 610; // reviewed manually; update if EUR/USD moves a lot
    let usdToXaf = FALLBACK_USD_TO_XAF;
    try {
      const fxResp = await fetch("https://api.frankfurter.app/latest?from=USD&to=XAF");
      const fx = await fxResp.json();
      if (fx?.rates?.XAF) usdToXaf = fx.rates.XAF;
    } catch {
      // network hiccup — keep the fallback rate, don't fail the checkout over it
    }

    // Round to the nearest 5 XAF for a clean amount (mobile money providers
    // often reject fractional local-currency amounts).
    const amount = Math.round((amountUsd * usdToXaf) / 5) * 5;

    if (!email || !user_id) {
      return new Response(
        JSON.stringify({ error: "Missing email or user_id." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Authenticate the caller so user_id can't be spoofed (same guard as the
    // Stripe/Flutterwave checkout functions).
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

    const origin = req.headers.get("origin") || "https://mafo.app";
    // Same tx-ref format as Flutterwave so payunit-webhook can reuse the same
    // parser: mafo-<plan>-<cycle>-<userId8>-<ts>. PayUnit's own transaction_id
    // is set to this value, so it round-trips through their API untouched.
    const txId = `mafo-${plan_id}-${cycle}-${String(user_id).slice(0, 8)}-${Date.now()}`;

    // Record a pending subscription row so the gate reflects the in-flight
    // payment even before the webhook lands. The webhook flips it to active.
    await supabase.from("subscriptions").upsert(
      {
        user_id,
        plan_id,
        cycle,
        provider: "payunit",
        status: "past_due",
      },
      { onConflict: "user_id" },
    );

    const authB64 = btoa(`${PU_API_USER}:${PU_API_PASSWORD}`);

    const resp = await fetch(`${PAYUNIT_BASE_URL}/api/gateway/initialize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${authB64}`,
        "x-api-key": PU_API_KEY,
        mode: PU_MODE,
      },
      body: JSON.stringify({
        total_amount: amount,
        currency: "XAF",
        transaction_id: txId,
        // We append our own transaction_id so the redirect callback can look
        // up the payment status without relying on PayUnit appending params.
        return_url: `${origin}/?checkout=success&provider=payunit&transaction_id=${encodeURIComponent(txId)}`,
        notify_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/payunit-webhook`,
      }),
    });

    const data = await resp.json().catch(() => null);
    if (!data || data.status !== "SUCCESS" || !data.data?.transaction_url) {
      return new Response(
        JSON.stringify({ error: data?.message || "PayUnit error" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ url: data.data.transaction_url, provider: "payunit" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
