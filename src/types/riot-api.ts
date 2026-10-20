/**
 * Shapes of the Riot API responses we use, as documented in the Riot
 * Developer Portal (https://developer.riotgames.com/apis). They are our side's
 * record of what each endpoint returns: the test mocks (jest/riot-mock) are
 * built from them, and the Zod schemas in src/lib/validators.ts validate the
 * real answers at runtime. Riot's int/long are `number`.
 *
 * Endpoints we call:
 *  - account-v1  GET /riot/account/v1/accounts/by-riot-id/{gameName}/{tagLine} → AccountDto
 *  - summoner-v4 GET /lol/summoner/v4/summoners/by-puuid/{puuid}                → SummonerDto
 *  - league-v4   GET /lol/league/v4/entries/by-puuid/{puuid}                    → LeagueEntryDto[]
 *  - match-v5    GET /lol/match/v5/matches/by-puuid/{puuid}/ids                 → MatchIdsDto
 *  - match-v5    GET /lol/match/v5/matches/{matchId}                            → MatchDto
 */

/** account-v1 */
export interface AccountDto {
  /** Encrypted PUUID, exactly 78 characters */
  puuid: string;
  /** May be missing if the account has no gameName */
  gameName?: string;
  /** May be missing if the account has no tagLine */
  tagLine?: string;
}

/** summoner-v4 (id, accountId and name are no longer returned) */
export interface SummonerDto {
  puuid: string;
  profileIconId: number;
  /** Epoch ms of the last change (icon, finished game, name change...) */
  revisionDate: number;
  summonerLevel: number;
}

/** league-v4 */
export interface MiniSeriesDto {
  losses: number;
  progress: string;
  target: number;
  wins: number;
}

export type QueueType = 'RANKED_SOLO_5x5' | 'RANKED_FLEX_SR' | 'RANKED_FLEX_TT';

export type Tier =
  | 'IRON'
  | 'BRONZE'
  | 'SILVER'
  | 'GOLD'
  | 'PLATINUM'
  | 'EMERALD'
  | 'DIAMOND'
  | 'MASTER'
  | 'GRANDMASTER'
  | 'CHALLENGER';

export type Division = 'I' | 'II' | 'III' | 'IV';

export interface LeagueEntryDto {
  /** Documented, but entries/by-puuid doesn't send it (checked in riot-contract.live.test.ts) */
  leagueId?: string;
  puuid: string;
  queueType: QueueType;
  tier: Tier;
  /** Division within the tier */
  rank: Division;
  leaguePoints: number;
  wins: number;
  losses: number;
  hotStreak: boolean;
  veteran: boolean;
  freshBlood: boolean;
  inactive: boolean;
  miniSeries?: MiniSeriesDto;
}

/** match-v5: ids, newest first (?start, ?count ≤ 100, ?startTime, ?endTime in epoch seconds) */
export type MatchIdsDto = string[];

export interface MetadataDto {
  dataVersion: string;
  matchId: string;
  /** PUUIDs of the participants */
  participants: string[];
}

export interface PerkStyleSelectionDto {
  perk: number;
  var1: number;
  var2: number;
  var3: number;
}

export interface PerkStyleDto {
  description: string;
  selections: PerkStyleSelectionDto[];
  style: number;
}

export interface PerksDto {
  statPerks: { defense: number; flex: number; offense: number };
  styles: PerkStyleDto[];
}

/**
 * A player's line in the match. Riot documents ~150 fields (pings, challenges,
 * missions...); these are the ones every match has and the app reads.
 */
export interface ParticipantDto {
  puuid: string;
  /** Riot ID; summonerName is empty for most accounts today */
  riotIdGameName: string;
  riotIdTagline: string;
  summonerName: string;
  summonerLevel: number;
  profileIcon: number;
  participantId: number;
  teamId: number;
  win: boolean;
  championId: number;
  championName: string;
  champLevel: number;
  /** TOP | JUNGLE | MIDDLE | BOTTOM | UTILITY | "" */
  teamPosition: string;
  individualPosition: string;
  lane: string;
  role: string;
  kills: number;
  deaths: number;
  assists: number;
  totalMinionsKilled: number;
  neutralMinionsKilled: number;
  goldEarned: number;
  totalDamageDealtToChampions: number;
  visionScore: number;
  summoner1Id: number;
  summoner2Id: number;
  item0: number;
  item1: number;
  item2: number;
  item3: number;
  item4: number;
  item5: number;
  item6: number;
  perks: PerksDto;
  gameEndedInSurrender: boolean;
  gameEndedInEarlySurrender: boolean;
}

export interface BanDto {
  championId: number;
  pickTurn: number;
}

export interface ObjectiveDto {
  first: boolean;
  kills: number;
}

export interface ObjectivesDto {
  baron: ObjectiveDto;
  champion: ObjectiveDto;
  dragon: ObjectiveDto;
  horde: ObjectiveDto;
  inhibitor: ObjectiveDto;
  riftHerald: ObjectiveDto;
  tower: ObjectiveDto;
}

export interface TeamDto {
  bans: BanDto[];
  objectives: ObjectivesDto;
  /** 100 = blue side, 200 = red side */
  teamId: number;
  win: boolean;
}

export interface InfoDto {
  endOfGameResult: string;
  /** Epoch ms when the game was created in the game server */
  gameCreation: number;
  /** Seconds */
  gameDuration: number;
  gameEndTimestamp: number;
  gameId: number;
  gameMode: string;
  gameName: string;
  gameStartTimestamp: number;
  gameType: string;
  gameVersion: string;
  mapId: number;
  participants: ParticipantDto[];
  platformId: string;
  /** 420 Solo/Duo, 440 Flex, 400/430/490 normals, 450 ARAM, 1700 Arena */
  queueId: number;
  teams: TeamDto[];
  tournamentCode: string;
}

export interface MatchDto {
  metadata: MetadataDto;
  info: InfoDto;
}
