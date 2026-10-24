import type { Metadata } from 'next';
import { Resenha } from '@/src/components/resenha/resenha';

export const metadata: Metadata = {
  title: 'Resenha',
  description: 'O papo do grupo sobre as partidas',
};

export default function ResenhaPage() {
  return (
    <div className="bg-background px-4 py-6 text-foreground">
      <section aria-labelledby="titulo-resenha" className="mx-auto max-w-3xl">
        <header className="mb-4 space-y-1">
          <h1
            id="titulo-resenha"
            className="text-3xl font-semibold tracking-tight"
          >
            Resenha
          </h1>
          <p className="text-muted-foreground">O papo do grupo.</p>
        </header>
        <Resenha />
      </section>
    </div>
  );
}
