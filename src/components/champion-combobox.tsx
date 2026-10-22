'use client';

import React, { useEffect, useId, useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChampionOption } from '@/src/services/dataDragonService';

/** "Renata Glasc" ~ "renata gl", "Kai'Sa" ~ "kaisa": case, accents and punctuation ignored */
const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/gi, '')
    .toLowerCase();

/**
 * Search box with a list of champions, each with its picture (WAI-ARIA
 * combobox pattern: type to filter, arrows to move, Enter to pick, Esc to close).
 */
export function ChampionCombobox({
  id,
  label,
  value,
  onChange,
  champions,
}: {
  id: string;
  label: string;
  /** Chosen champion id, or '' */
  value: string;
  onChange: (id: string) => void;
  champions: ChampionOption[];
}) {
  const listId = useId();
  const chosen = champions.find((c) => c.id === value) ?? null;
  const [text, setText] = useState(chosen?.name ?? '');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const options = useMemo(() => {
    const term = normalize(text);
    // Showing the chosen name: list everyone again
    const all = chosen && text === chosen.name;
    // Every match (about 170 at most): the list scrolls
    return champions.filter((c) => all || normalize(c.name).includes(term));
  }, [champions, text, chosen]);

  // Keeps the option moved to with the arrows in view
  useEffect(() => {
    if (!open || !options[active]) return;
    document
      .getElementById(`${id}-${options[active].id}`)
      ?.scrollIntoView?.({ block: 'nearest' });
  }, [open, active, options, id]);

  function choose(c: ChampionOption) {
    onChange(c.id);
    setText(c.name);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) return setOpen(true);
      const step = e.key === 'ArrowDown' ? 1 : -1;
      setActive(
        (i) => (i + step + options.length) % Math.max(1, options.length)
      );
    } else if (e.key === 'Enter' && open) {
      e.preventDefault();
      if (options[active]) choose(options[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div className="relative flex min-w-0 flex-1 flex-col gap-1.5">
      <label htmlFor={id} className="text-sm text-muted-foreground">
        {label}
      </label>
      <div className="flex h-12 items-center gap-2 rounded-md border border-border bg-card px-2 focus-within:border-primary">
        {chosen && text === chosen.name ? (
          <img
            src={chosen.image}
            alt=""
            data-testid={`${id}-foto`}
            className="size-8 shrink-0 rounded-full border border-border object-cover"
          />
        ) : (
          <span className="size-8 shrink-0 rounded-full border border-dashed border-border" />
        )}
        <input
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            open && options[active] ? `${id}-${options[active].id}` : undefined
          }
          autoComplete="off"
          placeholder="Digite o nome…"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setActive(0);
            setOpen(true);
            // Typing over a chosen name un-chooses it
            if (value) onChange('');
          }}
          onFocus={(e) => {
            e.target.select();
            setOpen(true);
          }}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
          className="h-full min-w-0 flex-1 bg-transparent text-base outline-none"
        />
        <ChevronDown
          className="size-4 shrink-0 opacity-70"
          aria-hidden="true"
        />
      </div>

      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label={label}
          className="absolute top-full z-20 mt-1 max-h-80 w-full overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-card"
        >
          {options.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">
              Nenhum campeão encontrado
            </li>
          ) : (
            options.map((c, i) => (
              <li
                key={c.id}
                id={`${id}-${c.id}`}
                role="option"
                aria-selected={c.id === value}
                // mousedown: picks before the input's blur closes the list
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(c);
                }}
                onMouseEnter={() => setActive(i)}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5',
                  i === active && 'bg-muted'
                )}
              >
                <img
                  src={c.image}
                  alt=""
                  className="size-8 shrink-0 rounded-full border border-border object-cover"
                />
                {c.name}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
