'use client';

import type { RefObject } from 'react';
import { Popover } from 'radix-ui';
import { Smile } from 'lucide-react';

/** The usual suspects of a LoL group chat */
export const EMOJIS = [
  '😂',
  '🤣',
  '😭',
  '💀',
  '😎',
  '🤡',
  '😡',
  '🥲',
  '😏',
  '🤔',
  '😱',
  '🫡',
  '👍',
  '👎',
  '👏',
  '🙏',
  '🔥',
  '💯',
  '🏆',
  '⚔️',
  '🛡️',
  '🎯',
  '🚑',
  '🗑️',
];

/**
 * A button that opens a small grid of emojis and puts the chosen one where
 * the cursor is in `target`, through `onChange` (the textarea stays
 * controlled by its owner).
 */
export function EmojiPicker({
  target,
  value,
  onChange,
}: {
  target: RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (next: string) => void;
}) {
  function insert(emoji: string) {
    const box = target.current;
    const start = box?.selectionStart ?? value.length;
    const end = box?.selectionEnd ?? value.length;
    onChange(value.slice(0, start) + emoji + value.slice(end));
    // Back to typing, right after the emoji
    requestAnimationFrame(() => {
      box?.focus();
      box?.setSelectionRange(start + emoji.length, start + emoji.length);
    });
  }

  return (
    <Popover.Root>
      <Popover.Trigger
        type="button"
        aria-label="Emojis"
        title="Emojis"
        className="flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
      >
        <Smile className="size-5" aria-hidden="true" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="top"
          align="end"
          sideOffset={8}
          aria-label="Escolher emoji"
          className="z-[60] grid grid-cols-8 gap-0.5 rounded-md border border-border bg-popover p-2 shadow-card"
        >
          {EMOJIS.map((emoji) => (
            <Popover.Close
              key={emoji}
              aria-label={`Inserir ${emoji}`}
              onClick={() => insert(emoji)}
              className="flex size-9 items-center justify-center rounded-md text-xl hover:bg-foreground/10"
            >
              {emoji}
            </Popover.Close>
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
