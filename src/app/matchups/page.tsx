import type { Metadata } from 'next';
import { MatchupExplorer } from '@/src/components/matchup-explorer';
import { championList } from '@/src/services/dataDragonService';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Matchups',
  description: 'Dicas de fase de rotas para um confronto entre dois campeões',
};

export default async function MatchupsPage() {
  const champions = await championList();

  return (
    <div className="min-h-screen bg-background px-4 py-8 text-foreground">
      <section aria-labelledby="titulo-matchups" className="mx-auto max-w-5xl">
        <header className="mb-8 space-y-2">
          <h1
            id="titulo-matchups"
            className="text-3xl font-semibold tracking-tight"
          >
            Matchups
          </h1>
          <p className="max-w-prose text-muted-foreground">
            Escolha dois campeões e veja as dicas para a fase de rotas.
          </p>
        </header>
        <MatchupExplorer champions={champions} />
      </section>
    </div>
  );
}
