import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import { AMOUNTS_USD } from "../_shared/pricing.ts";

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
    const FLW_SECRET = Deno.env.get("FLUTTERWAVE_SECRET_KEY");
    const FLW_PUBLIC = Deno.env.get("FLUTTERWAVE_PUBLIC_KEY");
    if (!FLW_SECRET || !FLW_PUBLIC) {
      return new Response(
        JSON.stringify({ error: "Flutterwave is not configured. Add FLUTTERWAVE_SECRET_KEY and FLUTTERWAVE_PUBLIC_KEY secrets." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { plan_id, cycle, email, user_id, is_trial } = await req.json();

    const amount = AMOUNTS_USD[plan_id]?.[cycle];
    if (!amount) {
      return new Response(
        JSON.stringify({ error: "Invalid plan or cycle." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Authenticate the caller so user_id can't be spoofed.
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
    const txRef = `mafo-${plan_id}-${cycle}-${user_id.slice(0, 8)}-${Date.now()}`;

    // Record a pending subscription row so the gate reflects the in-flight
    // payment even before the webhook lands. The webhook will flip it to active.
    await supabase.from("subscriptions").upsert(
      {
        user_id,
        plan_id: plan_id,
        cycle,
        provider: "flutterwave",
        status: "past_due",
      },
      { onConflict: "user_id" },
    );

    // Flutterwave appends transaction_id, tx_ref, status to the redirect_url.
    // The frontend reads those and calls flutterwave-webhook to verify.
    const resp = await fetch("https://api.flutterwave.com/v3/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FLW_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tx_ref: txRef,
        amount,
        currency: "USD",
        payment_options: "card,mobilemoney,ussd,banktransfer",
        customer: { email },
        customizations: { title: "Mafo", description: `Mafo ${plan_id} — ${cycle}`, logo: "https://mafo.app/favicon.svg" },
        meta: { user_id, plan_id, cycle, is_trial: String(is_trial) },
        redirect_url: `${origin}/?checkout=success&provider=flutterwave`,
      }),
    });

    const data = await resp.json();
    if (data.status !== "success" || !data.data?.link) {
      return new Response(
        JSON.stringify({ error: data.message || "Flutterwave error" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ url: data.data.link, provider: "flutterwave" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
