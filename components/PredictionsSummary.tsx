'use client'

import { useState } from 'react'
import Link from 'next/link'
import { TeamBadge } from '@/components/ui/TeamBadge'
import { MatchTime } from '@/components/ui/MatchTime'
import { STAGE_ORDER, STAGE_LABELS, type ResolvedMatch } from '@/lib/bracket'
import { PREDICTION_DEADLINE } from '@/lib/config'
import type { TeamStanding } from '@/lib/simulation'
import type { AwardPrediction } from '@/types/database'
import type { GroupMatchSummary, CompletionStatus } from '@/app/predictions/summary/page'

interface Props {
  groupMatchSummaries: GroupMatchSummary[]
  knockoutResolvedMatches: ResolvedMatch[]
  awardPrediction: AwardPrediction | null
  completion: CompletionStatus
  advancingTeams: TeamStanding[]
  isLocked: boolean
  viewOnly?: boolean       // suppress edit links and completion banner
  subjectName?: string     // whose predictions these are (for viewOnly mode)
}

// ─── Collapsible section ──────────────────────────────────────────────────────

function Section({
  title,
  badge,
  badgeOk,
  children,
  defaultOpen = false,
}: {
  title: string
  badge: string
  badgeOk: boolean
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-card bg-bg-card border border-border-subtle overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-bg-card-hover transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className={`text-sm font-medium ${badgeOk ? 'text-green-400' : 'text-amber-400'}`}>
            {badgeOk ? '✅' : '⚠'}
          </span>
          <span className="font-semibold text-fg-primary">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded font-mono ${badgeOk ? 'bg-green-900/40 text-green-400' : 'bg-amber-900/40 text-amber-400'}`}>
            {badge}
          </span>
          <span className="text-fg-muted text-sm">{open ? '▲' : '▼'}</span>
        </div>
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-border-subtle">
          {children}
        </div>
      )}
    </div>
  )
}

// ─── Section 1: Group Predictions ─────────────────────────────────────────────

function GroupPredictionsSection({
  summaries,
  viewOnly,
  groupCount,
}: {
  summaries: GroupMatchSummary[]
  viewOnly?: boolean
  groupCount?: number
}) {
  if (viewOnly && groupCount === 0) {
    return (
      <p className="mt-4 text-sm text-fg-muted">
        This user hasn&apos;t submitted any group stage predictions yet.
      </p>
    )
  }

  const byGroup = new Map<string, GroupMatchSummary[]>()
  for (const m of summaries) {
    if (!byGroup.has(m.group_letter)) byGroup.set(m.group_letter, [])
    byGroup.get(m.group_letter)!.push(m)
  }

  return (
    <div className="mt-4 space-y-4">
      {viewOnly && groupCount !== undefined && groupCount > 0 && groupCount < 72 && (
        <p className="text-sm text-amber-400">{groupCount} / 72 group stage predictions submitted.</p>
      )}
      {Array.from(byGroup.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([letter, matches]) => (
        <div key={letter}>
          <div className="text-xs font-bold text-fg-muted uppercase mb-2">Group {letter}</div>
          <div className="space-y-1">
            {matches.map(m => (
              <div
                key={m.match_number}
                className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${m.home_score === null ? 'text-fg-muted' : 'text-fg-secondary'}`}
              >
                <span className="flex-1 flex justify-end">
                  <TeamBadge name={m.home_name} abbreviation={m.home_code} size="sm" />
                </span>
                <span className="flex flex-col items-center mx-1 shrink-0 w-20 gap-0.5">
                  <MatchTime iso={m.scheduled_at} className="text-xs text-fg-muted leading-none" />
                  <span className="font-mono tabular-nums text-fg-primary text-xs">
                    {m.home_score !== null ? `${m.home_score} — ${m.away_score}` : 'vs'}
                  </span>
                </span>
                <span className="flex-1">
                  <TeamBadge name={m.away_name} abbreviation={m.away_code} size="sm" />
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Section 2: Qualifying Teams ─────────────────────────────────────────────

function QualifyingTeamsSection({ advancingTeams }: { advancingTeams: TeamStanding[] }) {
  const winners = advancingTeams.filter(t => t.position === 1)
  const runnersUp = advancingTeams.filter(t => t.position === 2)
  const thirds = advancingTeams.filter(t => t.position === 3)

  const TeamGrid = ({ teams, label, borderCls }: { teams: TeamStanding[]; label: string; borderCls: string }) => (
    <div className="mb-4">
      <div className="text-xs text-fg-muted font-medium mb-2">{label}</div>
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
        {teams.map(t => (
          <div key={t.team_id} className={`rounded border ${borderCls} px-2 py-1.5 flex items-center justify-center`}>
            <TeamBadge name={t.team_name} abbreviation={t.short_code} size="sm" />
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="mt-4">
      <TeamGrid teams={winners} label="Group Winners (12)" borderCls="border-green-700 bg-green-900/15" />
      <TeamGrid teams={runnersUp} label="Runners-up (12)" borderCls="border-green-800 bg-green-900/10" />
      <TeamGrid teams={thirds} label="Best Third-place (8)" borderCls="border-amber-700 bg-amber-900/15" />
    </div>
  )
}

// ─── Section 3: Knockout Bracket ──────────────────────────────────────────────

function KnockoutSection({
  resolvedMatches,
  viewOnly,
  knockoutCount,
}: {
  resolvedMatches: ResolvedMatch[]
  viewOnly?: boolean
  knockoutCount?: number
}) {
  if (resolvedMatches.length === 0) {
    return (
      <p className="mt-4 text-sm text-fg-muted">
        {viewOnly
          ? "This user hasn't started their knockout bracket yet."
          : 'Complete your group stage predictions to see the bracket.'}
      </p>
    )
  }

  const stagesForTab = (tab: string): ResolvedMatch[] => {
    if (tab === 'final_and_third') {
      const final = resolvedMatches.filter(m => m.stage === 'final')
      const third = resolvedMatches.filter(m => m.stage === 'third_place')
      return [...final, ...third]
    }
    return resolvedMatches.filter(m => m.stage === tab)
  }

  return (
    <div className="mt-4 space-y-6">
      {viewOnly && knockoutCount !== undefined && knockoutCount > 0 && knockoutCount < 32 && (
        <p className="text-sm text-amber-400">{knockoutCount} / 32 knockout picks made.</p>
      )}
      {STAGE_ORDER.map(stage => {
        const matches = stagesForTab(stage)
        return (
          <div key={stage}>
            <div className="text-xs font-bold text-fg-muted uppercase mb-2">{STAGE_LABELS[stage]}</div>
            <div className="space-y-1.5">
              {matches.map(m => {
                const pickedA = m.user_pick_team_id !== null && m.user_pick_team_id === m.team_a?.team_id
                const pickedB = m.user_pick_team_id !== null && m.user_pick_team_id === m.team_b?.team_id
                const noPick = m.user_pick_team_id === null

                return (
                  <div key={m.match_number} className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-bg-elevated/40">
                    <span className="text-xs text-fg-muted w-24 shrink-0">{m.label}</span>
                    <span className={pickedA ? 'opacity-100' : 'opacity-50'}>
                      {m.team_a ? <TeamBadge name={m.team_a.team_name} abbreviation={m.team_a.short_code} size="sm" /> : <span className="text-xs text-fg-muted">TBD</span>}
                    </span>
                    {pickedA && <span className="text-accent text-xs">✓</span>}
                    <span className="text-fg-muted text-xs">vs</span>
                    {pickedB && <span className="text-accent text-xs">✓</span>}
                    <span className={pickedB ? 'opacity-100' : 'opacity-50'}>
                      {m.team_b ? <TeamBadge name={m.team_b.team_name} abbreviation={m.team_b.short_code} size="sm" /> : <span className="text-xs text-fg-muted">TBD</span>}
                    </span>
                    {noPick && <span className="ml-auto text-xs text-fg-muted">no pick</span>}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Section 4: Awards ───────────────────────────────────────────────────────

function AwardsSection({ award, viewOnly }: { award: AwardPrediction | null; viewOnly?: boolean }) {
  const allEmpty = !award || (
    !award.golden_boot_player?.trim() &&
    award.golden_boot_goals == null &&
    !award.golden_ball_player?.trim() &&
    !award.golden_glove_player?.trim() &&
    !award.best_young_player?.trim()
  )
  if (viewOnly && allEmpty) {
    return (
      <p className="mt-4 text-sm text-fg-muted">
        This user hasn&apos;t submitted any award predictions yet.
      </p>
    )
  }

  const rows = [
    { label: 'Golden Boot (player)', value: award?.golden_boot_player },
    { label: 'Golden Boot (goals)', value: award?.golden_boot_goals?.toString() },
    { label: 'Golden Ball', value: award?.golden_ball_player },
    { label: 'Golden Glove', value: award?.golden_glove_player },
    { label: 'Best Young Player', value: award?.best_young_player },
  ]

  return (
    <div className="mt-4 space-y-2">
      {rows.map(({ label, value }) => (
        <div key={label} className="flex items-center justify-between text-sm px-3 py-2.5 rounded-lg bg-bg-elevated/40">
          <span className="text-fg-muted">{label}</span>
          <span className={value ? 'text-fg-primary font-medium' : 'text-fg-muted italic'}>
            {value || '(not predicted)'}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PredictionsSummary({
  groupMatchSummaries,
  knockoutResolvedMatches,
  awardPrediction,
  completion,
  advancingTeams,
  isLocked,
  viewOnly = false,
  subjectName,
}: Props) {
  const { groupComplete, knockoutComplete, awardsComplete, allComplete, groupCount, knockoutCount, awardsCount } = completion

  const deadlineStr = PREDICTION_DEADLINE.toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'UTC', timeZoneName: 'short',
  })

  return (
    <div className="max-w-3xl mx-auto px-4 pb-16">

      {/* ── Completion banner (own predictions only) ── */}
      {!viewOnly && (
        allComplete
          ? (
            <div className="mb-6 rounded-card bg-green-900/20 border border-green-700/50 px-5 py-4 flex items-start gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <p className="font-semibold text-green-300">All predictions submitted!</p>
                <p className="text-sm text-fg-muted mt-0.5">
                  {isLocked
                    ? 'Predictions are locked. Good luck!'
                    : `Locked at deadline: ${deadlineStr}`}
                </p>
              </div>
            </div>
          )
          : (
            <div className="mb-6 rounded-card bg-amber-900/10 border border-amber-700/50 px-5 py-4">
              <p className="font-semibold text-amber-300 mb-2">⚠ Incomplete predictions</p>
              <ul className="space-y-1 text-sm">
                {!groupComplete && (
                  <li className="flex items-center justify-between">
                    <span className="text-fg-muted">Group Stage: {groupCount}/72 predictions</span>
                    <Link href="/predictions" className="text-accent hover:underline text-xs">Fix →</Link>
                  </li>
                )}
                {!knockoutComplete && groupComplete && (
                  <li className="flex items-center justify-between">
                    <span className="text-fg-muted">Knockout Bracket: {knockoutCount}/32 picks</span>
                    <Link href="/predictions/knockout" className="text-accent hover:underline text-xs">Fix →</Link>
                  </li>
                )}
                {!awardsComplete && knockoutComplete && groupComplete && (
                  <li className="flex items-center justify-between">
                    <span className="text-fg-muted">Awards: {awardsCount}/5 fields</span>
                    <Link href="/predictions/awards" className="text-accent hover:underline text-xs">Fix →</Link>
                  </li>
                )}
              </ul>
            </div>
          )
      )}

      {/* ── viewOnly status bar ── */}
      {viewOnly && (
        <div className="mb-5 text-sm text-fg-muted">
          {subjectName && <span className="font-medium text-fg-primary">{subjectName}</span>}
          {subjectName && <span> has submitted: </span>}
          <span className={groupCount === 0 ? 'text-fg-muted' : groupComplete ? 'text-green-400' : 'text-amber-400'}>
            {groupCount}/72 group stage
          </span>
          <span className="text-border-subtle"> · </span>
          <span className={knockoutCount === 0 ? 'text-fg-muted' : knockoutComplete ? 'text-green-400' : 'text-amber-400'}>
            {knockoutCount}/32 knockout
          </span>
          <span className="text-border-subtle"> · </span>
          <span className={awardsCount === 0 ? 'text-fg-muted' : awardsComplete ? 'text-green-400' : 'text-amber-400'}>
            {awardsCount}/5 awards
          </span>
        </div>
      )}

      {/* ── Sections ── */}
      <div className="space-y-3">

        <Section
          title="Group Stage Predictions"
          badge={`${groupCount}/72`}
          badgeOk={groupComplete}
        >
          <GroupPredictionsSection summaries={groupMatchSummaries} viewOnly={viewOnly} groupCount={groupCount} />
        </Section>

        {groupComplete && (
          <Section
            title="Qualifying Teams (Group Simulation)"
            badge={`32 teams`}
            badgeOk={true}
          >
            <QualifyingTeamsSection advancingTeams={advancingTeams} />
          </Section>
        )}

        <Section
          title="Knockout Bracket"
          badge={`${knockoutCount}/32`}
          badgeOk={knockoutComplete}
        >
          <KnockoutSection resolvedMatches={knockoutResolvedMatches} viewOnly={viewOnly} knockoutCount={knockoutCount} />
        </Section>

        <Section
          title="Tournament Awards"
          badge={`${awardsCount}/5`}
          badgeOk={awardsComplete}
        >
          <AwardsSection award={awardPrediction} viewOnly={viewOnly} />
        </Section>

      </div>

      {/* ── Bottom edit links (own predictions only) ── */}
      {!viewOnly && (
        <div className="mt-8 pt-6 border-t border-border-subtle flex flex-col sm:flex-row gap-2 items-center justify-center flex-wrap">
          {!groupComplete && (
            <Link href="/predictions" className="rounded-lg border border-dashed border-border-dashed text-fg-muted hover:text-fg-primary px-4 py-2 text-sm font-semibold uppercase tracking-wider transition-colors">
              Edit Group Predictions →
            </Link>
          )}
          {groupComplete && !knockoutComplete && (
            <Link href="/predictions/knockout" className="rounded-lg border border-dashed border-border-dashed text-fg-muted hover:text-fg-primary px-4 py-2 text-sm font-semibold uppercase tracking-wider transition-colors">
              Edit Knockout Bracket →
            </Link>
          )}
          {groupComplete && knockoutComplete && !awardsComplete && (
            <Link href="/predictions/awards" className="rounded-lg bg-accent text-accent-fg hover:bg-accent-hover px-4 py-2 text-sm font-semibold uppercase tracking-wider transition-colors">
              Complete Awards →
            </Link>
          )}
          <Link href="/dashboard" className="rounded-lg border border-dashed border-border-dashed text-fg-muted hover:text-fg-primary px-4 py-2 text-sm font-semibold uppercase tracking-wider transition-colors">
            ← Home
          </Link>
        </div>
      )}

    </div>
  )
}
