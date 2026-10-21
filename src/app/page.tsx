/**
 * Home Page
 * Displays every active player (from the database) as a card
 */

import React from 'react';
import { ProfileCard } from '@/src/components/profile-card-new';
import { getActivePlayers } from '@/src/services/playerService';
import { getTopChampions } from '@/src/services/topChampionsService';

// Player list comes from the DB on every request
export const dynamic = 'force-dynamic';

export default async function Home(): Promise<React.ReactElement> {
  const [players, topChampions] = await Promise.all([
    getActivePlayers(),
    getTopChampions(),
  ]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Profiles Grid */}
      <section aria-labelledby="titulo-perfis" className="px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="mb-4">
            <h1
              id="titulo-perfis"
              className="text-2xl font-semibold tracking-tight text-foreground"
            >
              Perfis dos jogadores
            </h1>
            <p className="mt-2 text-muted-foreground">
              Acompanhando {players.length} jogadores
            </p>
          </div>

          <ul className="flex flex-col gap-4">
            {players.map((summoner) => (
              <li key={`${summoner.gameName}#${summoner.tagLine}`}>
                <ProfileCard
                  gameName={summoner.gameName}
                  tagLine={summoner.tagLine}
                  displayName={summoner.displayName}
                  region={summoner.region}
                  avatarUrl={summoner.avatarUrl}
                  topChampions={topChampions[summoner.id] ?? []}
                />
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-4 py-8 mt-12">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-sm text-muted-foreground">
            Dados fornecidos pela API da Riot Games
          </p>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            O Riftlytics não é afiliado à Riot Games
          </p>
        </div>
      </footer>
    </div>
  );
}
