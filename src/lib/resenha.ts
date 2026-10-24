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

/** The only reactions offered: a fixed set keeps it light and safe */
export const REACTION_EMOJIS = ['😂', '🔥', '💀', '👏', '😡', '🤡'] as const;
export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

/** How much of the answered message a reply shows */
export const REPLY_PREVIEW_LENGTH = 80;

export const newPostSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, 'Escreva alguma coisa')
    .max(MAX_POST_LENGTH, `No máximo ${MAX_POST_LENGTH} caracteres`),
  replyToId: z.string().min(1).optional(),
  /** "Mandar pra resenha" from a match card: whose card and which match */
  match: z
    .object({ matchId: z.string().min(1), riotId: z.string().min(3) })
    .optional(),
});

/** The match a post comments on, as a small card linking to the profile */
export interface MatchRefView {
  matchId: string;
  playerName: string;
  profileHref: string;
  champion: string;
  championImage: string;
  queue: string;
  kda: string;
  win: boolean;
  /** When it was played (ISO) */
  playedAt: string;
}

/** Messages per match id (the cards' comment counters) */
export const MAX_COUNT_IDS = 50;

export const reactionSchema = z.object({ emoji: z.enum(REACTION_EMOJIS) });

export interface ReactionView {
  emoji: ReactionEmoji;
  count: number;
  /** The viewer reacted with it */
  mine: boolean;
}

/** Reactions → one entry per emoji in use, in REACTION_EMOJIS order */
export function summarizeReactions(
  reactions: { userId: string; emoji: string }[],
  viewerId: string
): ReactionView[] {
  return REACTION_EMOJIS.flatMap((emoji) => {
    const users = reactions.filter((r) => r.emoji === emoji);
    return users.length
      ? [
          {
            emoji,
            count: users.length,
            mine: users.some((r) => r.userId === viewerId),
          },
        ]
      : [];
  });
}

/** First characters of the answered message, on one line */
export function replyPreview(text: string): string {
  const line = text.replace(/\s+/g, ' ').trim();
  return line.length > REPLY_PREVIEW_LENGTH
    ? `${line.slice(0, REPLY_PREVIEW_LENGTH - 1)}…`
    : line;
}

export interface ResenhaPostView {
  id: string;
  author: { id: string; name: string; avatarUrl: string | null };
  text: string;
  createdAt: string;
  /** The viewer wrote it, or is an admin */
  canDelete: boolean;
  /** The message it answers, still there (null if none or deleted) */
  replyTo: { id: string; authorName: string; preview: string } | null;
  reactions: ReactionView[];
  match: MatchRefView | null;
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
