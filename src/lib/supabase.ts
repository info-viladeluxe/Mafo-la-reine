import { createClient } from '@supabase/supabase-js';

const FALLBACK_URL = 'https://khxjwolxgitcnqaxbmpi.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtoeGp3b2x4Z2l0Y25xYXhibXBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzOTY0OTcsImV4cCI6MjA5OTk3MjQ5N30.r_Xj71QLq4l0pL184muWnOoyDZljtqai3Pyyxs6Is4Y';

export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string) || FALLBACK_URL;
export const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || FALLBACK_KEY;

if (!import.meta.env.VITE_SUPABASE_URL) {
  console.warn('[Mafo] Using fallback Supabase config. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Cloudflare Pages for production.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
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
  subscription_plan: 'free' | 'premium' | 'family' | 'premium_plus' | null;
  created_at: string;
  updated_at: string;
}
