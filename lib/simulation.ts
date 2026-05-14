// Pure simulation engine — no React, no DB calls, no side effects.

// ─── Types ────────────────────────────────────────────────────────────────────

export type TeamStanding = {
  team_id: number
  team_name: string
  short_code: string
  flag_emoji: string
  group_letter: string
  played: number
  won: number
  drawn: number
  lost: number
  goals_for: number
  goals_against: number
  goal_difference: number
  points: number
  position: number // 1–4 within group
}

export type MatchInput = {
  id: number
  match_number: number
  group_letter: string
  home_team_id: number
  away_team_id: number
}

export type PredictionInput = {
  match_id: number
  predicted_home_score: number
  predicted_away_score: number
}

export type TeamInput = {
  id: number
  name: string
  short_code: string
  flag_emoji: string
  group_letter: string
}

export type ActualResultInput = {
  match_id: number
  home_score: number
  away_score: number
}

export type ThirdPlaceResult = {
  advancing: TeamStanding[]  // top 8
  eliminated: TeamStanding[] // bottom 4
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function makeBlankStanding(team: TeamInput, groupLetter: string): TeamStanding {
  return {
    team_id: team.id,
    team_name: team.name,
    short_code: team.short_code,
    flag_emoji: team.flag_emoji,
    group_letter: groupLetter,
    played: 0, won: 0, drawn: 0, lost: 0,
    goals_for: 0, goals_against: 0, goal_difference: 0, points: 0, position: 0,
  }
}

type H2HStats = { points: number; gd: number; gf: number }

// Compute head-to-head mini-standings among the given team IDs using only
// matches between those teams (FIFA rules: H2H among the tied subset).
function computeH2H(
  teamIds: Set<number>,
  matches: MatchInput[],
  predMap: Map<number, PredictionInput>
): Map<number, H2HStats> {
  const stats = new Map<number, H2HStats>()
  for (const id of teamIds) stats.set(id, { points: 0, gd: 0, gf: 0 })

  for (const m of matches) {
    // Only count matches between teams that are ALL in the tied set
    if (!teamIds.has(m.home_team_id) || !teamIds.has(m.away_team_id)) continue
    const pred = predMap.get(m.id)
    if (!pred) continue

    const hs = pred.predicted_home_score
    const as_ = pred.predicted_away_score
    const home = stats.get(m.home_team_id)!
    const away = stats.get(m.away_team_id)!

    home.gf += hs
    away.gf += as_
    home.gd += hs - as_
    away.gd += as_ - hs

    if (hs > as_) { home.points += 3 }
    else if (hs < as_) { away.points += 3 }
    else { home.points += 1; away.points += 1 }
  }

  return stats
}

// ─── computeGroupStandings ────────────────────────────────────────────────────

export function computeGroupStandings(
  groupLetter: string,
  matches: MatchInput[],
  predictions: PredictionInput[],
  teams: TeamInput[]
): TeamStanding[] {
  // 1. Initialise standings
  const byId = new Map<number, TeamStanding>()
  for (const t of teams) byId.set(t.id, makeBlankStanding(t, groupLetter))

  // 2. Build prediction lookup (by match_id)
  const predMap = new Map<number, PredictionInput>()
  for (const p of predictions) predMap.set(p.match_id, p)

  // 3. Apply each match
  for (const m of matches) {
    const pred = predMap.get(m.id)
    if (!pred) throw new Error(`Missing prediction for match ${m.match_number}`)

    const home = byId.get(m.home_team_id)
    const away = byId.get(m.away_team_id)
    if (!home || !away) continue

    const hs = pred.predicted_home_score
    const as_ = pred.predicted_away_score

    home.goals_for += hs
    home.goals_against += as_
    away.goals_for += as_
    away.goals_against += hs

    if (hs > as_) {
      home.won++; home.points += 3; away.lost++
    } else if (hs < as_) {
      away.won++; away.points += 3; home.lost++
    } else {
      home.drawn++; home.points++
      away.drawn++; away.points++
    }
  }

  // 4. Derive calculated fields
  for (const s of byId.values()) {
    s.played = s.won + s.drawn + s.lost
    s.goal_difference = s.goals_for - s.goals_against
  }

  // 5. Sort: primary criteria first (pts → GD → GF), then H2H for tied groups
  const arr = Array.from(byId.values())

  // Primary sort — stable, so equal teams stay in original order temporarily
  arr.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    if (b.goal_difference !== a.goal_difference) return b.goal_difference - a.goal_difference
    if (b.goals_for !== a.goals_for) return b.goals_for - a.goals_for
    return 0
  })

  // Find contiguous runs of teams tied on all primary criteria and apply H2H
  const finalOrder: TeamStanding[] = []
  let i = 0
  while (i < arr.length) {
    // Find end of this tied band
    let j = i + 1
    while (
      j < arr.length &&
      arr[j].points === arr[i].points &&
      arr[j].goal_difference === arr[i].goal_difference &&
      arr[j].goals_for === arr[i].goals_for
    ) j++

    const band = arr.slice(i, j)

    if (band.length === 1) {
      finalOrder.push(band[0])
    } else {
      // Apply H2H tiebreaker within this band
      const ids = new Set(band.map(s => s.team_id))
      const h2h = computeH2H(ids, matches, predMap)

      band.sort((a, b) => {
        const ah = h2h.get(a.team_id)!
        const bh = h2h.get(b.team_id)!
        if (bh.points !== ah.points) return bh.points - ah.points
        if (bh.gd !== ah.gd) return bh.gd - ah.gd
        if (bh.gf !== ah.gf) return bh.gf - ah.gf
        // Deterministic alphabetical fallback
        return a.team_name.localeCompare(b.team_name)
      })

      finalOrder.push(...band)
    }

    i = j
  }

  // 6. Assign positions 1–4
  finalOrder.forEach((s, idx) => { s.position = idx + 1 })

  return finalOrder
}

// ─── computeActualStandings ───────────────────────────────────────────────────
// Variant for actual results — silently skips matches without a recorded result.

export function computeActualStandings(
  groupLetter: string,
  matches: MatchInput[],
  results: ActualResultInput[],
  teams: TeamInput[]
): TeamStanding[] {
  const resultMap = new Map<number, ActualResultInput>()
  for (const r of results) resultMap.set(r.match_id, r)

  // Only include matches that have a result
  const matchesWithResults = matches.filter(m => resultMap.has(m.id))

  const predictions: PredictionInput[] = matchesWithResults.map(m => {
    const r = resultMap.get(m.id)!
    return {
      match_id: m.id,
      predicted_home_score: r.home_score,
      predicted_away_score: r.away_score,
    }
  })

  return computeGroupStandings(groupLetter, matchesWithResults, predictions, teams)
}

// ─── rankThirdPlaceTeams ──────────────────────────────────────────────────────

export function rankThirdPlaceTeams(allGroupStandings: TeamStanding[][]): ThirdPlaceResult {
  const thirds = allGroupStandings.flatMap(g => g.filter(s => s.position === 3))

  thirds.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    if (b.goal_difference !== a.goal_difference) return b.goal_difference - a.goal_difference
    if (b.goals_for !== a.goals_for) return b.goals_for - a.goals_for
    return a.team_name.localeCompare(b.team_name)
  })

  return {
    advancing: thirds.slice(0, 8),
    eliminated: thirds.slice(8),
  }
}

// ─── getAdvancingTeams ────────────────────────────────────────────────────────

export function getAdvancingTeams(
  allGroupStandings: TeamStanding[][],
  thirdPlaceResult: ThirdPlaceResult
): TeamStanding[] {
  // Ensure groups are in alphabetical order (A → L)
  const sorted = [...allGroupStandings].sort((a, b) =>
    a[0].group_letter.localeCompare(b[0].group_letter)
  )

  const result: TeamStanding[] = []

  for (const standings of sorted) {
    const winner = standings.find(s => s.position === 1)
    const runnerUp = standings.find(s => s.position === 2)
    if (winner) result.push(winner)
    if (runnerUp) result.push(runnerUp)
  }

  result.push(...thirdPlaceResult.advancing)

  return result
}
