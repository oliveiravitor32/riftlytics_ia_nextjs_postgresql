'use client';

import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { browserSupabase } from '@/src/lib/supabase-browser';

/**
 * The signed-in session (undefined while it is still being read from
 * storage, null when signed out). Follows sign-in, sign-out and token
 * refreshes, in this tab and others.
 */
export function useSession(): Session | null | undefined {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    const supabase = browserSupabase();
    if (!supabase) return;
    // Fires INITIAL_SESSION right away, then on every change
    const { data } = supabase.auth.onAuthStateChange((_event, next) =>
      setSession(next)
    );
    return () => data.subscription.unsubscribe();
  }, []);

  return session;
}
