/**
 * Resenha posts: stored encrypted (src/lib/resenha-crypto.ts), read back in
 * pages, newest first, with the message each one answers and its reactions.
 * Who may post or react is decided by the route (allowlist); deleting is for
 * the author or an admin, and removes the row (its reactions go with it,
 * replies to it just lose the quote).
 */

import 'server-only';
import { prisma } from '@/src/lib/db';
import { decryptField, encryptField } from '@/src/lib/resenha-crypto';
import { AppError, ForbiddenError, NotFoundError } from '@/src/lib/errors';
import {
  POSTS_PAGE_SIZE,
  replyPreview,
  summarizeReactions,
  type ReactionEmoji,
  type MatchRefView,
  type ReactionView,
  type ResenhaPage,
  type ResenhaPostView,
} from '@/src/lib/resenha';
import { championImage, queueLabel } from '@/src/lib/match-transformers';
import { parseRiotId, profileHref } from '@/src/lib/riot-id';
import { isAdmin, type SessionUser } from './authService';
import { findTrackedPlayer } from './playerService';

const include = {
  author: true,
  replyTo: { include: { author: true } },
  reactions: { select: { userId: true, emoji: true } },
  matchRef: { include: { player: true } },
} as const;

interface StoredAuthor {
  name: string;
  avatarUrl: string | null;
}

interface StoredPost {
  id: string;
  authorId: string;
  body: string;
  createdAt: Date;
  author: StoredAuthor;
  replyTo: { id: string; body: string; author: StoredAuthor } | null;
  reactions: { userId: string; emoji: string }[];
  matchRef: {
    matchId: string;
    queueId: number;
    championName: string;
    win: boolean;
    kills: number;
    deaths: number;
    assists: number;
    player: {
      displayName: string;
      gameName: string;
      tagLine: string;
      region: string;
    };
  } | null;
}

function toMatchView(ref: NonNullable<StoredPost['matchRef']>): MatchRefView {
  return {
    matchId: ref.matchId,
    playerName: ref.player.displayName,
    profileHref: profileHref(
      ref.player.region,
      ref.player.gameName,
      ref.player.tagLine
    ),
    champion: ref.championName,
    championImage: championImage(ref.championName),
    queue: queueLabel(ref.queueId),
    kda: `${ref.kills}/${ref.deaths}/${ref.assists}`,
    win: ref.win,
  };
}

function toView(
  post: StoredPost,
  viewer: SessionUser,
  admin: boolean
): ResenhaPostView {
  return {
    id: post.id,
    author: {
      id: post.authorId,
      name: decryptField(post.author.name),
      avatarUrl: post.author.avatarUrl
        ? decryptField(post.author.avatarUrl)
        : null,
    },
    text: decryptField(post.body),
    createdAt: post.createdAt.toISOString(),
    canDelete: admin || post.authorId === viewer.id,
    replyTo: post.replyTo && {
      id: post.replyTo.id,
      authorName: decryptField(post.replyTo.author.name),
      preview: replyPreview(decryptField(post.replyTo.body)),
    },
    reactions: summarizeReactions(post.reactions, viewer.id),
    match: post.matchRef && toMatchView(post.matchRef),
  };
}

export async function listPosts(
  viewer: SessionUser,
  before?: string | null
): Promise<ResenhaPage> {
  const [rows, admin] = await Promise.all([
    prisma.resenhaPost.findMany({
      include,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: POSTS_PAGE_SIZE + 1,
      ...(before ? { cursor: { id: before }, skip: 1 } : {}),
    }),
    isAdmin(viewer.email),
  ]);
  const page = rows.slice(0, POSTS_PAGE_SIZE);
  return {
    posts: page.map((post) => toView(post, viewer, admin)),
    nextCursor: rows.length > POSTS_PAGE_SIZE ? page.at(-1)!.id : null,
  };
}

export async function createPost(
  author: SessionUser,
  text: string,
  replyToId?: string,
  match?: { matchId: string; riotId: string }
): Promise<ResenhaPostView> {
  if (
    replyToId &&
    !(await prisma.resenhaPost.findUnique({ where: { id: replyToId } }))
  ) {
    throw new AppError('A mensagem respondida foi apagada', 400);
  }
  const matchRef = match ? await findMatchLine(match) : undefined;
  // Name and photo as Google has them now (encrypted again on every post)
  const profile = {
    name: encryptField(author.name),
    avatarUrl: author.avatarUrl ? encryptField(author.avatarUrl) : null,
  };
  await prisma.resenhaAuthor.upsert({
    where: { id: author.id },
    create: { id: author.id, ...profile },
    update: profile,
  });
  const post = await prisma.resenhaPost.create({
    data: {
      authorId: author.id,
      body: encryptField(text),
      replyToId,
      matchId: matchRef?.matchId,
      matchPlayerId: matchRef?.playerId,
    },
    include,
  });
  return toView(post, author, await isAdmin(author.email));
}

/** A group member's stored line in a match, or 400 */
async function findMatchLine({
  matchId,
  riotId,
}: {
  matchId: string;
  riotId: string;
}) {
  const id = parseRiotId(riotId);
  const player = id && (await findTrackedPlayer(id.gameName, id.tagLine));
  const line =
    player &&
    (await prisma.playerMatch.findUnique({
      where: { playerId_matchId: { playerId: player.id, matchId } },
      select: { playerId: true, matchId: true },
    }));
  if (!line) throw new AppError('Partida não encontrada', 400);
  return line;
}

/** How many messages comment each match (ids not commented are left out) */
export async function countByMatch(
  matchIds: string[]
): Promise<Record<string, number>> {
  const rows = await prisma.resenhaPost.groupBy({
    by: ['matchId'],
    where: { matchId: { in: matchIds } },
    _count: { _all: true },
  });
  return Object.fromEntries(rows.map((r) => [r.matchId!, r._count._all]));
}

export async function deletePost(viewer: SessionUser, id: string) {
  const post = await prisma.resenhaPost.findUnique({ where: { id } });
  if (!post) throw new NotFoundError('Post');
  if (post.authorId !== viewer.id && !(await isAdmin(viewer.email))) {
    throw new ForbiddenError('Só quem escreveu pode apagar');
  }
  await prisma.resenhaPost.delete({ where: { id } });
}

/** Adds the viewer's emoji, or takes it back if already there */
export async function toggleReaction(
  viewer: SessionUser,
  postId: string,
  emoji: ReactionEmoji
): Promise<ReactionView[]> {
  if (!(await prisma.resenhaPost.findUnique({ where: { id: postId } }))) {
    throw new NotFoundError('Post');
  }
  const key = { postId, userId: viewer.id, emoji };
  const removed = await prisma.resenhaReaction.deleteMany({ where: key });
  if (removed.count === 0) {
    // A double click may race the first: the second insert is then a no-op
    await prisma.resenhaReaction.createMany({
      data: [key],
      skipDuplicates: true,
    });
  }
  const reactions = await prisma.resenhaReaction.findMany({
    where: { postId },
    select: { userId: true, emoji: true },
  });
  return summarizeReactions(reactions, viewer.id);
}
