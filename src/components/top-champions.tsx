import type { TopChampion } from '@/src/services/topChampionsService';

/** The player's 3 most played champions of the last 100 matches */
export function TopChampions({ champions }: { champions: TopChampion[] }) {
  if (champions.length === 0) return null;

  return (
    <ul
      aria-label="Mais jogados nas últimas 100 partidas"
      className="flex items-center gap-1 sm:gap-1.5"
    >
      {champions.map((c) => (
        <li
          key={c.champion}
          title={`${c.champion} · ${c.games} ${c.games === 1 ? 'partida' : 'partidas'}`}
          className="flex"
        >
          <img
            src={c.image}
            alt={c.champion}
            className="size-6 rounded-full border border-border object-cover sm:size-8"
          />
        </li>
      ))}
    </ul>
  );
}
