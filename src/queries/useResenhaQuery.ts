/**
 * The Resenha's messages (/api/posts), page by page going back in time.
 * Asked again every few seconds while the page is open, so new messages
 * show up without reloading.
 */

import {
  useInfiniteQuery,
  useMutation,
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
import { getJson, sendJson } from './api-client';

const KEY = ['resenha'] as const;

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
    mutationFn: (post: { text: string; replyToId?: string }) =>
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
