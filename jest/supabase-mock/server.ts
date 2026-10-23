/**
 * Answers Supabase Auth (GoTrue) for the sign-in tests: the access tokens
 * handed out by `fakeSession` belong to the users given to it; any other
 * token is rejected like an expired or forged one. No real Google account
 * or Supabase project is involved.
 */

import { randomUUID } from 'node:crypto';
import type { User } from '@supabase/supabase-js';

export const SUPABASE_TEST_URL = 'https://riftlytics.supabase.test';

/** access token → user */
const sessions = new Map<string, User>();

/** Set by a test: answers every Auth call until reset (e.g. a 500) */
export const supabaseFault: { next: Response | null } = { next: null };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export function fakeUser({
  email,
  name = 'Jogador Teste',
  avatarUrl = 'https://lh3.googleusercontent.com/a/teste',
  confirmed = true,
}: {
  email: string;
  name?: string;
  avatarUrl?: string;
  confirmed?: boolean;
}): User {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    aud: 'authenticated',
    role: 'authenticated',
    email,
    email_confirmed_at: confirmed ? now : undefined,
    app_metadata: { provider: 'google', providers: ['google'] },
    user_metadata: { full_name: name, avatar_url: avatarUrl },
    created_at: now,
  };
}

/** A signed-in session for `user`: its access token works until reset */
export function fakeSession(user: User) {
  const access_token = `fake-${randomUUID()}`;
  sessions.set(access_token, user);
  return {
    access_token,
    refresh_token: `refresh-${randomUUID()}`,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user,
  };
}

export function supabaseDown(): Response {
  return json({ code: 500, msg: 'Internal Server Error' }, 500);
}

export function withSupabaseMock(realFetch: typeof fetch): typeof fetch {
  return (async (input, init) => {
    const raw =
      input instanceof Request ? input.url : (input as string | URL).toString();
    const url = new URL(raw);
    if (url.origin !== SUPABASE_TEST_URL) return realFetch(input, init);

    if (supabaseFault.next) return supabaseFault.next.clone();

    const headers = new Headers(
      init?.headers ?? (input instanceof Request ? input.headers : undefined)
    );
    const token = headers.get('authorization')?.replace(/^Bearer /i, '');

    switch (url.pathname) {
      case '/auth/v1/user': {
        const user = token ? sessions.get(token) : undefined;
        return user
          ? json(user)
          : json(
              {
                code: 403,
                error_code: 'bad_jwt',
                msg: 'invalid JWT: unable to parse or verify signature',
              },
              403
            );
      }
      case '/auth/v1/logout':
        if (token) sessions.delete(token);
        return new Response(null, { status: 204 });
      default:
        throw new Error(`Endpoint do Supabase Auth sem mock: ${url.pathname}`);
    }
  }) as typeof fetch;
}
