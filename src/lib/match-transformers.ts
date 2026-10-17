import type { GameResumeMatch } from '@/src/components/game-resume-card';
import type { Match, Participant } from '@/src/lib/validators';

const DATA_DRAGON_VERSION = '15.8.1';

type RuneTreeName =
  | 'Precision'
  | 'Domination'
  | 'Sorcery'
  | 'Inspiration'
  | 'Resolve';

const runeTreeImages: Record<number, { name: RuneTreeName; image: string }> = {
  8000: {
    name: 'Precision',
    image: perkImage('Styles/Precision/Precision.png'),
  },
  8100: {
    name: 'Domination',
    image: perkImage('Styles/Domination/Domination.png'),
  },
  8200: {
    name: 'Sorcery',
    image: perkImage('Styles/Sorcery/Sorcery.png'),
  },
  8300: {
    name: 'Inspiration',
    image: perkImage('Styles/Inspiration/Inspiration.png'),
  },
  8400: {
    name: 'Resolve',
    image: perkImage('Styles/Resolve/Resolve.png'),
  },
};

const keystoneImages: Record<number, { name: string; image: string }> = {
  8005: {
    name: 'Press the Attack',
    image: perkImage('Styles/Precision/PressTheAttack/PressTheAttack.png'),
  },
  8008: {
    name: 'Lethal Tempo',
    image: perkImage('Styles/Precision/LethalTempo/LethalTempoTemp.png'),
  },
  8021: {
    name: 'Fleet Footwork',
    image: perkImage('Styles/Precision/FleetFootwork/FleetFootwork.png'),
  },
  8010: {
    name: 'Conqueror',
    image: perkImage('Styles/Precision/Conqueror/Conqueror.png'),
  },
  8112: {
    name: 'Electrocute',
    image: perkImage('Styles/Domination/Electrocute/Electrocute.png'),
  },
  8124: {
    name: 'Predator',
    image: perkImage('Styles/Domination/Predator/Predator.png'),
  },
  8128: {
    name: 'Dark Harvest',
    image: perkImage('Styles/Domination/DarkHarvest/DarkHarvest.png'),
  },
  8214: {
    name: 'Summon Aery',
    image: perkImage('Styles/Sorcery/SummonAery/SummonAery.png'),
  },
  8229: {
    name: 'Arcane Comet',
    image: perkImage('Styles/Sorcery/ArcaneComet/ArcaneComet.png'),
  },
  8230: {
    name: 'Phase Rush',
    image: perkImage('Styles/Sorcery/PhaseRush/PhaseRush.png'),
  },
  8351: {
    name: 'Glacial Augment',
    image: perkImage('Styles/Inspiration/GlacialAugment/GlacialAugment.png'),
  },
  8360: {
    name: 'Unsealed Spellbook',
    image: perkImage(
      'Styles/Inspiration/UnsealedSpellbook/UnsealedSpellbook.png'
    ),
  },
  8369: {
    name: 'First Strike',
    image: perkImage('Styles/Inspiration/FirstStrike/FirstStrike.png'),
  },
  8437: {
    name: 'Grasp of the Undying',
    image: perkImage('Styles/Resolve/GraspOfTheUndying/GraspOfTheUndying.png'),
  },
  8439: {
    name: 'Aftershock',
    image: perkImage('Styles/Resolve/Aftershock/Aftershock.png'),
  },
  8465: {
    name: 'Guardian',
    image: perkImage('Styles/Resolve/Guardian/Guardian.png'),
  },
};

const spellImages: Record<number, { name: string; image: string }> = {
  4: { name: 'Flash', image: ddragon('spell/SummonerFlash.png') },
  7: { name: 'Heal', image: ddragon('spell/SummonerHeal.png') },
  11: { name: 'Smite', image: ddragon('spell/SummonerSmite.png') },
  12: { name: 'Teleport', image: ddragon('spell/SummonerTeleport.png') },
  14: { name: 'Ignite', image: ddragon('spell/SummonerDot.png') },
  21: { name: 'Barrier', image: ddragon('spell/SummonerBarrier.png') },
  3: { name: 'Exhaust', image: ddragon('spell/SummonerExhaust.png') },
  6: { name: 'Ghost', image: ddragon('spell/SummonerHaste.png') },
  13: { name: 'Clarity', image: ddragon('spell/SummonerMana.png') },
  1: { name: 'Cleanse', image: ddragon('spell/SummonerBoost.png') },
};

function ddragon(path: string): string {
  return `https://ddragon.leagueoflegends.com/cdn/${DATA_DRAGON_VERSION}/img/${path}`;
}

function perkImage(path: string): string {
  return `https://ddragon.leagueoflegends.com/cdn/img/perk-images/${path}`;
}

// Riot's championName is already the Data Dragon id (e.g. "MonkeyKing")
function championImage(championName: string): string {
  return ddragon(`champion/${championName}.png`);
}

function itemImage(itemId: number | undefined): string | null {
  if (!itemId) return null;
  return ddragon(`item/${itemId}.png`);
}

function formatDuration(durationSeconds: number): string {
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = Math.floor(durationSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function formatRelativeTime(timestamp: number): string {
  const minutesAgo = Math.max(0, Math.round((Date.now() - timestamp) / 60000));

  if (minutesAgo < 60) {
    return `${minutesAgo} min atrás`;
  }

  const hoursAgo = Math.round(minutesAgo / 60);
  if (hoursAgo < 24) {
    return `${hoursAgo}h atrás`;
  }

  const daysAgo = Math.round(hoursAgo / 24);
  return `${daysAgo}d atrás`;
}

function queueLabel(queueId: number): string {
  switch (queueId) {
    case 420:
      return 'Ranqueada Solo/Duo';
    case 440:
      return 'Ranqueada Flex';
    case 400:
    case 430:
    case 490:
      return 'Normal';
    case 450:
      return 'ARAM';
    case 1700:
      return 'Arena';
    default:
      return `Fila ${queueId}`;
  }
}

function roleLabel(position?: string | null): string {
  switch (position) {
    case 'TOP':
      return 'Topo';
    case 'JUNGLE':
      return 'Selva';
    case 'MIDDLE':
      return 'Meio';
    case 'BOTTOM':
      return 'Atirador';
    case 'UTILITY':
      return 'Suporte';
    default:
      return 'Outra';
  }
}

function spellFromId(spellId: number | undefined): {
  name: string;
  image: string;
} {
  if (!spellId || !spellImages[spellId]) {
    return { name: 'Desconhecido', image: ddragon('spell/SummonerFlash.png') };
  }

  return spellImages[spellId];
}

function runeTreeFromId(styleId: number): { name: string; image: string } {
  return (
    runeTreeImages[styleId] || {
      name: 'Precision',
      image: perkImage('Styles/Precision/Precision.png'),
    }
  );
}

function keystoneFromId(
  perkId: number | undefined,
  styleId: number
): { name: string; image: string } {
  if (perkId && keystoneImages[perkId]) {
    return keystoneImages[perkId];
  }

  return runeTreeFromId(styleId);
}

function displayName(participant: Participant): string | undefined {
  return participant.riotIdGameName || participant.summonerName || undefined;
}

function participantToTeammate(participant: Participant) {
  return {
    name: displayName(participant) ?? participant.puuid.slice(0, 8),
    champion: participant.championName,
    image: championImage(participant.championName),
  };
}

function matchesPosition(a: Participant, b: Participant): boolean {
  const aPosition = a.teamPosition || a.individualPosition || '';
  const bPosition = b.teamPosition || b.individualPosition || '';

  return Boolean(aPosition) && aPosition === bPosition;
}

function totalDamageForTeam(
  participants: Participant[],
  teamId: number
): number {
  return participants
    .filter((participant) => participant.teamId === teamId)
    .reduce(
      (sum, participant) => sum + participant.totalDamageDealtToChampions,
      0
    );
}

export function buildGameResumeMatch(
  match: Match,
  playerPuuid: string,
  fallbackPlayerName?: string
): GameResumeMatch {
  // The match came from this player's history, so they are in it
  const player = match.info.participants.find(
    (participant) => participant.puuid === playerPuuid
  )!;
  const teamId = player.teamId;
  const allies = match.info.participants
    .filter((participant) => participant.teamId === teamId)
    .map(participantToTeammate);
  const enemies = match.info.participants
    .filter((participant) => participant.teamId !== teamId)
    .map(participantToTeammate);
  const laneOpponentParticipant =
    match.info.participants
      .filter((participant) => participant.teamId !== teamId)
      .find((participant) => matchesPosition(participant, player)) ||
    match.info.participants.find(
      (participant) => participant.teamId !== teamId
    )!;
  const styles = player.perks?.styles || [];
  const primaryStyle = styles[0]?.style || 8000;
  const primarySelection = styles[0]?.selections?.[0]?.perk;
  const teamDamage = totalDamageForTeam(match.info.participants, teamId);
  const damageShare =
    teamDamage > 0
      ? `${Math.round((player.totalDamageDealtToChampions / teamDamage) * 100)}%`
      : '0%';
  const itemIds = [
    player.item0,
    player.item1,
    player.item2,
    player.item3,
    player.item4,
    player.item5,
    player.item6,
  ];

  return {
    matchId: match.metadata.matchId,
    playedAt: formatRelativeTime(match.info.gameStartTimestamp),
    result: player.win ? 'win' : 'loss',
    playerSide: teamId === 100 ? 'blue' : 'red',
    playerName:
      displayName(player) ?? fallbackPlayerName ?? playerPuuid.slice(0, 8),
    champion: player.championName,
    championImage: championImage(player.championName),
    laneOpponent: participantToTeammate(laneOpponentParticipant),
    role: roleLabel(player.teamPosition || player.individualPosition),
    queue: queueLabel(match.info.queueId),
    duration: formatDuration(match.info.gameDuration),
    kda: `${player.kills}/${player.deaths}/${player.assists}`,
    cs: player.totalMinionsKilled,
    damageShare,
    spells: [spellFromId(player.summoner1Id), spellFromId(player.summoner2Id)],
    items: itemIds
      .map((itemId) => itemImage(itemId))
      .filter((item): item is string => Boolean(item))
      .map((image, index) => ({
        name: `Item ${index + 1}`,
        image,
      })),
    runes: {
      primaryTree: runeTreeFromId(primaryStyle),
      keystone: keystoneFromId(primarySelection, primaryStyle),
    },
    allies,
    enemies,
  };
}
