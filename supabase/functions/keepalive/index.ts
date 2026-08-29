/*
# Keepalive edge function

## Purpose
Supabase Free-tier projects are automatically paused after 7 days of
inactivity (no API/DB requests). A paused project returns 503 for every
request, taking the whole app offline until manually resumed.

This function performs a trivial authenticated database round-trip so the
project is considered active. It is meant to be called once per day by an
external scheduler (see .github/workflows/keepalive.yml) — well within the
7-day inactivity window.

## Security
- Uses the service_role key (bypasses RLS) so the SELECT always succeeds.
- Returns no user data — only a status + timestamp.
- No auth required on the function itself: the schedule URL is not secret
  and the function leaks nothing.
*/

import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey',
};

export async function main() {
  // Minimal DB round-trip: select a single value. This counts as activity.
  const { error } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .limit(1);

  if (error) {
    return new Response(
      JSON.stringify({ ok: false, error: error.message, ts: new Date().toISOString() }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  return new Response(
    JSON.stringify({ ok: true, ts: new Date().toISOString() }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}

Deno.serve((req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 204, headers: corsHeaders });
  }
  return main();
});

// CI trigger no-op: bumped to force the first real Deploy-to-Supabase run.
// CI trigger no-op #2 — verifying supabase db push --yes fix.
// CI trigger no-op #3 — verifying debug-log capture.
// CI trigger no-op #4 — Contents API log save, real diagnostic attempt.
