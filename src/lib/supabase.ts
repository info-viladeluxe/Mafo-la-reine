import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !anonKey) {
  throw new Error('Missing Supabase env vars (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).');
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export interface Profile {
  id: string;
  email: string | null;
  first_name: string | null;
  lang: 'fr' | 'en';
  country: string | null;
  goal: string | null;
  last_period_date: string | null;
  cycle_length_avg: number | null;
  period_length_avg: number | null;
  onboarding_completed: boolean;
  is_admin: boolean;
  subscription_plan: 'free' | 'premium' | 'pro' | null;
  created_at: string;
  updated_at: string;
}
