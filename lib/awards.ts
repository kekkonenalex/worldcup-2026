// Award winner name matching + metadata. Pure — no Supabase imports.
//
// Award scoring matches a user's free-text predicted player name against the
// admin-entered actual winner name. Matching is forgiving so users don't miss out
// over trivial differences (case, extra spaces, accents).

// Normalizes a player name for comparison:
//   - strips diacritics/accents ("Mbappé" → "mbappe")
//   - trims and collapses internal whitespace
//   - lowercases
export function normalizePlayerName(name: string | null | undefined): string {
  if (!name) return ''
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove combining marks (accents)
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

// True when a user's predicted name matches the actual winner (both non-empty).
export function awardNameMatches(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const na = normalizePlayerName(a)
  const nb = normalizePlayerName(b)
  return na !== '' && na === nb
}

// ── Award metadata (drives the admin UI and keeps labels/points aligned with /rules) ──

export type AwardKey = 'golden_boot' | 'golden_ball' | 'golden_glove' | 'best_young_player'

export type AwardWinnerColumn =
  | 'golden_boot_player'
  | 'golden_ball_player'
  | 'golden_glove_player'
  | 'best_young_player'

export interface AwardConfig {
  key: AwardKey
  label: string
  column: AwardWinnerColumn
  points: number
}

// Name-based awards — each saved independently by player name.
export const AWARD_WINNERS: AwardConfig[] = [
  { key: 'golden_boot', label: 'Golden Boot (top scorer)', column: 'golden_boot_player', points: 20 },
  { key: 'golden_ball', label: 'Golden Ball (best player)', column: 'golden_ball_player', points: 20 },
  { key: 'golden_glove', label: 'Golden Glove (best goalkeeper)', column: 'golden_glove_player', points: 20 },
  { key: 'best_young_player', label: 'Best Young Player', column: 'best_young_player', points: 15 },
]

// The Golden Boot goal tally is scored separately from the player name (per /rules).
export const GOLDEN_BOOT_GOALS_POINTS = 10

export function awardConfig(key: AwardKey): AwardConfig | undefined {
  return AWARD_WINNERS.find(a => a.key === key)
}
