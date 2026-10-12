import type { Metadata } from 'next';
import { RankingBoard } from '@/src/components/ranking-board';

export const metadata: Metadata = {
  title: 'Ranking',
  description: 'Quem está mais na frente no Solo/Duo e na Flex',
};

export default function RankingPage() {
  return (
    <div className="min-h-screen bg-background px-4 py-12 text-foreground">
      <section aria-labelledby="titulo-ranking" className="mx-auto max-w-4xl">
        <header className="mb-8 space-y-2">
          <h1
            id="titulo-ranking"
            className="text-4xl font-semibold tracking-tight"
          >
            Ranking
          </h1>
          <p className="text-muted-foreground">
            Quem está mais na frente entre os amigos.
          </p>
        </header>
        <RankingBoard />
      </section>
    </div>
  );
}
