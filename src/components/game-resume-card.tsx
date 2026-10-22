import { cn } from '@/lib/utils';

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
  championLevel: number;
  /** Lane minions + jungle monsters */
  cs: number;
  csPerMinute: string;
  /** % of the team's kills the player took part in */
  killParticipation: number;
  multiKill: string | null;
  damageShare: string;
  spells: { name: string; image: string }[];
  items: { name: string; image: string }[];
  trinket: { name: string; image: string } | null;
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

const ITEM_SLOTS = 6;

// Win = blue, loss = red, tinted over the card so both themes keep contrast
const TONES = {
  win: {
    label: 'Vitória',
    card: 'border-l-blue-500 bg-blue-500/10',
    text: 'text-blue-600 dark:text-blue-400',
    slot: 'bg-blue-500/15',
  },
  loss: {
    label: 'Derrota',
    card: 'border-l-rose-500 bg-rose-500/10',
    text: 'text-rose-600 dark:text-rose-400',
    slot: 'bg-rose-500/15',
  },
} as const;

function Icon({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <img
      src={src}
      alt={alt}
      title={alt}
      className={cn('rounded-md object-cover', className)}
    />
  );
}

function Team({
  players,
  playerName,
}: {
  players: GameResumeMatch['allies'];
  playerName: string;
}) {
  return (
    <ul className="flex min-w-0 flex-col gap-0.5">
      {players.map((p) => (
        <li
          key={`${p.name}-${p.champion}`}
          className={cn(
            'flex min-w-0 items-center gap-1.5 text-xs',
            p.name === playerName
              ? 'font-semibold text-foreground'
              : 'text-muted-foreground'
          )}
        >
          <Icon src={p.image} alt={p.champion} className="size-4 rounded-md" />
          <span className="truncate">{p.name}</span>
        </li>
      ))}
    </ul>
  );
}

export default function GameResumeCard({ match }: GameResumeCardProps) {
  const tone = TONES[match.result];
  const [kills, deaths, assists] = match.kda.split('/').map(Number);
  const ratio =
    deaths === 0 ? 'Perfeito' : `${((kills + assists) / deaths).toFixed(2)}:1`;
  const emptySlots = Math.max(0, ITEM_SLOTS - match.items.length);
  const blueTeam = match.playerSide === 'blue' ? match.allies : match.enemies;
  const redTeam = match.playerSide === 'red' ? match.allies : match.enemies;

  return (
    <article
      aria-label={`${tone.label} de ${match.champion}`}
      className={cn(
        'flex w-full flex-wrap items-center gap-x-5 gap-y-3 rounded-md border border-l-4 border-border px-4 py-3 shadow-card',
        tone.card
      )}
    >
      {/* Queue, when, result, duration */}
      <div className="w-32 shrink-0 text-xs text-muted-foreground">
        <p className={cn('font-semibold', tone.text)}>{match.queue}</p>
        <p>{match.playedAt}</p>
        <hr className="my-1.5 w-12 border-border" />
        <p className="font-semibold text-foreground/80">{tone.label}</p>
        <p>{match.duration}</p>
      </div>

      {/* Champion, spells, runes and items */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1">
          <div className="relative mr-1">
            <Icon
              src={match.championImage}
              alt={match.champion}
              className="size-12 rounded-full"
            />
            <span className="absolute -bottom-1 -right-1 rounded-md bg-foreground px-1.5 text-[11px] font-semibold text-background">
              {match.championLevel}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-0.5">
            {match.spells.map((spell, i) => (
              <Icon
                key={`${spell.name}-${i}`}
                src={spell.image}
                alt={spell.name}
                className="size-[22px]"
              />
            ))}
            <Icon
              src={match.runes.keystone.image}
              alt={match.runes.keystone.name}
              className="size-[22px] rounded-full bg-black/60"
            />
            <Icon
              src={match.runes.primaryTree.image}
              alt={match.runes.primaryTree.name}
              className="size-[22px] p-0.5"
            />
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          {match.items.map((item) => (
            <Icon
              key={item.name}
              src={item.image}
              alt={item.name}
              className="size-[22px]"
            />
          ))}
          {Array.from({ length: emptySlots }, (_, i) => (
            <span
              key={`vazio-${i}`}
              aria-hidden="true"
              className={cn('size-[22px] rounded-md', tone.slot)}
            />
          ))}
          {match.trinket ? (
            <Icon
              src={match.trinket.image}
              alt={match.trinket.name}
              className="ml-1 size-[22px] rounded-full"
            />
          ) : null}
        </div>
      </div>

      {/* KDA */}
      <div className="flex min-w-24 flex-col gap-1">
        <p className="text-lg font-bold leading-tight tracking-tight">
          {kills} <span className="text-muted-foreground">/</span>{' '}
          <span className="text-rose-600 dark:text-rose-400">{deaths}</span>{' '}
          <span className="text-muted-foreground">/</span> {assists}
        </p>
        <p className="text-xs text-muted-foreground">{ratio} KDA</p>
        {match.multiKill ? (
          <span className="w-fit rounded-md bg-rose-600 px-2 py-0.5 text-[11px] font-semibold text-white">
            {match.multiKill}
          </span>
        ) : null}
      </div>

      {/* Numbers */}
      <dl className="grid grid-cols-[auto_auto] gap-x-2 text-xs text-muted-foreground">
        <dt>P/Abate</dt>
        <dd className="text-foreground/80">{match.killParticipation}%</dd>
        <dt>CS</dt>
        <dd className="text-foreground/80">
          {match.cs} ({match.csPerMinute})
        </dd>
        <dt>Dano</dt>
        <dd className="text-foreground/80">{match.damageShare}</dd>
      </dl>

      {/* Both teams; the player in bold */}
      <div className="ml-auto hidden grid-cols-2 gap-3 sm:grid sm:w-56">
        <Team players={blueTeam} playerName={match.playerName} />
        <Team players={redTeam} playerName={match.playerName} />
      </div>
    </article>
  );
}
