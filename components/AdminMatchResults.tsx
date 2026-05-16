'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { TeamBadge } from '@/components/ui/TeamBadge'
import {
  saveGroupMatchResult,
  saveKnockoutWinner,
  triggerBracketRecompute,
} from '@/app/admin/actions'
import {
  computeActualStandings,
  type MatchInput,
  type TeamInput,
  type ActualResultInput,
  type TeamStanding,
} from '@/lib/simulation'
import { BRACKET_STRUCTURE } from '@/lib/bracket'
import type { AdminMatch, AdminTeam } from '@/app/admin/page'

// ─── Types ────────────────────────────────────────────────────────────────────

type MatchStatus = 'scheduled' | 'live' | 'finished'
type Tab = 'group' | 'r32' | 'r16' | 'qf' | 'sf' | 'final_and_third'

type LocalState = {
  homeScore: string
  awayScore: string
  status: MatchStatus
  winnerTeamId: number | null
  saving: boolean
  error: string | null
}

interface Props {
  matches: AdminMatch[]
  teams: AdminTeam[]
  hasSomeExternalIds: boolean
}

const GROUP_LETTERS = 'ABCDEFGHIJKL'.split('')

const TABS: { key: Tab; label: string; stages: string[] }[] = [
  { key: 'group',          label: 'Group Stage',      stages: ['group'] },
  { key: 'r32',            label: 'Round of 32',      stages: ['r32'] },
  { key: 'r16',            label: 'Round of 16',      stages: ['r16'] },
  { key: 'qf',             label: 'Quarter-finals',   stages: ['qf'] },
  { key: 'sf',             label: 'Semi-finals',       stages: ['sf'] },
  { key: 'final_and_third', label: 'Final & 3rd Place', stages: ['final', 'third_place'] },
]

function stageToTab(stage: string): Tab {
  if (stage === 'final' || stage === 'third_place') return 'final_and_third'
  return stage as Tab
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initStates(matches: AdminMatch[]): Record<number, LocalState> {
  const s: Record<number, LocalState> = {}
  for (const m of matches) {
    s[m.id] = {
      homeScore: m.home_score?.toString() ?? '',
      awayScore: m.away_score?.toString() ?? '',
      status: m.status,
      winnerTeamId: m.winner_team_id,
      saving: false,
      error: null,
    }
  }
  return s
}

function computeLiveStandings(
  groupLetter: string,
  groupMatches: AdminMatch[],
  states: Record<number, LocalState>,
  groupTeams: AdminTeam[]
): TeamStanding[] {
  const matchInputs: MatchInput[] = groupMatches
    .filter(m => m.home_team_id != null && m.away_team_id != null)
    .map(m => ({
      id: m.id,
      match_number: m.match_number,
      group_letter: groupLetter,
      home_team_id: m.home_team_id!,
      away_team_id: m.away_team_id!,
    }))

  const results: ActualResultInput[] = groupMatches
    .filter(m => {
      const s = states[m.id]
      if (!s) return false
      const hs = parseInt(s.homeScore)
      const as_ = parseInt(s.awayScore)
      return !isNaN(hs) && !isNaN(as_) && s.homeScore !== '' && s.awayScore !== ''
    })
    .map(m => {
      const s = states[m.id]
      return { match_id: m.id, home_score: parseInt(s.homeScore), away_score: parseInt(s.awayScore) }
    })

  const teamInputs: TeamInput[] = groupTeams.map(t => ({
    id: t.id, name: t.name, short_code: t.short_code, flag_emoji: t.flag_emoji, group_letter: t.group_letter,
  }))

  return computeActualStandings(groupLetter, matchInputs, results, teamInputs)
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: MatchStatus }) {
  const cls = status === 'finished'
    ? 'bg-green-900/40 text-green-400 border-green-700'
    : status === 'live'
    ? 'bg-amber-900/40 text-amber-400 border-amber-700'
    : 'bg-bg-elevated text-fg-muted border-border-subtle'
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${cls}`}>
      {status}
    </span>
  )
}

function StatusToggle({
  value,
  onChange,
}: {
  value: MatchStatus
  onChange: (s: MatchStatus) => void
}) {
  const opts: MatchStatus[] = ['scheduled', 'live', 'finished']
  return (
    <div className="flex rounded overflow-hidden border border-border-subtle text-xs">
      {opts.map(o => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={`px-2 py-1 transition-colors capitalize ${
            value === o ? 'bg-accent text-accent-fg' : 'bg-bg-card text-fg-muted hover:text-fg-primary'
          }`}
        >
          {o === 'scheduled' ? 'Sched.' : o === 'finished' ? 'Done' : 'Live'}
        </button>
      ))}
    </div>
  )
}

function GroupStandingsTable({ standings }: { standings: TeamStanding[] }) {
  return (
    <div className="overflow-x-auto mb-3">
      <table className="w-full text-xs text-fg-muted">
        <thead>
          <tr className="border-b border-border-subtle">
            <th className="text-left py-1 pr-2 font-medium">Team</th>
            <th className="text-center px-1 font-medium">P</th>
            <th className="text-center px-1 font-medium">W</th>
            <th className="text-center px-1 font-medium">D</th>
            <th className="text-center px-1 font-medium">L</th>
            <th className="text-center px-1 font-medium">GF</th>
            <th className="text-center px-1 font-medium">GA</th>
            <th className="text-center px-1 font-medium">GD</th>
            <th className="text-center px-1 font-medium text-accent">Pts</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s, i) => (
            <tr key={s.team_id} className={`border-b border-border-subtle/50 ${i < 2 ? 'text-green-400' : i === 2 ? 'text-amber-500' : ''}`}>
              <td className="py-1 pr-2">
                <TeamBadge name={s.team_name} abbreviation={s.short_code} size="sm" />
              </td>
              <td className="text-center px-1 tabular-nums">{s.played}</td>
              <td className="text-center px-1 tabular-nums">{s.won}</td>
              <td className="text-center px-1 tabular-nums">{s.drawn}</td>
              <td className="text-center px-1 tabular-nums">{s.lost}</td>
              <td className="text-center px-1 tabular-nums">{s.goals_for}</td>
              <td className="text-center px-1 tabular-nums">{s.goals_against}</td>
              <td className="text-center px-1 tabular-nums">{s.goal_difference > 0 ? `+${s.goal_difference}` : s.goal_difference}</td>
              <td className="text-center px-1 tabular-nums font-bold text-accent">{s.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

type SyncState = { status: 'idle' | 'loading' | 'success' | 'error'; message: string }

export default function AdminMatchResults({ matches, teams, hasSomeExternalIds }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('group')
  const [states, setStates] = useState<Record<number, LocalState>>(() => initStates(matches))
  const [recomputing, setRecomputing] = useState(false)
  const [bootstrapState, setBootstrapState] = useState<SyncState>({ status: 'idle', message: '' })
  const [syncState, setSyncState] = useState<SyncState>({ status: 'idle', message: '' })
  const timers = useRef<Record<number, ReturnType<typeof setTimeout>>>({})

  const update = useCallback((id: number, patch: Partial<LocalState>) => {
    setStates(s => ({ ...s, [id]: { ...s[id], ...patch } }))
  }, [])

  const doGroupSave = useCallback(async (matchId: number, st: LocalState) => {
    const hs = st.homeScore === '' ? null : parseInt(st.homeScore)
    const as_ = st.awayScore === '' ? null : parseInt(st.awayScore)
    if ((hs !== null && isNaN(hs)) || (as_ !== null && isNaN(as_))) return

    update(matchId, { saving: true, error: null })
    const res = await saveGroupMatchResult(matchId, hs, as_, st.status)
    update(matchId, { saving: false, error: res.error ?? null })
    if (res.success) router.refresh()
  }, [update, router])

  const scheduleGroupSave = useCallback((matchId: number, st: LocalState) => {
    clearTimeout(timers.current[matchId])
    timers.current[matchId] = setTimeout(() => doGroupSave(matchId, st), 800)
  }, [doGroupSave])

  const onScoreChange = useCallback((matchId: number, field: 'homeScore' | 'awayScore', val: string) => {
    setStates(s => {
      const next = { ...s[matchId], [field]: val }
      scheduleGroupSave(matchId, next)
      return { ...s, [matchId]: next }
    })
  }, [scheduleGroupSave])

  const onStatusChange = useCallback((matchId: number, status: MatchStatus) => {
    clearTimeout(timers.current[matchId])
    setStates(s => {
      const next = { ...s[matchId], status }
      doGroupSave(matchId, next)
      return { ...s, [matchId]: next }
    })
  }, [doGroupSave])

  const onSetWinner = useCallback(async (matchId: number, winnerTeamId: number | null) => {
    update(matchId, { saving: true, error: null, winnerTeamId })
    const res = await saveKnockoutWinner(matchId, winnerTeamId)
    update(matchId, {
      saving: false,
      error: res.error ?? null,
      status: winnerTeamId != null ? 'finished' : 'scheduled',
    })
    if (res.success) router.refresh()
  }, [update, router])

  const handleRecompute = async () => {
    setRecomputing(true)
    await triggerBracketRecompute()
    setRecomputing(false)
    router.refresh()
  }

  const handleBootstrap = async () => {
    setBootstrapState({ status: 'loading', message: '' })
    try {
      const res = await fetch('/api/admin/sync-bootstrap', { method: 'POST' })
      const body = await res.json() as { bootstrapped?: number; errors?: string[]; error?: string }
      if (!res.ok) {
        setBootstrapState({ status: 'error', message: body.error ?? 'Unknown error' })
      } else {
        const errs = body.errors?.length ? ` (${body.errors.length} errors)` : ''
        setBootstrapState({ status: 'success', message: `Linked ${body.bootstrapped ?? 0} matches${errs}` })
        router.refresh()
      }
    } catch (e) {
      setBootstrapState({ status: 'error', message: String(e) })
    }
  }

  const handleSyncNow = async () => {
    setSyncState({ status: 'loading', message: '' })
    try {
      const res = await fetch('/api/admin/sync-now', { method: 'POST' })
      const body = await res.json() as { clearedKnockout?: number; groupUpdated?: number; groupCleared?: number; knockoutUpdated?: number; cascadeAssigned?: number; cascadeEmptied?: number; errors?: string[]; error?: string }
      if (!res.ok) {
        setSyncState({ status: 'error', message: body.error ?? 'Unknown error' })
      } else {
        const errs = body.errors?.length ? ` · ${body.errors.length} error(s)` : ''
        const msg = `Cleared ${body.clearedKnockout ?? 0} knockout slots · Group: ${body.groupUpdated ?? 0} updated, ${body.groupCleared ?? 0} cleared · Knockout API: ${body.knockoutUpdated ?? 0} updated · Cascade: ${body.cascadeAssigned ?? 0} assigned${errs}`
        setSyncState({ status: 'success', message: msg })
        router.refresh()
      }
    } catch (e) {
      setSyncState({ status: 'error', message: String(e) })
    }
  }

  // ── Counts ──

  const finishedByTab = new Map<Tab, number>()
  const totalByTab = new Map<Tab, number>()
  for (const t of TABS) { finishedByTab.set(t.key, 0); totalByTab.set(t.key, 0) }
  let totalFinished = 0
  for (const m of matches) {
    const t = stageToTab(m.stage)
    totalByTab.set(t, (totalByTab.get(t) ?? 0) + 1)
    if (states[m.id]?.status === 'finished') {
      finishedByTab.set(t, (finishedByTab.get(t) ?? 0) + 1)
      totalFinished++
    }
  }

  // ── Group completion (for TBD messages in knockout tabs) ──

  const groupMatchesTotal = matches.filter(m => m.stage === 'group')
  const groupMatchesWithScores = groupMatchesTotal.filter(
    m => m.home_score != null && m.away_score != null
  ).length
  const groupComplete = groupMatchesWithScores === 72

  // ── Teams by group ──

  const teamsByGroup = new Map<string, AdminTeam[]>()
  for (const t of teams) {
    if (!teamsByGroup.has(t.group_letter)) teamsByGroup.set(t.group_letter, [])
    teamsByGroup.get(t.group_letter)!.push(t)
  }

  // ── Current tab matches ──

  const tabDef = TABS.find(t => t.key === tab)!
  const tabMatches = matches.filter(m => tabDef.stages.includes(m.stage))

  return (
    <div className="max-w-5xl mx-auto px-4 pb-16">

      {/* Sticky bar */}
      <div className="sticky top-0 z-10 bg-bg-base border-b border-border-subtle py-3 mb-4 flex items-center justify-between gap-2 flex-wrap">
        <span className="text-sm text-fg-muted">
          <span className="font-semibold text-fg-primary tabular-nums">{totalFinished}</span>
          {' / 104 matches recorded as Finished'}
        </span>
        <div className="flex items-center gap-2 flex-wrap">
          {!hasSomeExternalIds ? (
            <button
              onClick={handleBootstrap}
              disabled={bootstrapState.status === 'loading'}
              className="rounded-lg border border-amber-700 hover:border-amber-500 px-3 py-1.5 text-xs text-amber-400 hover:text-amber-200 disabled:opacity-50 transition-colors"
            >
              {bootstrapState.status === 'loading' ? 'Bootstrapping…' : '🔗 Bootstrap External IDs'}
            </button>
          ) : (
            <button
              onClick={handleSyncNow}
              disabled={syncState.status === 'loading'}
              className="rounded-lg border border-accent/50 hover:border-accent px-3 py-1.5 text-xs text-accent hover:text-accent-hover disabled:opacity-50 transition-colors"
            >
              {syncState.status === 'loading' ? 'Syncing…' : '⬇️ Sync Now'}
            </button>
          )}
          <button
            onClick={handleRecompute}
            disabled={recomputing}
            className="rounded-lg border border-border-subtle hover:border-border-strong px-3 py-1.5 text-xs text-fg-muted hover:text-fg-primary disabled:opacity-50 transition-colors"
          >
            {recomputing ? 'Recomputing…' : '🔄 Recompute Bracket'}
          </button>
        </div>
      </div>

      {/* Sync feedback */}
      {bootstrapState.status === 'success' && (
        <p className="text-xs text-green-400 mb-3">{bootstrapState.message}</p>
      )}
      {bootstrapState.status === 'error' && (
        <p className="text-xs text-status-live mb-3">Bootstrap error: {bootstrapState.message}</p>
      )}
      {syncState.status === 'success' && (
        <p className="text-xs text-green-400 mb-3">{syncState.message}</p>
      )}
      {syncState.status === 'error' && (
        <p className="text-xs text-status-live mb-3">Sync error: {syncState.message}</p>
      )}

      {/* Tab bar */}
      <div className="flex gap-1 flex-wrap mb-6">
        {TABS.map(t => {
          const fin = finishedByTab.get(t.key) ?? 0
          const tot = totalByTab.get(t.key) ?? 0
          const active = tab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? 'bg-accent text-accent-fg'
                  : 'bg-bg-card border border-border-subtle text-fg-muted hover:text-fg-primary hover:border-border-strong'
              }`}
            >
              {t.label}
              <span className={`text-xs font-mono tabular-nums ${
                active ? 'text-accent-fg/80' : fin === tot ? 'text-green-400' : 'text-fg-muted'
              }`}>
                {fin}/{tot}
              </span>
            </button>
          )
        })}
      </div>

      {/* Group Stage tab */}
      {tab === 'group' && (
        <div className="space-y-6">
          {GROUP_LETTERS.map(letter => {
            const groupMatches = matches.filter(m => m.group_letter === letter)
            const groupTeams = teamsByGroup.get(letter) ?? []
            const standings = computeLiveStandings(letter, groupMatches, states, groupTeams)
            return (
              <div key={letter} className="rounded-card bg-bg-card border border-border-subtle overflow-hidden">
                <div className="px-5 py-3 bg-bg-elevated/50 font-semibold text-sm text-fg-secondary">Group {letter}</div>
                <div className="px-5 pt-4">
                  <GroupStandingsTable standings={standings} />
                </div>
                <div className="divide-y divide-border-subtle">
                  {groupMatches.map(m => {
                    const st = states[m.id]
                    if (!st) return null
                    return (
                      <div key={m.id} className="px-5 py-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Home */}
                          <span className="min-w-0 flex-1 flex justify-end">
                            {m.home_team
                              ? <TeamBadge name={m.home_team.name} abbreviation={m.home_team.short_code} size="sm" />
                              : <span className="text-sm text-fg-muted">?</span>}
                          </span>

                          {/* Scores */}
                          <div className="flex items-center gap-1 shrink-0">
                            <input
                              type="number" min={0} max={20} value={st.homeScore}
                              onChange={e => onScoreChange(m.id, 'homeScore', e.target.value)}
                              className="score-pill-field w-10 text-center rounded bg-bg-elevated border border-border-subtle px-1 py-1 text-sm text-fg-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent [appearance:textfield]"
                            />
                            <span className="text-fg-muted text-xs">—</span>
                            <input
                              type="number" min={0} max={20} value={st.awayScore}
                              onChange={e => onScoreChange(m.id, 'awayScore', e.target.value)}
                              className="score-pill-field w-10 text-center rounded bg-bg-elevated border border-border-subtle px-1 py-1 text-sm text-fg-primary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent [appearance:textfield]"
                            />
                          </div>

                          {/* Away */}
                          <span className="min-w-0 flex-1">
                            {m.away_team
                              ? <TeamBadge name={m.away_team.name} abbreviation={m.away_team.short_code} size="sm" />
                              : <span className="text-sm text-fg-muted">?</span>}
                          </span>

                          {/* Status + saving */}
                          <div className="flex items-center gap-2 ml-auto shrink-0">
                            <StatusToggle value={st.status} onChange={s => onStatusChange(m.id, s)} />
                            {st.saving && <span className="text-xs text-fg-muted">saving…</span>}
                          </div>
                        </div>
                        {st.error && <p className="text-xs text-status-live mt-1">{st.error}</p>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Knockout tabs */}
      {tab !== 'group' && (
        <div className="space-y-4">
          {tabMatches.map(m => {
            const st = states[m.id]
            if (!st) return null
            const homeTeam = m.home_team
            const awayTeam = m.away_team
            const matchDef = BRACKET_STRUCTURE.find(d => d.match_number === m.match_number)

            return (
              <div key={m.id} className="rounded-card bg-bg-card border border-border-subtle overflow-hidden">
                <div className="px-5 py-2.5 bg-bg-elevated/40 flex items-center justify-between">
                  <span className="text-xs font-medium text-fg-muted">
                    {matchDef?.label ?? `Match ${m.match_number}`}
                  </span>
                  <StatusBadge status={st.status} />
                </div>

                <div className="px-5 py-4">
                  {/* Two team cards */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {[
                      { team: homeTeam, isWinner: st.winnerTeamId === homeTeam?.id },
                      { team: awayTeam, isWinner: st.winnerTeamId === awayTeam?.id },
                    ].map(({ team, isWinner }, idx) => (
                      <div
                        key={idx}
                        className={`rounded-lg border px-4 py-3 text-center transition-colors ${
                          isWinner
                            ? 'border-green-600 bg-green-900/20'
                            : team
                            ? 'border-border-subtle bg-bg-elevated/40'
                            : 'border-border-subtle bg-bg-card'
                        }`}
                      >
                        {team ? (
                          <>
                            <div className="flex justify-center mb-1">
                              <TeamBadge name={team.name} abbreviation={team.short_code} size="md" />
                            </div>
                            {isWinner && <div className="text-xs text-green-400 mt-1 font-medium">✓ Winner</div>}
                          </>
                        ) : (
                          <div className="text-xs text-fg-muted py-2">TBD</div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Winner selection */}
                  {homeTeam && awayTeam && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-fg-muted shrink-0">Set winner:</span>
                      <button
                        onClick={() => onSetWinner(m.id, homeTeam.id)}
                        disabled={st.saving}
                        className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                          st.winnerTeamId === homeTeam.id
                            ? 'bg-green-700 text-white'
                            : 'border border-border-subtle text-fg-muted hover:text-fg-primary hover:border-border-strong'
                        }`}
                      >
                        <TeamBadge name={homeTeam.name} abbreviation={homeTeam.short_code} size="sm" />
                      </button>
                      <button
                        onClick={() => onSetWinner(m.id, awayTeam.id)}
                        disabled={st.saving}
                        className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                          st.winnerTeamId === awayTeam.id
                            ? 'bg-green-700 text-white'
                            : 'border border-border-subtle text-fg-muted hover:text-fg-primary hover:border-border-strong'
                        }`}
                      >
                        <TeamBadge name={awayTeam.name} abbreviation={awayTeam.short_code} size="sm" />
                      </button>
                      {st.winnerTeamId !== null && (
                        <button
                          onClick={() => onSetWinner(m.id, null)}
                          disabled={st.saving}
                          className="rounded px-3 py-1 text-xs text-fg-muted hover:text-status-live border border-border-subtle hover:border-border-strong transition-colors"
                        >
                          Clear
                        </button>
                      )}
                      {st.saving && <span className="text-xs text-fg-muted">saving…</span>}
                    </div>
                  )}
                  {!homeTeam || !awayTeam ? (
                    <p className="text-xs text-fg-muted">
                      {!groupComplete
                        ? `TBD — ${groupMatchesWithScores}/72 group scores saved (need all 72 to populate R32)`
                        : 'TBD — click Recompute Bracket to populate slots'}
                    </p>
                  ) : null}

                  {st.error && <p className="text-xs text-status-live mt-2">{st.error}</p>}
                </div>
              </div>
            )
          })}
        </div>
      )}

    </div>
  )
}
