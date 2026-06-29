// Pure knockout advancement detection — derives, from FINISHED matches only,
// which teams reached each round. Path-independent: a team is "in" a round if it
// won its match in the prior round, regardless of bracket slot or opponent.
//
// Advancement is read from matches.winner_team_id (admin-set), NOT from scores, so
// extra-time / penalty-decided matches resolve correctly.

import type { Match } from '@/types/database'

export interface AdvancedByRound {
  r32: Set<number>      // qualified from groups (= computeQualifiedTeams.allR32 when complete)
  r16: Set<number>      // won an R32 match (matches 73–88)
  qf: Set<number>       // won an R16 match (89–96)
  sf: Set<number>       // won a QF match (97–100)
  final: Set<number>    // won an SF match (101–102) — the two finalists
  champion: Set<number> // won the final (104)
  eliminated: Set<number> // lost a finished knockout match — can no longer advance
}

const isFinished = (m: Match): boolean => m.winner_team_id != null

// Winners of finished matches whose match_number falls in [min, max].
function winnersInRange(matches: Match[], min: number, max: number): Set<number> {
  const out = new Set<number>()
  for (const m of matches) {
    if (m.match_number < min || m.match_number > max) continue
    if (!isFinished(m)) continue
    out.add(m.winner_team_id!)
  }
  return out
}

// Losers of finished knockout matches: the participating team that is NOT the winner.
// Excludes the third-place play-off (103) — both its teams already lost in the SF.
function eliminatedTeams(matches: Match[]): Set<number> {
  const out = new Set<number>()
  for (const m of matches) {
    if (m.match_number < 73 || m.match_number > 104 || m.match_number === 103) continue
    if (!isFinished(m)) continue
    const winner = m.winner_team_id!
    if (m.home_team_id != null && m.home_team_id !== winner) out.add(m.home_team_id)
    if (m.away_team_id != null && m.away_team_id !== winner) out.add(m.away_team_id)
  }
  return out
}

export function getAdvancedTeamsByRound(
  allMatches: Match[],
  qualifiedR32: Set<number> | null,
): AdvancedByRound {
  return {
    r32: qualifiedR32 ? new Set(qualifiedR32) : new Set(),
    r16: winnersInRange(allMatches, 73, 88),
    qf: winnersInRange(allMatches, 89, 96),
    sf: winnersInRange(allMatches, 97, 100),
    final: winnersInRange(allMatches, 101, 102),
    champion: winnersInRange(allMatches, 104, 104),
    eliminated: eliminatedTeams(allMatches),
  }
}
