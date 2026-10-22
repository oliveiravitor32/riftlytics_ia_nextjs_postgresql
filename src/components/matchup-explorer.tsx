'use client';

import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { ChampionCombobox } from './champion-combobox';
import { isRateLimitError } from '@/src/queries/api-client';
import { useMatchupQuery } from '@/src/queries/useMatchupQuery';
import type { ChampionOption } from '@/src/services/dataDragonService';
import { splitBold, type MatchupTip, type Side } from '@/src/lib/matchup';

/** "Espere a **fumaça** acabar" with the marked word in bold */
function Tip({ text }: { text: string }) {
  return (
    <>
      {splitBold(text).map((part, i) =>
        part.bold ? (
          <strong key={i} className="font-semibold text-foreground">
            {part.text}
          </strong>
        ) : (
          <React.Fragment key={i}>{part.text}</React.Fragment>
        )
      )}
    </>
  );
}

/** One summary tag: what, and who has it (icon + name) or "Equilibrado" */
function SummaryTag({
  label,
  side,
  a,
  b,
}: {
  label: string;
  side: Side;
  a: ChampionOption;
  b: ChampionOption;
}) {
  const winner = side === 'a' ? a : side === 'b' ? b : null;
  return (
    <li className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      {winner ? (
        <span className="flex items-center gap-1.5 font-semibold">
          <img
            src={winner.image}
            alt=""
            className="size-5 rounded-full border border-border"
          />
          {winner.name}
        </span>
      ) : (
        <span className="font-semibold">Equilibrado</span>
      )}
    </li>
  );
}

function MatchupResult({
  tip,
  a,
  b,
}: {
  tip: MatchupTip;
  a: ChampionOption;
  b: ChampionOption;
}) {
  return (
    <section aria-label={`${a.name} contra ${b.name}`} className="space-y-4">
      <div className="space-y-2">
        <ul aria-label="Resumo do matchup" className="flex flex-wrap gap-2">
          <SummaryTag label="Vantagem" side={tip.vantagem.quem} a={a} b={b} />
          <SummaryTag
            label="Trocas curtas"
            side={tip.trocas.curtas}
            a={a}
            b={b}
          />
          <SummaryTag
            label="Trocas longas"
            side={tip.trocas.longas}
            a={a}
            b={b}
          />
          <SummaryTag label="Ajuda do jungle" side={tip.jungle} a={a} b={b} />
          <SummaryTag label="Roaming" side={tip.roaming} a={a} b={b} />
          <li className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm">
            <span className="text-muted-foreground">Dificuldade</span>
            <span className="font-semibold">
              {a.name} {tip.dificuldade.a} · {b.name} {tip.dificuldade.b}
            </span>
          </li>
        </ul>
        <p className="max-w-prose text-muted-foreground">
          <Tip text={tip.vantagem.motivo} />
        </p>
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">
            {a.name} contra {b.name} na fase de rotas
          </caption>
          <thead>
            <tr className="border-b border-border">
              <th
                scope="col"
                className="w-32 px-4 py-3 font-medium text-muted-foreground"
              >
                O que fazer
              </th>
              {[a, b].map((c) => (
                <th key={c.id} scope="col" className="px-4 py-3 font-semibold">
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
            {tip.linhas.map((row) => (
              <tr
                key={row.aspecto}
                className="border-b border-border last:border-0"
              >
                <th scope="row" className="px-4 py-3 align-top font-medium">
                  {row.aspecto}
                </th>
                <td className="px-4 py-3 align-top text-muted-foreground">
                  <Tip text={row.a} />
                </td>
                <td className="px-4 py-3 align-top text-muted-foreground">
                  <Tip text={row.b} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </section>
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
        <ChampionCombobox
          id="campeao-a"
          label="Seu campeão"
          value={a}
          onChange={setA}
          champions={champions}
        />
        <span className="hidden pb-3 text-muted-foreground sm:block">vs</span>
        <ChampionCombobox
          id="campeao-b"
          label="Adversário"
          value={b}
          onChange={setB}
          champions={champions}
        />
        <Button
          type="submit"
          size="lg"
          className="h-12"
          disabled={!a || !b || a === b}
        >
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
          Gerando as dicas… Na primeira vez de cada dupla pode levar até 2
          minutos.
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
        <MatchupResult tip={query.data.tip} a={shown[0]} b={shown[1]} />
      )}
    </div>
  );
}
