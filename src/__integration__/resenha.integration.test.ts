/**
 * Resenha posts against the real (test) database and Redis; Supabase Auth
 * answered by the fake (jest/supabase-mock).
 */

import { NextRequest } from 'next/server';
import { GET, POST } from '@/src/app/api/posts/route';
import { DELETE } from '@/src/app/api/posts/[id]/route';
import { prisma } from '@/src/lib/db';
import { encryptField } from '@/src/lib/resenha-crypto';
import {
  MAX_POST_LENGTH,
  POSTS_PAGE_SIZE,
  POSTS_PER_MINUTE,
  type ResenhaPage,
  type ResenhaPostView,
} from '@/src/lib/resenha';
import { fakeSession, fakeUser } from '@/jest/supabase-mock/server';

const POSTER = 'liberado@gmail.com';
const ADMIN = 'admin@gmail.com';

function tokenFor(email: string, name = email.split('@')[0]) {
  return fakeSession(fakeUser({ email, name })).access_token;
}

const auth = (token?: string): Record<string, string> =>
  token ? { authorization: `Bearer ${token}` } : {};

const list = (token?: string, before?: string) =>
  GET(
    new NextRequest(
      `http://localhost/api/posts${before ? `?before=${before}` : ''}`,
      { headers: auth(token) }
    )
  );

const send = (token: string | undefined, body: unknown) =>
  POST(
    new NextRequest('http://localhost/api/posts', {
      method: 'POST',
      headers: { ...auth(token), 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
  );

const remove = (token: string | undefined, id: string) =>
  DELETE(
    new NextRequest(`http://localhost/api/posts/${id}`, {
      method: 'DELETE',
      headers: auth(token),
    }),
    { params: Promise.resolve({ id }) }
  );

beforeEach(async () => {
  await prisma.resenhaPost.deleteMany();
  await prisma.resenhaAuthor.deleteMany();
  await prisma.postingAllowlist.deleteMany();
  await prisma.postingAllowlist.createMany({
    data: [{ email: POSTER }, { email: ADMIN, admin: true }],
  });
});
afterAll(async () => {
  await prisma.resenhaPost.deleteMany();
  await prisma.resenhaAuthor.deleteMany();
  await prisma.postingAllowlist.deleteMany();
});

describe('posting', () => {
  it('an allowlisted account posts; the answer has its name and photo', async () => {
    const res = await send(tokenFor(POSTER, 'Vitor'), {
      text: '  Que Yasuo criminoso! XD  ',
    });
    const post: ResenhaPostView = await res.json();

    expect(res.status).toBe(201);
    expect(post).toMatchObject({
      text: 'Que Yasuo criminoso! XD',
      author: { name: 'Vitor', avatarUrl: expect.any(String) },
      canDelete: true,
    });
  });

  it('stores text, name and photo encrypted, and no email at all', async () => {
    await send(tokenFor(POSTER, 'Vitor'), { text: 'Que Yasuo criminoso!' });

    // The rows as the database has them (Prisma doesn't decrypt anything)
    const row = await prisma.resenhaPost.findFirstOrThrow({
      include: { author: true },
    });
    const stored = JSON.stringify(row);
    expect(stored).not.toMatch(/Yasuo|Vitor|googleusercontent|@/);
    expect(row.body).toMatch(/^v1:/);
  });

  it('401 signed out, 403 signed in but not released: nothing is stored', async () => {
    expect((await send(undefined, { text: 'oi' })).status).toBe(401);
    expect(
      (await send(tokenFor('desconhecido@gmail.com'), { text: 'oi' })).status
    ).toBe(403);
    expect(await prisma.resenhaPost.count()).toBe(0);
  });

  it.each([
    ['an empty message', { text: '   ' }],
    ['a message over the limit', { text: 'a'.repeat(MAX_POST_LENGTH + 1) }],
    ['no text', {}],
  ])('400 for %s', async (_, body) => {
    expect((await send(tokenFor(POSTER), body)).status).toBe(400);
  });

  it(`${POSTS_PER_MINUTE} messages a minute per person, then 429`, async () => {
    const token = tokenFor(POSTER);
    for (let i = 0; i < POSTS_PER_MINUTE; i++) {
      expect((await send(token, { text: `msg ${i}` })).status).toBe(201);
    }

    // A sliding window: crossing a minute boundary mid-test frees a few
    // slots, so keep sending until the limit answers (never more than double)
    let blocked = await send(token, { text: 'mais uma' });
    for (let i = 0; blocked.status === 201 && i < POSTS_PER_MINUTE; i++) {
      blocked = await send(token, { text: 'mais uma' });
    }
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get('Retry-After'))).toBeGreaterThan(0);
    // Someone else still posts
    expect((await send(tokenFor(ADMIN), { text: 'oi' })).status).toBe(201);
  });
});

describe('reading', () => {
  it('only signed-in accounts read, released or not', async () => {
    await send(tokenFor(POSTER), { text: 'oi' });

    expect((await list()).status).toBe(401);
    const page: ResenhaPage = await (
      await list(tokenFor('desconhecido@gmail.com'))
    ).json();
    expect(page.posts.map((p) => p.text)).toEqual(['oi']);
    expect(page.posts[0].canDelete).toBe(false);
  });

  it('pages newest first and goes back with ?before=', async () => {
    const author = await prisma.resenhaAuthor.create({
      data: { id: 'autor-paginas', name: encryptField('Antigo') },
    });
    const total = POSTS_PAGE_SIZE + 5;
    await prisma.resenhaPost.createMany({
      data: Array.from({ length: total }, (_, i) => ({
        authorId: author.id,
        body: encryptField(`msg ${i}`),
        createdAt: new Date(Date.UTC(2026, 9, 1, 0, i)),
      })),
    });
    const token = tokenFor(POSTER);

    const first: ResenhaPage = await (await list(token)).json();
    expect(first.posts).toHaveLength(POSTS_PAGE_SIZE);
    expect(first.posts[0].text).toBe(`msg ${total - 1}`);
    expect(first.nextCursor).toBe(first.posts.at(-1)!.id);

    const older: ResenhaPage = await (
      await list(token, first.nextCursor!)
    ).json();
    expect(older.posts.map((p) => p.text)).toEqual(
      [4, 3, 2, 1, 0].map((i) => `msg ${i}`)
    );
    expect(older.nextCursor).toBeNull();
  });
});

describe('deleting', () => {
  async function postBy(email: string) {
    const token = tokenFor(email);
    const post: ResenhaPostView = await (
      await send(token, { text: 'apaga isso' })
    ).json();
    return { token, id: post.id };
  }

  it('the author deletes their own message, and the row is gone', async () => {
    const { token, id } = await postBy(POSTER);

    expect((await remove(token, id)).status).toBe(204);
    expect(await prisma.resenhaPost.count()).toBe(0);
  });

  it("someone else can't; an admin can (and sees canDelete on every post)", async () => {
    const { id } = await postBy(POSTER);

    expect((await remove(tokenFor('amigo@gmail.com'), id)).status).toBe(403);

    const admin = tokenFor(ADMIN);
    const page: ResenhaPage = await (await list(admin)).json();
    expect(page.posts[0].canDelete).toBe(true);
    expect((await remove(admin, id)).status).toBe(204);
  });

  it('401 signed out, 404 for a message that no longer exists', async () => {
    const { token, id } = await postBy(POSTER);

    expect((await remove(undefined, id)).status).toBe(401);
    await remove(token, id);
    expect((await remove(token, id)).status).toBe(404);
  });
});
