/**
 * Home Page
 * Displays all preset player profiles in a grid
 */

import React from 'react';
import { PRESET_SUMMONERS } from '@/src/constants/presetSummoners';
import { ProfileCard } from '@/src/components/profile-card-new';

export default function Home(): React.ReactElement {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Section */}
      <section
        aria-labelledby="titulo-inicio"
        className="border-b border-border/70 bg-card/40 px-4 py-14"
      >
        <div className="max-w-5xl mx-auto">
          <div className="max-w-2xl space-y-4">
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">
              Estatísticas de LoL entre amigos
            </p>
            <h1
              id="titulo-inicio"
              className="text-5xl font-semibold tracking-tight text-foreground md:text-6xl"
            >
              Riftlytics
            </h1>
            <p className="text-lg leading-7 text-muted-foreground">
              Análises de League of Legends para o seu grupo de amigos
            </p>
          </div>
        </div>
      </section>

      {/* Profiles Grid */}
      <section aria-labelledby="titulo-perfis" className="px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="mb-4">
            <h2
              id="titulo-perfis"
              className="text-2xl font-semibold tracking-tight text-foreground"
            >
              Perfis dos jogadores
            </h2>
            <p className="mt-2 text-muted-foreground">
              Acompanhando {PRESET_SUMMONERS.length} jogadores
            </p>
          </div>

          <ul className="flex flex-col gap-5">
            {PRESET_SUMMONERS.map((summoner) => (
              <li key={`${summoner.gameName}#${summoner.tagLine}`}>
                <ProfileCard
                  gameName={summoner.gameName}
                  tagLine={summoner.tagLine}
                  displayName={summoner.gameName}
                  region={summoner.region}
                  avatarUrl={summoner.avatarUrl}
                  pdlHistory={summoner.pdlHistory}
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
