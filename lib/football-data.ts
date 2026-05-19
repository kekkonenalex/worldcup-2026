// Pure API client for football-data.org. No Supabase imports.

export interface FdPlayer {
  id: number
  name: string
  nationality: string
  position: string | null
}

export interface FdScorer {
  player: FdPlayer
  team: { id: number; name: string; shortName: string }
  goals: number
  assists: number | null
  playedMatches: number
  penalties: number | null
}

export async function fetchWorldCupScorers(apiKey: string, limit = 10): Promise<FdScorer[]> {
  const res = await fetch(
    `https://api.football-data.org/v4/competitions/WC/scorers?limit=${limit}`,
    {
      headers: { 'X-Auth-Token': apiKey },
      next: { revalidate: 0 },
    }
  )
  if (!res.ok) {
    throw new Error(`football-data.org returned ${res.status}: ${await res.text()}`)
  }
  const body = (await res.json()) as { scorers: FdScorer[] }
  return body.scorers ?? []
}

export interface FdTeam {
  id: number
  name: string
  shortName: string
  tla: string
}

export interface FdScore {
  winner: 'HOME_TEAM' | 'AWAY_TEAM' | 'DRAW' | null
  fullTime: { home: number | null; away: number | null }
  halfTime: { home: number | null; away: number | null }
}

export interface FdMatch {
  id: number
  utcDate: string
  status: 'SCHEDULED' | 'TIMED' | 'IN_PLAY' | 'PAUSED' | 'FINISHED' | 'SUSPENDED' | 'POSTPONED' | 'CANCELLED' | 'AWARDED'
  matchday: number | null
  stage: string
  group: string | null
  homeTeam: FdTeam
  awayTeam: FdTeam
  score: FdScore
}

export interface FdMatchesResponse {
  matches: FdMatch[]
}

export async function fetchWorldCupMatches(apiKey: string): Promise<FdMatch[]> {
  const res = await fetch('https://api.football-data.org/v4/competitions/WC/matches', {
    headers: { 'X-Auth-Token': apiKey },
    next: { revalidate: 0 },
  })
  if (!res.ok) {
    throw new Error(`football-data.org returned ${res.status}: ${await res.text()}`)
  }
  const body = (await res.json()) as FdMatchesResponse
  return body.matches
}

export function classifyStage(stage: string): 'group' | 'r32' | 'r16' | 'qf' | 'sf' | 'third' | 'final' | 'unknown' {
  const s = stage.toUpperCase()
  if (s === 'GROUP_STAGE') return 'group'
  if (s === 'ROUND_OF_32' || s === 'LAST_32') return 'r32'
  if (s === 'ROUND_OF_16' || s === 'LAST_16') return 'r16'
  if (s === 'QUARTER_FINALS' || s === 'QUARTER_FINAL') return 'qf'
  if (s === 'SEMI_FINALS' || s === 'SEMI_FINAL') return 'sf'
  if (s === 'THIRD_PLACE' || s === 'THIRD_PLACE_MATCH' || s === 'PLAY_OFF_FOR_THIRD_PLACE') return 'third'
  if (s === 'FINAL') return 'final'
  return 'unknown'
}
