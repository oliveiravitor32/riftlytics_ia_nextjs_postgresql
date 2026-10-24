'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { Session } from '@supabase/supabase-js';
import { Popover } from 'radix-ui';
import {
  CornerUpLeft,
  Loader2,
  Reply,
  SendHorizontal,
  SmilePlus,
  Trash2,
  X,
} from 'lucide-react';
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
  useToggleReaction,
} from '@/src/queries/useResenhaQuery';
import { isRateLimitError } from '@/src/queries/api-client';
import {
  MAX_POST_LENGTH,
  REACTION_EMOJIS,
  startsGroup,
  type MatchRefView,
  type ReactionEmoji,
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

/** The match a message comments on, linking to the player's profile */
function MatchChip({ match }: { match: MatchRefView }) {
  return (
    <Link
      href={match.profileHref}
      aria-label={`Partida de ${match.playerName}: ${match.champion} ${match.kda}, ${match.win ? 'vitória' : 'derrota'}`}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        'my-1 flex w-fit max-w-full items-center gap-2 rounded-md border border-l-4 border-border px-2 py-1 text-sm hover:border-foreground/30',
        match.win
          ? 'border-l-blue-500 bg-blue-500/10'
          : 'border-l-rose-500 bg-rose-500/10'
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- Data Dragon CDN */}
      <img
        src={match.championImage}
        alt=""
        className="size-7 shrink-0 rounded-full"
      />
      <span className="truncate">
        <span className="font-medium">{match.playerName}</span>{' '}
        <span className="text-muted-foreground">de</span> {match.champion}
      </span>
      <span className="shrink-0 font-semibold">{match.kda}</span>
      <span
        className={cn(
          'shrink-0 text-xs font-semibold',
          match.win
            ? 'text-blue-600 dark:text-blue-400'
            : 'text-rose-600 dark:text-rose-400'
        )}
      >
        {match.win ? 'Vitória' : 'Derrota'}
      </span>
      <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
        {match.queue}
      </span>
    </Link>
  );
}

const ACTION =
  'flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-foreground/10 hover:text-foreground';

/** Reply, react, delete: shown on hover/focus, or on tap on phones */
function MessageActions({
  post,
  canPost,
  onReply,
  onReact,
  onDelete,
}: {
  post: ResenhaPostView;
  canPost: boolean;
  onReply: () => void;
  onReact: (emoji: ReactionEmoji) => void;
  onDelete: () => void;
}) {
  if (!canPost && !post.canDelete) return null;
  return (
    <div
      role="toolbar"
      aria-label="Ações da mensagem"
      className="pointer-events-none absolute -top-3 right-2 flex gap-0.5 rounded-md border border-border bg-popover p-0.5 opacity-0 shadow-card transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 group-data-[active=true]:pointer-events-auto group-data-[active=true]:opacity-100 focus-within:pointer-events-auto focus-within:opacity-100"
    >
      {canPost && (
        <>
          <Popover.Root>
            <Popover.Trigger
              aria-label="Reagir"
              title="Reagir"
              className={ACTION}
            >
              <SmilePlus className="size-4" aria-hidden="true" />
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content
                align="end"
                sideOffset={6}
                aria-label="Escolher reação"
                className="z-50 flex gap-0.5 rounded-md border border-border bg-popover p-1 shadow-card"
              >
                {REACTION_EMOJIS.map((emoji) => (
                  <Popover.Close
                    key={emoji}
                    aria-label={`Reagir com ${emoji}`}
                    onClick={() => onReact(emoji)}
                    className="flex size-9 items-center justify-center rounded-md text-xl hover:bg-foreground/10"
                  >
                    {emoji}
                  </Popover.Close>
                ))}
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
          <button
            type="button"
            aria-label="Responder"
            title="Responder"
            onClick={onReply}
            className={ACTION}
          >
            <Reply className="size-4" aria-hidden="true" />
          </button>
        </>
      )}
      {post.canDelete && (
        <button
          type="button"
          aria-label="Apagar mensagem"
          title="Apagar mensagem"
          onClick={onDelete}
          className={ACTION}
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

function Message({
  post,
  first,
  active,
  canPost,
  onSelect,
  onReply,
  onReact,
  onDelete,
}: {
  post: ResenhaPostView;
  first: boolean;
  active: boolean;
  canPost: boolean;
  onSelect: () => void;
  onReply: () => void;
  onReact: (emoji: ReactionEmoji) => void;
  onDelete: () => void;
}) {
  return (
    <li
      aria-label={`Mensagem de ${post.author.name}`}
      data-active={active}
      onClick={onSelect}
      className={cn(
        'group relative rounded-md px-2 py-0.5 hover:bg-foreground/5 data-[active=true]:bg-foreground/5',
        first && 'mt-3 pt-1'
      )}
    >
      {post.replyTo && (
        <p
          aria-label={`Respondendo a ${post.replyTo.authorName}`}
          className="mb-0.5 ml-5 flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground"
        >
          <CornerUpLeft
            className="size-3.5 shrink-0 -scale-x-100 opacity-70"
            aria-hidden="true"
          />
          <span className="shrink-0 font-medium text-foreground/80">
            {post.replyTo.authorName}
          </span>
          <span className="truncate">{post.replyTo.preview}</span>
        </p>
      )}
      <div className="flex gap-3">
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
          {post.match && <MatchChip match={post.match} />}
          <p className="whitespace-pre-wrap break-words">{post.text}</p>
          {post.reactions.length > 0 && (
            <ul aria-label="Reações" className="mt-1 flex flex-wrap gap-1">
              {post.reactions.map((r) => (
                <li key={r.emoji}>
                  <button
                    type="button"
                    aria-label={`${r.emoji} ${r.count}`}
                    aria-pressed={r.mine}
                    disabled={!canPost}
                    onClick={(e) => {
                      e.stopPropagation();
                      onReact(r.emoji);
                    }}
                    className={cn(
                      'flex items-center gap-1 rounded-md border px-2 py-0.5 text-sm disabled:cursor-default',
                      r.mine
                        ? 'border-primary/60 bg-primary/10'
                        : 'border-border bg-card hover:border-foreground/30'
                    )}
                  >
                    <span>{r.emoji}</span>
                    <span className="text-muted-foreground">{r.count}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <MessageActions
        post={post}
        canPost={canPost}
        onReply={onReply}
        onReact={onReact}
        onDelete={onDelete}
      />
    </li>
  );
}

function Composer({
  session,
  replyingTo,
  onCancelReply,
}: {
  session: Session;
  replyingTo: ResenhaPostView | null;
  onCancelReply: () => void;
}) {
  const [text, setText] = useState('');
  const send = useSendPost(session);
  const trimmed = text.trim();

  function submit() {
    if (!trimmed || send.isPending) return;
    // Cleared at once, like a chat; given back if it couldn't be sent
    setText('');
    send.mutate(
      { text: trimmed, replyToId: replyingTo?.id },
      { onSuccess: onCancelReply, onError: () => setText(text) }
    );
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
      {replyingTo && (
        <div className="flex items-center justify-between gap-2 rounded-md bg-foreground/5 px-3 py-1.5 text-sm text-muted-foreground">
          <p className="truncate">
            Respondendo a{' '}
            <span className="font-medium text-foreground">
              {replyingTo.author.name}
            </span>
          </p>
          <button
            type="button"
            aria-label="Cancelar resposta"
            onClick={onCancelReply}
            className="rounded-md p-0.5 hover:text-foreground"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}
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
            if (e.key === 'Escape') onCancelReply();
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
  const react = useToggleReaction(session);
  const [deleting, setDeleting] = useState<ResenhaPostView | null>(null);
  const [replyingTo, setReplyingTo] = useState<ResenhaPostView | null>(null);
  // Phones have no hover: a tap shows that message's actions
  const [activeId, setActiveId] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const canPost = me.data?.canPost ?? false;

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
        className="-mx-1 flex-1 overflow-y-auto px-1 pt-3"
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
                // A reply always starts a block, like Discord
                first={groups[i] || post.replyTo !== null}
                active={activeId === post.id}
                canPost={canPost}
                onSelect={() => setActiveId(post.id)}
                onReply={() => {
                  setReplyingTo(post);
                  document.getElementById('mensagem')?.focus();
                }}
                onReact={(emoji) => react.mutate({ id: post.id, emoji })}
                onDelete={() => setDeleting(post)}
              />
            ))}
          </ol>
        )}
      </div>

      {canPost ? (
        <Composer
          session={session}
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
        />
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
