import { unstable_cache } from 'next/cache'
import { fetchWorldCupScorers, type FdScorer } from '@/lib/football-data'

const getCachedScorers = unstable_cache(
  async () => {
    const apiKey = process.env.FOOTBALL_DATA_API_KEY
    if (!apiKey) return []
    return fetchWorldCupScorers(apiKey, 10)
  },
  ['wc-scorers'],
  { revalidate: 600 }
)

function sortScorers(scorers: FdScorer[]): FdScorer[] {
  return [...scorers].sort((a, b) => {
    if (b.goals !== a.goals) return b.goals - a.goals
    const aAssists = a.assists ?? 0
    const bAssists = b.assists ?? 0
    if (bAssists !== aAssists) return bAssists - aAssists
    if (a.playedMatches !== b.playedMatches) return a.playedMatches - b.playedMatches
    return a.player.name.localeCompare(b.player.name)
  })
}

export async function TopScorers() {
  let scorers: FdScorer[] = []
  try {
    scorers = await getCachedScorers()
  } catch {
    // API unavailable — show pre-tournament placeholder
  }

  const top5 = sortScorers(scorers).slice(0, 5)

  if (top5.length === 0) {
    return (
      <p className="text-xs text-fg-muted bg-bg-elevated rounded px-3 py-2 font-mono">
        Top scorers will appear here once the tournament begins.
      </p>
    )
  }

  return (
    <div className="divide-y divide-border-subtle">
      {top5.map((s, i) => (
        <div key={s.player.id} className="flex items-center gap-3 py-3">
          <span className="font-display text-accent text-lg w-6 text-center shrink-0">
            {i + 1}
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-fg-primary truncate">{s.player.name}</p>
            <p className="text-xs text-fg-muted">{s.team.shortName ?? s.team.name}</p>
          </div>
          <div className="flex items-center gap-4 text-sm shrink-0">
            <div className="text-center">
              <p className="font-bold text-fg-primary">{s.goals}</p>
              <p className="text-xs text-fg-muted">Goals</p>
            </div>
            {s.assists != null && (
              <div className="text-center">
                <p className="font-bold text-fg-secondary">{s.assists}</p>
                <p className="text-xs text-fg-muted">Assists</p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
