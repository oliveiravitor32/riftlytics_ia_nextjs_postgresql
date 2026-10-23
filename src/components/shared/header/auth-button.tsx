'use client';

import { useState } from 'react';
import { Popover } from 'radix-ui';
import { useQueryClient } from '@tanstack/react-query';
import { LogIn, LogOut } from 'lucide-react';
import { Button } from '../../ui/button';
import { PlayerAvatar } from '../../player-avatar';
import { useSession } from '@/src/hooks/useSession';
import { useMeQuery } from '@/src/queries/useMeQuery';
import { browserSupabase, signInWithGoogle } from '@/src/lib/supabase-browser';

/** Header's account button: "Entrar" (Google), or the avatar with a menu */
export default function AuthButton() {
  const supabase = browserSupabase();
  const session = useSession();
  const me = useMeQuery(session);
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  if (!supabase) return null;
  // Still reading the stored session: keep the space, no flash of "Entrar"
  if (session === undefined) {
    return <span className="block size-8" aria-hidden="true" />;
  }

  if (!session) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => signInWithGoogle(supabase, window.location.href)}
      >
        <LogIn aria-hidden="true" />
        Entrar
      </Button>
    );
  }

  const meta = session.user.user_metadata as Record<string, string>;
  const name = me.data?.user.name ?? meta.full_name ?? session.user.email!;
  const avatar = me.data?.user.avatarUrl ?? meta.avatar_url;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        aria-label={`Conta de ${name}`}
        className="rounded-full focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none"
      >
        <PlayerAvatar name={name} src={avatar} className="size-8" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          aria-label="Sua conta"
          className="z-50 w-64 space-y-3 rounded-md border border-border bg-popover p-4 text-popover-foreground shadow-card"
        >
          <div className="min-w-0">
            <p className="truncate font-medium">{name}</p>
            <p className="truncate text-sm text-muted-foreground">
              {session.user.email}
            </p>
          </div>
          <p role="status" className="text-sm text-muted-foreground">
            {me.isPending
              ? 'Conferindo seu acesso…'
              : me.data?.canPost
                ? 'Você pode postar na Resenha.'
                : 'Você pode ler a Resenha. Para postar, peça para liberarem seu e-mail.'}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={async () => {
              setOpen(false);
              await supabase.auth.signOut();
              queryClient.removeQueries({ queryKey: ['me'] });
            }}
          >
            <LogOut aria-hidden="true" />
            Sair
          </Button>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
