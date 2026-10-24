/**
 * Resenha posts: stored encrypted (src/lib/resenha-crypto.ts), read back in
 * pages, newest first. Who may post is decided by the route (allowlist);
 * deleting is for the author or an admin, and removes the row.
 */

import 'server-only';
import { prisma } from '@/src/lib/db';
import { decryptField, encryptField } from '@/src/lib/resenha-crypto';
import { ForbiddenError, NotFoundError } from '@/src/lib/errors';
import {
  POSTS_PAGE_SIZE,
  type ResenhaPage,
  type ResenhaPostView,
} from '@/src/lib/resenha';
import { isAdmin, type SessionUser } from './authService';

interface StoredPost {
  id: string;
  authorId: string;
  body: string;
  createdAt: Date;
  author: { name: string; avatarUrl: string | null };
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
  };
}

export async function listPosts(
  viewer: SessionUser,
  before?: string | null
): Promise<ResenhaPage> {
  const [rows, admin] = await Promise.all([
    prisma.resenhaPost.findMany({
      include: { author: true },
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
  text: string
): Promise<ResenhaPostView> {
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
    data: { authorId: author.id, body: encryptField(text) },
    include: { author: true },
  });
  return toView(post, author, await isAdmin(author.email));
}

export async function deletePost(viewer: SessionUser, id: string) {
  const post = await prisma.resenhaPost.findUnique({ where: { id } });
  if (!post) throw new NotFoundError('Post');
  if (post.authorId !== viewer.id && !(await isAdmin(viewer.email))) {
    throw new ForbiddenError('Só quem escreveu pode apagar');
  }
  await prisma.resenhaPost.delete({ where: { id } });
}
