/**
 * The browser's Supabase client, used only for the Google sign-in and its
 * session (kept in localStorage and refreshed by supabase-js). Our data
 * never goes through it: the /api routes get the access token instead.
 */

'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { supabaseConfig } from './supabase-config';

let client: SupabaseClient | null | undefined;

/** null when the project isn't configured (sign-in is then hidden) */
export function browserSupabase(): SupabaseClient | null {
  if (client === undefined) {
    const config = supabaseConfig();
    client = config
      ? createClient(config.url, config.anonKey, {
          // PKCE: Google sends back a one-time code, never the token in the URL
          auth: { flowType: 'pkce' },
        })
      : null;
  }
  return client;
}

/** Google sign-in that comes back to the page the person was on */
export function signInWithGoogle(supabase: SupabaseClient, returnTo: string) {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: returnTo },
  });
}
