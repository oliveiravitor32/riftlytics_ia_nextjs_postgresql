import { CheckCircle2, Clock3, Sword, XCircle } from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card';
import Link from 'next/link';

export type MatchResult = 'win' | 'loss';

export type GameResumeMatch = {
  matchId?: string;
  playedAt: string;
  result: MatchResult;
  playerSide: 'blue' | 'red';
  playerName: string;
  champion: string;
  championImage: string;
  laneOpponent: {
    name: string;
    champion: string;
    image: string;
  };
  role: string;
  queue: string;
  duration: string;
  kda: string;
  cs: number;
  damageShare: string;
  spells: { name: string; image: string }[];
  items: { name: string; image: string }[];
  runes: {
    primaryTree: { name: string; image: string };
    keystone: { name: string; image: string };
  };
  allies: { name: string; champion: string; image: string }[];
  enemies: { name: string; champion: string; image: string }[];
};

type GameResumeCardProps = {
  match: GameResumeMatch;
};

function resultMeta(result: MatchResult) {
  return result === 'win'
    ? {
        label: 'Vitória',
        tone: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
        icon: CheckCircle2,
      }
    : {
        label: 'Derrota',
        tone: 'border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300',
        icon: XCircle,
      };
}

function ImageRow({
  items,
}: {
  items: { name: string; champion: string; image: string }[];
}) {
  return (
    <div className="min-w-32">
      <div className="flex flex-col gap-1">
        {items.map((item) => (
          <Link
            href="/"
            className="flex text-xs text-muted-foreground items-center gap-2"
            key={item.name}
          >
            <img
              key={item.champion}
              src={item.image}
              alt={item.champion}
              title={item.champion}
              className="size-6 rounded-md border border-border bg-background object-cover"
            />
            {item.name}
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function GameResumeCard({ match }: GameResumeCardProps) {
  const meta = resultMeta(match.result);
  const ResultIcon = meta.icon;
  const blueSideTeam =
    match.playerSide === 'blue' ? match.allies : match.enemies;
  const redSideTeam = match.playerSide === 'red' ? match.allies : match.enemies;

  const kdaParts = match.kda.split('/').map(Number);
  const kdaValue =
    kdaParts[1] === 0
      ? kdaParts[0] + kdaParts[2]
      : ((kdaParts[0] + kdaParts[2]) / kdaParts[1]).toFixed(2);

  return (
    <Card className="max-w-150 gap-0 py-3 justify-center w-full transition-colors duration-200 hover:border-primary/40">
      <CardHeader className="pb-0">
        <div className="flex gap-2">
          <CardTitle>{match.queue}</CardTitle>
          <CardDescription className="flex items-center gap-1">
            <Clock3 className="size-3 opacity-70" aria-hidden="true" />
            {match.duration} - {match.playedAt}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="m-0 p-0">
        <div className="grid gap-3 p-3 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                <img
                  src={match.championImage}
                  alt={match.champion}
                  className="size-14 rounded-lg border border-border object-cover"
                />
                <span
                  className={`absolute -right-2 -top-2 inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] ${meta.tone}`}
                >
                  <ResultIcon
                    className="size-3 opacity-70"
                    aria-hidden="true"
                  />
                  {meta.label}
                </span>
              </div>

              <img
                src={match.laneOpponent.image}
                alt={`Oponente de rota: ${match.laneOpponent.champion}`}
                title={`Oponente de rota: ${match.laneOpponent.champion}`}
                className="size-11 shrink-0 rounded-lg border border-border object-cover opacity-90"
              />

              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-3">
                  <div className="text-2xl font-semibold leading-none tracking-tight">
                    {match.kda}
                  </div>
                  <div className="ml-1 pb-0.5 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    {kdaValue} KDA
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {match.spells.map((spell) => (
                <img
                  key={spell.name}
                  src={spell.image}
                  alt={spell.name}
                  className="size-7 rounded-md border border-border bg-background object-cover"
                />
              ))}
              <div className="flex mx-2 items-center gap-1.5">
                {match.items.map((item) => (
                  <img
                    key={item.name}
                    src={item.image}
                    alt={item.name}
                    title={item.name}
                    className="size-6 rounded-lg border border-border bg-background object-cover"
                  />
                ))}
              </div>
            </div>
            <div className="inline-flex items-center gap-2 p-1.5">
              <img
                src={match.runes.primaryTree.image}
                alt={match.runes.primaryTree.name}
                title={match.runes.primaryTree.name}
                className="size-8 rounded-md border border-border bg-background object-cover"
              />
              <img
                src={match.runes.keystone.image}
                alt={match.runes.keystone.name}
                title={match.runes.keystone.name}
                className="size-8 rounded-md border border-border bg-background object-cover"
              />
            </div>
          </div>

          <div>
            <div className="flex gap-2">
              <ImageRow items={blueSideTeam} />
              <ImageRow items={redSideTeam} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
