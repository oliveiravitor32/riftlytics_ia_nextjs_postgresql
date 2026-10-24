'use client';

import { useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Loader2, SendHorizontal, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { PlayerAvatar } from '../player-avatar';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '../ui/dialog';
import { useSession } from '@/src/hooks/useSession';
import { useMeQuery } from '@/src/queries/useMeQuery';
import {
  useDeletePost,
  useResenhaQuery,
  useSendPost,
} from '@/src/queries/useResenhaQuery';
import { isRateLimitError } from '@/src/queries/api-client';
import {
  MAX_POST_LENGTH,
  startsGroup,
  type ResenhaPostView,
} from '@/src/lib/resenha';
import { browserSupabase, signInWithGoogle } from '@/src/lib/supabase-browser';
import { cn } from '@/lib/utils';

const TIME_ZONE = 'America/Sao_Paulo';
const time = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: TIME_ZONE,
});
const dayAndTime = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: TIME_ZONE,
});
const day = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeZone: TIME_ZONE,
});

/** "21:42" today, "20/10 21:42" before */
function when(iso: string): string {
  const date = new Date(iso);
  return day.format(date) === day.format(new Date())
    ? time.format(date)
    : dayAndTime.format(date);
}

function Message({
  post,
  first,
  onDelete,
}: {
  post: ResenhaPostView;
  first: boolean;
  onDelete: (post: ResenhaPostView) => void;
}) {
  return (
    <li
      aria-label={`Mensagem de ${post.author.name}`}
      className={cn(
        'group relative flex gap-3 rounded-md px-2 py-0.5 hover:bg-foreground/5',
        first && 'mt-3 pt-1'
      )}
    >
      <div className="w-9 shrink-0">
        {first && (
          <PlayerAvatar
            name={post.author.name}
            src={post.author.avatarUrl}
            className="size-9"
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        {first && (
          <p className="flex items-baseline gap-2">
            <span className="font-semibold">{post.author.name}</span>
            <time
              dateTime={post.createdAt}
              className="text-xs text-muted-foreground"
            >
              {when(post.createdAt)}
            </time>
          </p>
        )}
        <p className="whitespace-pre-wrap break-words">{post.text}</p>
      </div>
      {post.canDelete && (
        <button
          type="button"
          aria-label="Apagar mensagem"
          title="Apagar mensagem"
          onClick={() => onDelete(post)}
          className="absolute right-2 top-1 rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </button>
      )}
    </li>
  );
}

function Composer({ session }: { session: Session }) {
  const [text, setText] = useState('');
  const send = useSendPost(session);
  const trimmed = text.trim();

  function submit() {
    if (!trimmed || send.isPending) return;
    // Cleared at once, like a chat; given back if it couldn't be sent
    setText('');
    send.mutate(trimmed, { onError: () => setText(text) });
  }

  return (
    <form
      aria-label="Nova mensagem"
      className="space-y-1"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="flex items-end gap-2 rounded-md border border-border bg-card p-2">
        <label htmlFor="mensagem" className="sr-only">
          Mensagem
        </label>
        <textarea
          id="mensagem"
          rows={1}
          value={text}
          maxLength={MAX_POST_LENGTH}
          placeholder="Conversar na Resenha"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            // Enter sends, Shift+Enter breaks the line (like Discord)
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          className="max-h-40 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 outline-none placeholder:text-muted-foreground"
        />
        <Button
          type="submit"
          size="icon"
          aria-label="Enviar"
          disabled={!trimmed || send.isPending}
        >
          {send.isPending ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <SendHorizontal aria-hidden="true" />
          )}
        </Button>
      </div>
      <div className="flex justify-between gap-4 px-1 text-sm text-muted-foreground">
        <p role="alert">
          {send.isError &&
            (isRateLimitError(send.error)
              ? `Calma! Tente de novo em ${send.error.retryAfter ?? 60}s.`
              : 'Não deu para enviar. Tente de novo.')}
        </p>
        {text.length > MAX_POST_LENGTH - 100 && (
          <p>
            {text.length}/{MAX_POST_LENGTH}
          </p>
        )}
      </div>
    </form>
  );
}

function Chat({ session }: { session: Session }) {
  const me = useMeQuery(session);
  const posts = useResenhaQuery(session);
  const remove = useDeletePost(session);
  const [deleting, setDeleting] = useState<ResenhaPostView | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  // Oldest first, like a chat
  const messages = (posts.data?.pages ?? [])
    .flatMap((page) => page.posts)
    .reverse();
  const groups = startsGroup(messages);
  const newest = messages.at(-1)?.id;

  // A new message at the bottom: follow it
  useEffect(() => {
    const box = scroller.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, [newest]);

  return (
    <Card className="flex h-[calc(100dvh-14rem)] min-h-96 flex-col gap-3 p-3 sm:p-4">
      <div
        ref={scroller}
        className="-mx-1 flex-1 overflow-y-auto px-1"
        aria-busy={posts.isPending}
      >
        {posts.hasNextPage && (
          <div className="flex justify-center py-2">
            <Button
              variant="outline"
              size="sm"
              disabled={posts.isFetchingNextPage}
              onClick={() => posts.fetchNextPage()}
            >
              Carregar mensagens anteriores
            </Button>
          </div>
        )}
        {posts.isPending ? (
          <p
            role="status"
            className="flex items-center gap-2 p-2 text-muted-foreground"
          >
            <Loader2 className="size-4 animate-spin opacity-70" />
            Carregando a resenha…
          </p>
        ) : posts.isError ? (
          <p role="alert" className="p-2 text-muted-foreground">
            Não deu para carregar a Resenha. Tente recarregar a página.
          </p>
        ) : messages.length === 0 ? (
          <p className="p-2 text-muted-foreground">
            Nada por aqui ainda. Comece a resenha!
          </p>
        ) : (
          <ol aria-label="Mensagens" className="pb-1">
            {messages.map((post, i) => (
              <Message
                key={post.id}
                post={post}
                first={groups[i]}
                onDelete={setDeleting}
              />
            ))}
          </ol>
        )}
      </div>

      {me.data?.canPost ? (
        <Composer session={session} />
      ) : (
        <p className="rounded-md border border-border px-3 py-2 text-sm text-muted-foreground">
          {me.isPending
            ? 'Conferindo seu acesso…'
            : 'Você pode ler a Resenha. Para postar, peça para liberarem seu e-mail.'}
        </p>
      )}

      <Dialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <DialogContent>
          <DialogTitle>Apagar mensagem?</DialogTitle>
          <DialogDescription className="whitespace-pre-wrap break-words">
            {deleting?.text}
          </DialogDescription>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button
              variant="destructive"
              disabled={remove.isPending}
              onClick={() =>
                remove.mutate(deleting!.id, {
                  onSuccess: () => setDeleting(null),
                })
              }
            >
              Apagar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/** The Resenha: signed-in only; posting for the allowlist */
export function Resenha() {
  const supabase = browserSupabase();
  const session = useSession();

  if (!supabase) {
    return (
      <p className="text-muted-foreground">O login não está configurado.</p>
    );
  }
  if (session === undefined) {
    return <Card className="h-[calc(100dvh-14rem)] min-h-96" />;
  }
  if (!session) {
    return (
      <Card className="flex flex-col items-start gap-4 p-6">
        <p className="max-w-prose text-muted-foreground">
          A Resenha é só para o grupo. Entre com o Google para ver as mensagens.
        </p>
        <Button
          onClick={() => signInWithGoogle(supabase, window.location.href)}
        >
          Entrar com Google
        </Button>
      </Card>
    );
  }
  return <Chat session={session} />;
}
