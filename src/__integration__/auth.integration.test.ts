/**
 * Sign-in and the Resenha's posting allowlist, against the real (test)
 * database; Supabase Auth answered by the fake (jest/supabase-mock).
 */

import { NextRequest } from 'next/server';
import { GET } from '@/src/app/api/me/route';
import { prisma } from '@/src/lib/db';
import { ForbiddenError, UnauthorizedError } from '@/src/lib/errors';
import { requirePoster } from '@/src/services/authService';
import {
  fakeSession,
  fakeUser,
  supabaseDown,
  supabaseFault,
} from '@/jest/supabase-mock/server';

const ALLOWED = 'liberado@gmail.com';

const request = (token?: string) =>
  new NextRequest('http://localhost/api/me', {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });

beforeEach(async () => {
  supabaseFault.next = null;
  await prisma.postingAllowlist.deleteMany();
  await prisma.postingAllowlist.create({ data: { email: ALLOWED } });
});
afterAll(async () => {
  supabaseFault.next = null;
  await prisma.postingAllowlist.deleteMany();
});

describe('GET /api/me', () => {
  it('an allowlisted account can post', async () => {
    const { access_token } = fakeSession(
      fakeUser({ email: ALLOWED, name: 'Vitor Oliveira' })
    );

    const res = await GET(request(access_token));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      user: expect.objectContaining({
        email: ALLOWED,
        name: 'Vitor Oliveira',
        avatarUrl: expect.stringContaining('googleusercontent'),
      }),
      canPost: true,
    });
  });

  it('matches the allowlist ignoring the case Google reports', async () => {
    const { access_token } = fakeSession(
      fakeUser({ email: 'Liberado@Gmail.com' })
    );

    expect((await (await GET(request(access_token))).json()).canPost).toBe(
      true
    );
  });

  it('anyone else can sign in and read, but not post', async () => {
    const { access_token } = fakeSession(
      fakeUser({ email: 'desconhecido@gmail.com' })
    );

    const body = await (await GET(request(access_token))).json();

    expect(body.user.email).toBe('desconhecido@gmail.com');
    expect(body.canPost).toBe(false);
  });

  it('401 without a token or with one Supabase rejects', async () => {
    expect((await GET(request())).status).toBe(401);
    expect((await GET(request('forjado'))).status).toBe(401);
  });

  it('an unverified email is not a session, even if it is allowlisted', async () => {
    const { access_token } = fakeSession(
      fakeUser({ email: ALLOWED, confirmed: false })
    );

    expect((await GET(request(access_token))).status).toBe(401);
  });

  it('Supabase Auth being down is a 503, not a sign-out', async () => {
    const { access_token } = fakeSession(fakeUser({ email: ALLOWED }));
    supabaseFault.next = supabaseDown();

    expect((await GET(request(access_token))).status).toBe(503);
  });
});

describe('requirePoster', () => {
  it('lets an allowlisted account through', async () => {
    const { access_token } = fakeSession(fakeUser({ email: ALLOWED }));

    expect(await requirePoster(request(access_token))).toMatchObject({
      email: ALLOWED,
    });
  });

  it('401 when signed out, 403 when signed in but not released', async () => {
    await expect(requirePoster(request())).rejects.toBeInstanceOf(
      UnauthorizedError
    );
    const { access_token } = fakeSession(
      fakeUser({ email: 'desconhecido@gmail.com' })
    );
    await expect(requirePoster(request(access_token))).rejects.toBeInstanceOf(
      ForbiddenError
    );
  });

  it('releasing and revoking take effect on the next request', async () => {
    const { access_token } = fakeSession(
      fakeUser({ email: 'amigo@gmail.com' })
    );
    await expect(requirePoster(request(access_token))).rejects.toThrow();

    await prisma.postingAllowlist.create({
      data: { email: 'amigo@gmail.com' },
    });
    await expect(requirePoster(request(access_token))).resolves.toBeTruthy();

    await prisma.postingAllowlist.delete({
      where: { email: 'amigo@gmail.com' },
    });
    await expect(requirePoster(request(access_token))).rejects.toBeInstanceOf(
      ForbiddenError
    );
  });
});
