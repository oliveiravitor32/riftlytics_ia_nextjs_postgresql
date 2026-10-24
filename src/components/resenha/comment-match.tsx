'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import type { Session } from '@supabase/supabase-js';
import { Loader2, MessageSquare, MessageSquarePlus } from 'lucide-react';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '../ui/dialog';
import type { GameResumeMatch } from '../game-resume-card';
import { EmojiPicker } from './emoji-picker';
import { useMeQuery } from '@/src/queries/useMeQuery';
import { useSendPost } from '@/src/queries/useResenhaQuery';
import { isRateLimitError } from '@/src/queries/api-client';
import { MAX_POST_LENGTH } from '@/src/lib/resenha';

/**
 * The match card's Resenha row: how many comments it has (signed in) and
 * "Mandar pra resenha" (released accounts), which opens a box to comment.
 */
export function CommentMatch({
  session,
  match,
  riotId,
  count,
}: {
  session: Session;
  match: GameResumeMatch & { matchId: string };
  riotId: string;
  count: number;
}) {
  const me = useMeQuery(session);
  const send = useSendPost(session);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [sent, setSent] = useState(false);
  const box = useRef<HTMLTextAreaElement>(null);
  const trimmed = text.trim();

  function submit() {
    if (!trimmed || send.isPending) return;
    send.mutate(
      { text: trimmed, match: { matchId: match.matchId, riotId } },
      {
        onSuccess: () => {
          setText('');
          setOpen(false);
          setSent(true);
        },
      }
    );
  }

  return (
    <>
      {(count > 0 || sent) && (
        <Link
          href="/resenha"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <MessageSquare className="size-4 opacity-70" aria-hidden="true" />
          {sent
            ? 'Enviado! Ver na Resenha'
            : `${count} ${count === 1 ? 'comentário' : 'comentários'} na Resenha`}
        </Link>
      )}
      {me.data?.canPost && (
        <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
          <MessageSquarePlus aria-hidden="true" />
          Mandar pra resenha
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[min(92vw,32rem)] gap-3 rounded-md p-6">
          <DialogTitle className="pr-10 text-lg font-semibold">
            Mandar pra resenha
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {match.champion} · {match.kda} ·{' '}
            {match.result === 'win' ? 'Vitória' : 'Derrota'} · {match.queue}
          </DialogDescription>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <label htmlFor={`comentario-${match.matchId}`} className="sr-only">
              Comentário
            </label>
            <textarea
              ref={box}
              id={`comentario-${match.matchId}`}
              rows={3}
              autoFocus
              value={text}
              maxLength={MAX_POST_LENGTH}
              placeholder="Que Yasuo criminoso! XD"
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              className="w-full resize-none rounded-md border border-border bg-card px-3 py-2 outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/30"
            />
            {send.isError && (
              <p role="alert" className="text-sm text-muted-foreground">
                {isRateLimitError(send.error)
                  ? `Calma! Tente de novo em ${send.error.retryAfter ?? 60}s.`
                  : 'Não deu para enviar. Tente de novo.'}
              </p>
            )}
            <div className="flex items-center justify-between gap-2">
              <EmojiPicker target={box} value={text} onChange={setText} />
              <Button type="submit" disabled={!trimmed || send.isPending}>
                {send.isPending && (
                  <Loader2 className="animate-spin" aria-hidden="true" />
                )}
                Enviar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
