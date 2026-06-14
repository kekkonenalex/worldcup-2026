import { createClient } from '@/lib/supabase/server'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { TeamBadge } from '@/components/ui/TeamBadge'
import { MatchTime } from '@/components/ui/MatchTime'

type UpcomingMatch = {
  id: number
  match_number: number
  stage: string
  group_letter: string | null
  scheduled_at: string
  home_team: { name: string; short_code: string; flag_emoji: string } | null
  away_team: { name: string; short_code: string; flag_emoji: string } | null
}

function stageLabel(stage: string, groupLetter: string | null): string {
  if (stage === 'group') return `Group ${groupLetter ?? ''}`
  const labels: Record<string, string> = {
    r32: 'R32', r16: 'R16', qf: 'QF', sf: 'SF',
    third_place: '3rd Place', final: 'Final',
  }
  return labels[stage] ?? stage.toUpperCase()
}

export async function UpcomingMatches() {
  const supabase = await createClient()
  const now = new Date().toISOString()

  const { data } = await supabase
    .from('matches')
    .select(`
      id, match_number, stage, group_letter, scheduled_at,
      home_team:teams!matches_home_team_id_fkey(name, short_code, flag_emoji),
      away_team:teams!matches_away_team_id_fkey(name, short_code, flag_emoji)
    `)
    .not('scheduled_at', 'is', null)
    .gt('scheduled_at', now)
    .order('scheduled_at', { ascending: true })
    .limit(4)

  const matches = (data ?? []) as unknown as UpcomingMatch[]

  // The viewer's own group-stage score predictions, keyed by match id.
  const { data: { user } } = await supabase.auth.getUser()
  const predByMatchId = new Map<number, { home: number; away: number }>()
  if (user) {
    const { data: predRows } = await supabase
      .from('group_predictions')
      .select('match_id, predicted_home_score, predicted_away_score')
      .eq('user_id', user.id)
    for (const p of (predRows ?? []) as unknown as { match_id: number; predicted_home_score: number; predicted_away_score: number }[]) {
      predByMatchId.set(p.match_id, { home: p.predicted_home_score, away: p.predicted_away_score })
    }
  }

  if (matches.length === 0) {
    return (
      <section className="mb-12">
        <SectionHeading>Upcoming Matches</SectionHeading>
        <p className="text-fg-muted text-sm">Tournament complete.</p>
      </section>
    )
  }

  return (
    <section className="mb-12">
      <SectionHeading>Upcoming Matches</SectionHeading>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {matches.map(m => {
          const pick = m.stage === 'group' ? predByMatchId.get(m.id) : undefined
          return (
          <div
            key={m.match_number}
            className="bg-bg-card border border-border-subtle rounded-card p-4 flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-accent">
                {stageLabel(m.stage, m.group_letter)}
              </span>
              <span className="text-[10px] text-fg-muted opacity-60">#{m.match_number}</span>
            </div>

            <div className="flex flex-col gap-2">
              {m.home_team ? (
                <TeamBadge
                  name={m.home_team.name}
                  abbreviation={m.home_team.short_code}
                  flag={m.home_team.flag_emoji}
                  size="sm"
                />
              ) : (
                <span className="text-fg-muted text-xs italic">TBD</span>
              )}
              <div className="h-px bg-border-subtle" />
              {m.away_team ? (
                <TeamBadge
                  name={m.away_team.name}
                  abbreviation={m.away_team.short_code}
                  flag={m.away_team.flag_emoji}
                  size="sm"
                />
              ) : (
                <span className="text-fg-muted text-xs italic">TBD</span>
              )}
            </div>

            {m.stage === 'group' && (
              <div className="text-[11px] mt-auto">
                {pick ? (
                  <span className="text-fg-secondary">
                    Your pick:{' '}
                    <span className="text-fg-primary font-semibold tabular-nums">{pick.home}–{pick.away}</span>
                  </span>
                ) : (
                  <span className="text-fg-muted">No pick</span>
                )}
              </div>
            )}

            <MatchTime
              iso={m.scheduled_at}
              className={`text-[11px] text-fg-muted tabular-nums ${m.stage === 'group' ? '' : 'mt-auto'}`}
            />
          </div>
          )
        })}
      </div>
    </section>
  )
}
