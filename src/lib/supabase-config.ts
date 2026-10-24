/**
 * Supabase project used for sign-in (Google, via Supabase Auth). Both values
 * are public by design: the browser needs them to start the Google login.
 */
export function supabaseConfig(): { url: string; anonKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && anonKey ? { url, anonKey } : null;
}
