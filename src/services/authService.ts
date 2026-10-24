/**
 * Who is calling and what they may do. The browser sends its Supabase access
 * token (Bearer); Supabase Auth confirms it and tells who it belongs to.
 * Posting is allowlist-only: a signed-in account can post only when its
 * email is in posting_allowlist (added by hand).
 */

import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { prisma } from '@/src/lib/db';
import { supabaseConfig } from '@/src/lib/supabase-config';
import {
  ExternalServiceError,
  ForbiddenError,
  UnauthorizedError,
} from '@/src/lib/errors';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

let client: SupabaseClient | null = null;

function supabase(): SupabaseClient {
  const config = supabaseConfig();
  if (!config) {
    throw new ExternalServiceError('Supabase Auth', 'not configured');
  }
  // Server side: no session of its own, each call carries the caller's token
  client ??= createClient(config.url, config.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      storageKey: 'riftlytics-server',
    },
  });
  return client;
}

function bearerToken(request: Request): string | null {
  const header = request.headers.get('authorization') ?? '';
  const [scheme, token] = header.split(' ');
  return scheme?.toLowerCase() === 'bearer' && token ? token : null;
}

/** The signed-in caller, or null (no token, or one Supabase rejects) */
export async function getSessionUser(
  request: Request
): Promise<SessionUser | null> {
  const token = bearerToken(request);
  if (!token) return null;

  const { data, error } = await supabase().auth.getUser(token);
  if (error || !data.user) {
    // 4xx: bad or expired token; anything else is Supabase being down
    if (error && (error.status ?? 500) >= 500) {
      throw new ExternalServiceError('Supabase Auth', error.message);
    }
    return null;
  }

  const { id, email, email_confirmed_at, user_metadata } = data.user;
  // Only a verified email can match the allowlist
  if (!email || !email_confirmed_at) return null;
  const meta = user_metadata as Record<string, unknown>;
  const text = (value: unknown) =>
    typeof value === 'string' && value ? value : null;

  return {
    id,
    email: email.toLowerCase(),
    name: text(meta.full_name) ?? text(meta.name) ?? email.split('@')[0],
    avatarUrl: text(meta.avatar_url) ?? text(meta.picture),
  };
}

export async function canPost(email: string): Promise<boolean> {
  const row = await prisma.postingAllowlist.findUnique({
    where: { email: email.toLowerCase() },
  });
  return row !== null;
}

export async function isAdmin(email: string): Promise<boolean> {
  const row = await prisma.postingAllowlist.findUnique({
    where: { email: email.toLowerCase() },
  });
  return row?.admin ?? false;
}

/** The caller, or 401 (reading the Resenha needs a session) */
export async function requireUser(request: Request): Promise<SessionUser> {
  const user = await getSessionUser(request);
  if (!user) throw new UnauthorizedError();
  return user;
}

/** The caller, if signed in and on the allowlist; 401 / 403 otherwise */
export async function requirePoster(request: Request): Promise<SessionUser> {
  const user = await requireUser(request);
  if (!(await canPost(user.email))) throw new ForbiddenError();
  return user;
}
