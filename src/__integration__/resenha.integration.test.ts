/**
 * Resenha posts against the real (test) database and Redis; Supabase Auth
 * answered by the fake (jest/supabase-mock).
 */

import { NextRequest } from 'next/server';
import { GET, POST } from '@/src/app/api/posts/route';
import { DELETE } from '@/src/app/api/posts/[id]/route';
import { POST as REACT } from '@/src/app/api/posts/[id]/reactions/route';
import { GET as COUNTS } from '@/src/app/api/posts/counts/route';
import { championImage, queueLabel } from '@/src/lib/match-transformers';
import { profileHref } from '@/src/lib/riot-id';
import { prisma } from '@/src/lib/db';
import { encryptField } from '@/src/lib/resenha-crypto';
import {
  MAX_COUNT_IDS,
  MAX_POST_LENGTH,
  POSTS_PAGE_SIZE,
  POSTS_PER_MINUTE,
  REPLY_PREVIEW_LENGTH,
  type ReactionView,
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

const counts = (token: string | undefined, ids: string) =>
  COUNTS(
    new NextRequest(`http://localhost/api/posts/counts?ids=${ids}`, {
      headers: auth(token),
    })
  );

const react = (token: string | undefined, id: string, emoji: string) =>
  REACT(
    new NextRequest(`http://localhost/api/posts/${id}/reactions`, {
      method: 'POST',
      headers: { ...auth(token), 'content-type': 'application/json' },
      body: JSON.stringify({ emoji }),
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

describe('replies', () => {
  it('a reply carries who and what it answers, on one short line', async () => {
    const long = `Que
Yasuo ${'criminoso '.repeat(20)}`;
    const original: ResenhaPostView = await (
      await send(tokenFor(POSTER, 'Vitor'), { text: long })
    ).json();

    const reply: ResenhaPostView = await (
      await send(tokenFor(ADMIN, 'Amigo'), {
        text: 'kkkkk',
        replyToId: original.id,
      })
    ).json();

    expect(reply.replyTo).toMatchObject({
      id: original.id,
      authorName: 'Vitor',
    });
    expect(reply.replyTo!.preview).toHaveLength(REPLY_PREVIEW_LENGTH);
    expect(reply.replyTo!.preview).toMatch(/^Que Yasuo criminoso .*…$/);
  });

  it("can't answer a message that no longer exists", async () => {
    const res = await send(tokenFor(POSTER), {
      text: 'oi',
      replyToId: 'nao-existe',
    });

    expect(res.status).toBe(400);
    expect(await prisma.resenhaPost.count()).toBe(0);
  });

  it('deleting the original keeps the reply, without the quote', async () => {
    const token = tokenFor(POSTER);
    const original: ResenhaPostView = await (
      await send(token, { text: 'original' })
    ).json();
    await send(tokenFor(ADMIN), { text: 'resposta', replyToId: original.id });

    await remove(token, original.id);

    const page: ResenhaPage = await (await list(token)).json();
    expect(page.posts.map((p) => [p.text, p.replyTo])).toEqual([
      ['resposta', null],
    ]);
  });
});

describe('reactions', () => {
  async function aPost() {
    const post: ResenhaPostView = await (
      await send(tokenFor(POSTER), { text: 'reaja' })
    ).json();
    return post.id;
  }

  it('toggles: the same emoji again takes it back', async () => {
    const id = await aPost();
    const token = tokenFor(POSTER);

    const added: ReactionView[] = await (await react(token, id, '😂')).json();
    expect(added).toEqual([{ emoji: '😂', count: 1, mine: true }]);

    const removed: ReactionView[] = await (await react(token, id, '😂')).json();
    expect(removed).toEqual([]);
  });

  it('counts each account once per emoji and tells the viewer which are theirs', async () => {
    const id = await aPost();
    const mine = tokenFor(POSTER);
    await react(mine, id, '🔥');
    await react(tokenFor(ADMIN), id, '🔥');
    await react(tokenFor(ADMIN), id, '😂');

    const page: ResenhaPage = await (await list(mine)).json();
    // Always in the offered order, not the order they were added
    expect(page.posts[0].reactions).toEqual([
      { emoji: '😂', count: 1, mine: false },
      { emoji: '🔥', count: 2, mine: true },
    ]);
  });

  it('only released accounts react, only offered emojis, only existing messages', async () => {
    const id = await aPost();

    expect((await react(undefined, id, '😂')).status).toBe(401);
    expect((await react(tokenFor('amigo@gmail.com'), id, '😂')).status).toBe(
      403
    );
    expect((await react(tokenFor(POSTER), id, '🍕')).status).toBe(400);
    expect((await react(tokenFor(POSTER), 'nao-existe', '😂')).status).toBe(
      404
    );
    expect(await prisma.resenhaReaction.count()).toBe(0);
  });

  it('deleting a message deletes its reactions', async () => {
    const id = await aPost();
    await react(tokenFor(POSTER), id, '💀');

    await remove(tokenFor(ADMIN), id);

    expect(await prisma.resenhaReaction.count()).toBe(0);
  });
});

describe('commenting a match', () => {
  const MATCH_ID = 'BR1_RESENHA_TESTE';
  const RIOT_ID = 'Alfa#TST';

  beforeAll(async () => {
    const player = await prisma.player.findFirstOrThrow({
      where: { gameName: 'Alfa', tagLine: 'TST' },
    });
    // A minimal stored match: only the card's line is read here
    await prisma.match.create({
      data: {
        id: MATCH_ID,
        queueId: 420,
        gameCreation: new Date(),
        gameDuration: 1800,
        data: {},
        players: {
          create: {
            playerId: player.id,
            playedAt: new Date(),
            queueId: 420,
            championName: 'Yasuo',
            position: 'MIDDLE',
            win: false,
            kills: 0,
            deaths: 10,
            assists: 1,
          },
        },
      },
    });
  });
  afterAll(async () => {
    await prisma.resenhaPost.deleteMany();
    // Its data isn't a real match: never leave it for later test files
    await prisma.match.delete({ where: { id: MATCH_ID } });
  });

  const comment = (token: string, match: unknown) =>
    send(token, { text: 'Que Yasuo criminoso! XD', match });

  it('the post carries a small card of the match, linking to the profile', async () => {
    const post: ResenhaPostView = await (
      await comment(tokenFor(POSTER), { matchId: MATCH_ID, riotId: RIOT_ID })
    ).json();

    expect(post.match).toEqual({
      matchId: MATCH_ID,
      playerName: expect.any(String),
      profileHref: profileHref('br1', 'Alfa', 'TST'),
      champion: 'Yasuo',
      championImage: championImage('Yasuo'),
      queue: queueLabel(420),
      kda: '0/10/1',
      win: false,
    });
  });

  it.each([
    ['a match not stored', { matchId: 'BR1_NAO_EXISTE', riotId: RIOT_ID }],
    [
      'someone outside the group',
      { matchId: MATCH_ID, riotId: 'Forasteiro#FORA' },
    ],
    ['a malformed Riot ID', { matchId: MATCH_ID, riotId: 'semtag' }],
  ])('400 for %s', async (_, match) => {
    expect((await comment(tokenFor(POSTER), match)).status).toBe(400);
  });

  it("counts each match's messages for the cards (signed-in only)", async () => {
    const token = tokenFor(POSTER);
    await comment(token, { matchId: MATCH_ID, riotId: RIOT_ID });
    await comment(token, { matchId: MATCH_ID, riotId: RIOT_ID });
    await send(token, { text: 'sem partida' });

    const res = await counts(token, `${MATCH_ID},BR1_SEM_COMENTARIO`);
    expect(await res.json()).toEqual({ [MATCH_ID]: 2 });

    expect((await counts(undefined, MATCH_ID)).status).toBe(401);
    expect((await counts(token, '')).status).toBe(400);
    const tooMany = Array.from(
      { length: MAX_COUNT_IDS + 1 },
      (_, i) => `M${i}`
    );
    expect((await counts(token, tooMany.join(','))).status).toBe(400);
  });
});
