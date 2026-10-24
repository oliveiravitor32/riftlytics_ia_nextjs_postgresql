/**
 * Resenha (group chat) rules shared by the API and the page.
 */

import { z } from 'zod';

export const MAX_POST_LENGTH = 500;
export const POSTS_PAGE_SIZE = 30;
/** Messages per person per minute (a chat, not a flood) */
export const POSTS_PER_MINUTE = 10;
/** How often an open Resenha asks for new messages */
export const RESENHA_POLL_MS = 10_000;

export const newPostSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, 'Escreva alguma coisa')
    .max(MAX_POST_LENGTH, `No máximo ${MAX_POST_LENGTH} caracteres`),
});

export interface ResenhaPostView {
  id: string;
  author: { id: string; name: string; avatarUrl: string | null };
  text: string;
  createdAt: string;
  /** The viewer wrote it, or is an admin */
  canDelete: boolean;
}

export interface ResenhaPage {
  /** Newest first */
  posts: ResenhaPostView[];
  /** Pass as ?before= for older posts; null at the start of the history */
  nextCursor: string | null;
}

/** Same author within 5 minutes: shown under the previous one, like Discord */
export const GROUP_WINDOW_MS = 5 * 60_000;

/** Oldest-first posts → whether each one starts a new group */
export function startsGroup(posts: ResenhaPostView[]): boolean[] {
  return posts.map((post, i) => {
    const previous = posts[i - 1];
    return (
      !previous ||
      previous.author.id !== post.author.id ||
      Date.parse(post.createdAt) - Date.parse(previous.createdAt) >
        GROUP_WINDOW_MS
    );
  });
}
