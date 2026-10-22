'use client';

import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { isRateLimitError } from '@/src/queries/api-client';
import { useMatchupQuery } from '@/src/queries/useMatchupQuery';
import type { ChampionOption } from '@/src/services/dataDragonService';

function ChampionSelect({
  id,
  label,
  value,
  onChange,
  champions,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  champions: ChampionOption[];
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      <label htmlFor={id} className="text-sm text-muted-foreground">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-lg border border-border bg-card px-3 text-base"
      >
        <option value="">Escolha…</option>
        {champions.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  );
}

export function MatchupExplorer({
  champions,
}: {
  champions: ChampionOption[];
}): React.ReactElement {
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [pair, setPair] = useState<{ a: string; b: string } | null>(null);
  const query = useMatchupQuery(pair);
  const byId = new Map(champions.map((c) => [c.id, c]));

  const shown = pair ? [byId.get(pair.a)!, byId.get(pair.b)!] : null;

  return (
    <div className="space-y-6">
      <form
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          setPair({ a, b });
        }}
      >
        <ChampionSelect
          id="campeao-a"
          label="Seu campeão"
          value={a}
          onChange={setA}
          champions={champions}
        />
        <span className="hidden pb-2 text-muted-foreground sm:block">vs</span>
        <ChampionSelect
          id="campeao-b"
          label="Adversário"
          value={b}
          onChange={setB}
          champions={champions}
        />
        <Button type="submit" disabled={!a || !b || a === b}>
          Ver dicas
        </Button>
      </form>

      {query.isFetching && (
        <p
          role="status"
          className="flex items-center gap-2 text-muted-foreground"
        >
          <Loader2
            className="size-4 animate-spin opacity-70"
            aria-hidden="true"
          />
          Gerando as dicas…
        </p>
      )}

      {query.isError && (
        <p role="alert" className="max-w-prose text-muted-foreground">
          {isRateLimitError(query.error)
            ? `Muitas dicas novas seguidas. Tente de novo em ${query.error.retryAfter ?? 60}s.`
            : 'A IA não respondeu agora. Tente de novo em instantes.'}
        </p>
      )}

      {query.data && shown && (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">
              {shown[0].name} contra {shown[1].name} na fase de rotas
            </caption>
            <thead>
              <tr className="border-b border-border">
                <th
                  scope="col"
                  className="px-4 py-3 font-medium text-muted-foreground"
                >
                  Aspecto
                </th>
                {shown.map((c) => (
                  <th
                    key={c.id}
                    scope="col"
                    className="px-4 py-3 font-semibold"
                  >
                    <span className="flex items-center gap-2">
                      <img
                        src={c.image}
                        alt=""
                        className="size-6 rounded-full border border-border"
                      />
                      {c.name}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {query.data.rows.map((row) => (
                <tr
                  key={row.aspecto}
                  className="border-b border-border last:border-0"
                >
                  <th scope="row" className="px-4 py-3 align-top font-medium">
                    {row.aspecto}
                  </th>
                  <td className="px-4 py-3 align-top">{row.a}</td>
                  <td className="px-4 py-3 align-top">{row.b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
