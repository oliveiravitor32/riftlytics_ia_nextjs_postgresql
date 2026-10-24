/**
 * The Resenha's messages (/api/posts), page by page going back in time.
 * Asked again every few seconds while the page is open, so new messages
 * show up without reloading.
 */

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';
import {
  RESENHA_POLL_MS,
  type ReactionEmoji,
  type ReactionView,
  type ResenhaPage,
  type ResenhaPostView,
} from '@/src/lib/resenha';
import type { GameResumeMatch } from '@/src/components/game-resume-card';
import { getJson, sendJson } from './api-client';

const KEY = ['resenha'] as const;

/** Comments per match for a list of cards (signed in only) */
export function useMatchCommentCounts(
  session: Session | null | undefined,
  matchIds: string[]
) {
  return useQuery({
    queryKey: [...KEY, 'counts', matchIds.join(',')],
    queryFn: () =>
      getJson<Record<string, number>>(
        `/api/posts/counts?ids=${matchIds.map(encodeURIComponent).join(',')}`,
        session!.access_token
      ),
    enabled: Boolean(session) && matchIds.length > 0,
    staleTime: 60_000,
    retry: false,
  });
}

export function useResenhaQuery(session: Session) {
  return useInfiniteQuery({
    queryKey: KEY,
    queryFn: ({ pageParam }) =>
      getJson<ResenhaPage>(
        pageParam ? `/api/posts?before=${pageParam}` : '/api/posts',
        session.access_token
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    refetchInterval: RESENHA_POLL_MS,
    staleTime: 0,
    retry: false,
  });
}

export function useSendPost(session: Session) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (post: {
      text: string;
      replyToId?: string;
      match?: { matchId: string; riotId: string };
    }) =>
      sendJson<ResenhaPostView>('/api/posts', {
        method: 'POST',
        token: session.access_token,
        body: post,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeletePost(session: Session) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      sendJson<void>(`/api/posts/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        token: session.access_token,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

/** Adds or takes back the viewer's emoji on a message */
export function useToggleReaction(session: Session) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, emoji }: { id: string; emoji: ReactionEmoji }) =>
      sendJson<ReactionView[]>(
        `/api/posts/${encodeURIComponent(id)}/reactions`,
        { method: 'POST', token: session.access_token, body: { emoji } }
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

/** The full card of a message's match (fetched when its dialog opens) */
export function usePostMatchCard(session: Session, postId: string | null) {
  return useQuery({
    queryKey: [...KEY, 'match', postId],
    queryFn: () =>
      getJson<GameResumeMatch>(
        `/api/posts/${encodeURIComponent(postId!)}/match`,
        session.access_token
      ),
    enabled: postId !== null,
    // A finished match never changes
    staleTime: Infinity,
    retry: false,
  });
}
