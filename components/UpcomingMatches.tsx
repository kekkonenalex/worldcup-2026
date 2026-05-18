import { createClient } from '@/lib/supabase/server'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { TeamBadge } from '@/components/ui/TeamBadge'
import { MatchTime } from '@/components/ui/MatchTime'

type UpcomingMatch = {
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
      match_number, stage, group_letter, scheduled_at,
      home_team:teams!matches_home_team_id_fkey(name, short_code, flag_emoji),
      away_team:teams!matches_away_team_id_fkey(name, short_code, flag_emoji)
    `)
    .not('scheduled_at', 'is', null)
    .gt('scheduled_at', now)
    .order('scheduled_at', { ascending: true })
    .limit(4)

  const matches = (data ?? []) as unknown as UpcomingMatch[]

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
        {matches.map(m => (
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

            <MatchTime
              iso={m.scheduled_at}
              className="text-[11px] text-fg-muted tabular-nums mt-auto"
            />
          </div>
        ))}
      </div>
    </section>
  )
}
