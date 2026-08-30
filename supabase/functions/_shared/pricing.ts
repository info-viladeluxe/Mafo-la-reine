// Single source of truth for USD list prices, imported by every checkout
// edge function that needs them (flutterwave-checkout, payunit-checkout,
// paystack-checkout). Stripe is the exception — its prices live as Price
// IDs in Supabase secrets (STRIPE_PRICE_<PLAN>_<CYCLE>), configured in the
// Stripe dashboard, not here.
//
// These three used to each hardcode their own identical copy of this table
// — harmless while they stayed in sync, but a real risk of silent drift
// (e.g. a price change applied to one PSP and forgotten in the others,
// charging different amounts on different providers for the same plan).
// Keep this file as the only place these numbers are written.
//
// IMPORTANT: src/lib/payments.ts on the frontend has its own copy of these
// same numbers (PLANS array) for display purposes — that one can't import
// this file directly (different build: browser bundle vs Deno edge
// runtime), so if you change a price here, change it there too. The
// frontend copy only affects what's *displayed*; what a user is actually
// charged is always whatever this file says, enforced server-side.
export const AMOUNTS_USD: Record<string, Record<string, number>> = {
  premium: { monthly: 4, yearly: 40 },
  family: { monthly: 19, yearly: 190 },
  premium_plus: { monthly: 69, yearly: 690 },
};
