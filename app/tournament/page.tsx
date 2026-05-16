import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  computeActualStandings,
  type MatchInput,
  type ActualResultInput,
  type TeamInput,
} from '@/lib/simulation'
import { BRACKET_STRUCTURE } from '@/lib/bracket'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { GroupStandingsTable } from '@/components/ui/GroupStandingsTable'
import { MatchCard } from '@/components/ui/MatchCard'
import { Card } from '@/components/ui/Card'

export const dynamic = 'force-dynamic'

const GROUP_LETTERS = 'ABCDEFGHIJKL'.split('')

const STAGE_LABELS: Record<string, string> = {
  r32: 'Round of 32',
  r16: 'Round of 16',
  qf: 'Quarter-Finals',
  sf: 'Semi-Finals',
  third_place: 'Third Place',
  final: 'Final',
}

type RawMatch = {
  id: number
  match_number: number
  stage: string
  group_letter: string | null
  home_team_id: number | null
  away_team_id: number | null
  home_score: number | null
  away_score: number | null
  status: string
  home_team: { id: number; name: string; short_code: string; flag_emoji: string; group_letter: string } | null
  away_team: { id: number; name: string; short_code: string; flag_emoji: string; group_letter: string } | null
}

export default async function TournamentPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: rawMatchesData }, { data: rawTeamsData }] = await Promise.all([
    supabase
      .from('matches')
      .select(`
        id, match_number, stage, group_letter,
        home_team_id, away_team_id,
        home_score, away_score, status,
        home_team:teams!matches_home_team_id_fkey(id, name, short_code, flag_emoji, group_letter),
        away_team:teams!matches_away_team_id_fkey(id, name, short_code, flag_emoji, group_letter)
      `)
      .order('match_number', { ascending: true }),
    supabase.from('teams').select('id, name, short_code, flag_emoji, group_letter'),
  ])

  const allMatches = (rawMatchesData ?? []) as unknown as RawMatch[]
  const allTeams = (rawTeamsData ?? []) as unknown as TeamInput[]

  const groupMatches = allMatches.filter(m => m.stage === 'group')
  const knockoutMatches = allMatches.filter(m => m.stage !== 'group')

  // ── Compute group standings ──────────────────────────────────────────────────

  const matchesByGroup = new Map<string, MatchInput[]>()
  const teamsByGroup = new Map<string, Map<number, TeamInput>>()
  const resultsByGroup = new Map<string, ActualResultInput[]>()

  for (const m of groupMatches) {
    const letter = m.group_letter
    if (!letter || !m.home_team_id || !m.away_team_id) continue

    if (!matchesByGroup.has(letter)) { matchesByGroup.set(letter, []); teamsByGroup.set(letter, new Map()); resultsByGroup.set(letter, []) }

    matchesByGroup.get(letter)!.push({ id: m.id, match_number: m.match_number, group_letter: letter, home_team_id: m.home_team_id, away_team_id: m.away_team_id })

    const tMap = teamsByGroup.get(letter)!
    if (m.home_team && !tMap.has(m.home_team.id)) tMap.set(m.home_team.id, { ...m.home_team, group_letter: letter })
    if (m.away_team && !tMap.has(m.away_team.id)) tMap.set(m.away_team.id, { ...m.away_team, group_letter: letter })

    if (m.home_score != null && m.away_score != null) {
      resultsByGroup.get(letter)!.push({ match_id: m.id, home_score: m.home_score, away_score: m.away_score })
    }
  }

  const groupStandings = GROUP_LETTERS.map(letter => {
    const ms = matchesByGroup.get(letter) ?? []
    const ts = Array.from(teamsByGroup.get(letter)?.values() ?? [])
    const rs = resultsByGroup.get(letter) ?? []
    if (ms.length === 0) return { letter, teams: [] }
    const standings = computeActualStandings(letter, ms, rs, ts)
    const complete = rs.length === ms.length && ms.length === 6
    return {
      letter,
      complete,
      teams: standings.map(s => ({
        name: s.team_name,
        abbreviation: s.short_code,
        flag: s.flag_emoji,
        w: s.won,
        d: s.drawn,
        l: s.lost,
        pts: s.points,
      })),
    }
  })

  // ── Group knockout matches by stage ─────────────────────────────────────────

  const knockoutByStage = new Map<string, RawMatch[]>()
  const stageOrder = ['r32', 'r16', 'qf', 'sf', 'third_place', 'final']
  for (const s of stageOrder) knockoutByStage.set(s, [])
  for (const m of knockoutMatches) {
    const bucket = knockoutByStage.get(m.stage)
    if (bucket) bucket.push(m)
  }

  const bracketDefMap = new Map(BRACKET_STRUCTURE.map(d => [d.match_number, d]))

  return (
    <div className="pb-16">
      {/* Hero */}
      <div className="mb-10">
        <h1 className="text-5xl md:text-6xl font-display tracking-wide uppercase text-fg-primary mb-2">
          Tournament Hub
        </h1>
        <p className="text-fg-muted text-sm">
          Live standings, knockout results, and award races — all in one place.
        </p>
      </div>

      {/* ── Group Stage ── */}
      <section className="mb-12">
        <SectionHeading>Group Stage</SectionHeading>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groupStandings.map(g => (
            <GroupStandingsTable
              key={g.letter}
              groupLetter={g.letter}
              teams={g.teams}
              complete={g.complete ?? false}
            />
          ))}
        </div>
      </section>

      {/* ── Knockout Phase ── */}
      <section className="mb-12">
        <SectionHeading action={{ label: 'Full Bracket', href: '/tournament/bracket' }}>
          Knockout Phase
        </SectionHeading>

        {stageOrder.map(stage => {
          const stageMatches = knockoutByStage.get(stage) ?? []
          if (stageMatches.length === 0) return null
          return (
            <div key={stage} className="mb-8">
              <p className="text-xs font-semibold uppercase tracking-wider text-fg-muted mb-3">
                {STAGE_LABELS[stage] ?? stage}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {stageMatches.map(m => {
                  const def = bracketDefMap.get(m.match_number)
                  const label = def?.label ?? `Match ${m.match_number}`
                  const matchStatus = m.status === 'finished' ? 'result'
                    : m.status === 'live' ? 'live'
                    : 'upcoming'

                  return (
                    <MatchCard
                      key={m.id}
                      groupOrStage={label}
                      homeTeam={m.home_team ? { name: m.home_team.name, abbreviation: m.home_team.short_code, flag: m.home_team.flag_emoji } : null}
                      awayTeam={m.away_team ? { name: m.away_team.name, abbreviation: m.away_team.short_code, flag: m.away_team.flag_emoji } : null}
                      actual={m.home_score != null && m.away_score != null ? { home: m.home_score, away: m.away_score } : null}
                      status={matchStatus as 'result' | 'live' | 'upcoming'}
                      homeSlotLabel={!m.home_team ? `Winner M${m.home_team_id ?? '?'}` : undefined}
                      awaySlotLabel={!m.away_team ? `Winner M${m.away_team_id ?? '?'}` : undefined}
                    />
                  )
                })}
              </div>
            </div>
          )
        })}
      </section>

      {/* ── Golden Boot ── */}
      <section className="mb-12">
        <SectionHeading>Golden Boot</SectionHeading>
        <Card>
          <div className="flex items-start gap-4">
            <img src="/images/golden-boot.webp" alt="Golden Boot" className="w-20 h-20 object-contain shrink-0" />
            <div>
              <h3 className="font-display text-accent tracking-wider text-lg mb-1">GOLDEN BOOT</h3>
              <p className="text-fg-secondary text-sm mb-3">
                The race for the tournament&apos;s top goalscorer.
              </p>
              <p className="text-xs text-fg-muted bg-bg-elevated rounded px-3 py-2 font-mono">
                Top scorers will appear here
              </p>
            </div>
          </div>
        </Card>
      </section>
    </div>
  )
}
