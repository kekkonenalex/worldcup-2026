'use client'

import { useState } from 'react'
import Link from 'next/link'
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
    <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className={`text-sm font-medium ${badgeOk ? 'text-green-400' : 'text-yellow-400'}`}>
            {badgeOk ? '✅' : '⚠'}
          </span>
          <span className="font-semibold text-white">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded font-mono ${badgeOk ? 'bg-green-900/40 text-green-400' : 'bg-yellow-900/40 text-yellow-400'}`}>
            {badge}
          </span>
          <span className="text-gray-500 text-sm">{open ? '▲' : '▼'}</span>
        </div>
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-gray-800">
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
      <p className="mt-4 text-sm text-gray-500">
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
        <p className="text-sm text-yellow-400">{groupCount} / 72 group stage predictions submitted.</p>
      )}
      {Array.from(byGroup.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([letter, matches]) => (
        <div key={letter}>
          <div className="text-xs font-bold text-gray-500 uppercase mb-2">Group {letter}</div>
          <div className="space-y-1">
            {matches.map(m => (
              <div
                key={m.match_number}
                className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${m.home_score === null ? 'text-gray-600' : 'text-gray-200'}`}
              >
                <span className="w-5 text-center shrink-0">{m.home_flag}</span>
                <span className="w-8 text-xs text-gray-500 shrink-0">{m.home_code}</span>
                <span className="flex-1 text-right text-gray-400 text-xs">{m.home_name}</span>
                <span className="font-mono tabular-nums text-white mx-1 shrink-0 w-12 text-center">
                  {m.home_score !== null ? `${m.home_score} — ${m.away_score}` : '— vs —'}
                </span>
                <span className="flex-1 text-left text-gray-400 text-xs">{m.away_name}</span>
                <span className="w-8 text-xs text-gray-500 shrink-0 text-right">{m.away_code}</span>
                <span className="w-5 text-center shrink-0">{m.away_flag}</span>
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
      <div className="text-xs text-gray-500 font-medium mb-2">{label}</div>
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
        {teams.map(t => (
          <div key={t.team_id} className={`rounded border ${borderCls} px-2 py-1.5 text-center`}>
            <div className="text-base">{t.flag_emoji}</div>
            <div className="text-xs font-medium text-gray-300 leading-tight">{t.short_code}</div>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="mt-4">
      <TeamGrid teams={winners} label="Group Winners (12)" borderCls="border-green-700 bg-green-900/15" />
      <TeamGrid teams={runnersUp} label="Runners-up (12)" borderCls="border-green-800 bg-green-900/10" />
      <TeamGrid teams={thirds} label="Best Third-place (8)" borderCls="border-yellow-700 bg-yellow-900/15" />
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
      <p className="mt-4 text-sm text-gray-500">
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
        <p className="text-sm text-yellow-400">{knockoutCount} / 32 knockout picks made.</p>
      )}
      {STAGE_ORDER.map(stage => {
        const matches = stagesForTab(stage)
        return (
          <div key={stage}>
            <div className="text-xs font-bold text-gray-500 uppercase mb-2">{STAGE_LABELS[stage]}</div>
            <div className="space-y-1.5">
              {matches.map(m => {
                const pickedA = m.user_pick_team_id !== null && m.user_pick_team_id === m.team_a?.team_id
                const pickedB = m.user_pick_team_id !== null && m.user_pick_team_id === m.team_b?.team_id
                const noPick = m.user_pick_team_id === null

                return (
                  <div key={m.match_number} className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-gray-800/40">
                    <span className="text-xs text-gray-600 w-24 shrink-0">{m.label}</span>
                    <span className={pickedA ? 'text-green-400 font-semibold' : 'text-gray-400'}>
                      {m.team_a ? `${m.team_a.flag_emoji} ${m.team_a.short_code}` : 'TBD'}
                    </span>
                    {pickedA && <span className="text-green-500 text-xs">✓</span>}
                    <span className="text-gray-600 text-xs">vs</span>
                    {pickedB && <span className="text-green-500 text-xs">✓</span>}
                    <span className={pickedB ? 'text-green-400 font-semibold' : 'text-gray-400'}>
                      {m.team_b ? `${m.team_b.flag_emoji} ${m.team_b.short_code}` : 'TBD'}
                    </span>
                    {noPick && <span className="ml-auto text-xs text-gray-600">no pick</span>}
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
      <p className="mt-4 text-sm text-gray-500">
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
        <div key={label} className="flex items-center justify-between text-sm px-3 py-2.5 rounded-lg bg-gray-800/40">
          <span className="text-gray-400">{label}</span>
          <span className={value ? 'text-white font-medium' : 'text-gray-600 italic'}>
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
            <div className="mb-6 rounded-xl bg-green-900/25 border border-green-700 px-5 py-4 flex items-start gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <p className="font-semibold text-green-300">All predictions submitted!</p>
                <p className="text-sm text-gray-400 mt-0.5">
                  {isLocked
                    ? 'Predictions are locked. Good luck!'
                    : `Locked at deadline: ${deadlineStr}`}
                </p>
              </div>
            </div>
          )
          : (
            <div className="mb-6 rounded-xl bg-yellow-900/20 border border-yellow-700 px-5 py-4">
              <p className="font-semibold text-yellow-300 mb-2">⚠ Incomplete predictions</p>
              <ul className="space-y-1 text-sm">
                {!groupComplete && (
                  <li className="flex items-center justify-between">
                    <span className="text-gray-400">Group Stage: {groupCount}/72 predictions</span>
                    <Link href="/predictions" className="text-blue-400 hover:underline text-xs">Fix →</Link>
                  </li>
                )}
                {!knockoutComplete && groupComplete && (
                  <li className="flex items-center justify-between">
                    <span className="text-gray-400">Knockout Bracket: {knockoutCount}/32 picks</span>
                    <Link href="/predictions/knockout" className="text-blue-400 hover:underline text-xs">Fix →</Link>
                  </li>
                )}
                {!awardsComplete && knockoutComplete && groupComplete && (
                  <li className="flex items-center justify-between">
                    <span className="text-gray-400">Awards: {awardsCount}/5 fields</span>
                    <Link href="/predictions/awards" className="text-blue-400 hover:underline text-xs">Fix →</Link>
                  </li>
                )}
              </ul>
            </div>
          )
      )}

      {/* ── viewOnly status bar ── */}
      {viewOnly && (
        <div className="mb-5 text-sm text-gray-400">
          {subjectName && <span className="font-medium text-white">{subjectName}</span>}
          {subjectName && <span> has submitted: </span>}
          <span className={groupCount === 0 ? 'text-gray-600' : groupComplete ? 'text-green-400' : 'text-yellow-400'}>
            {groupCount}/72 group stage
          </span>
          <span className="text-gray-700"> · </span>
          <span className={knockoutCount === 0 ? 'text-gray-600' : knockoutComplete ? 'text-green-400' : 'text-yellow-400'}>
            {knockoutCount}/32 knockout
          </span>
          <span className="text-gray-700"> · </span>
          <span className={awardsCount === 0 ? 'text-gray-600' : awardsComplete ? 'text-green-400' : 'text-yellow-400'}>
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
        <div className="mt-8 pt-6 border-t border-gray-800 flex flex-col sm:flex-row gap-2 items-center justify-center flex-wrap">
          {!groupComplete && (
            <Link href="/predictions" className="rounded-lg border border-gray-600 hover:border-gray-400 px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors">
              Edit Group Predictions →
            </Link>
          )}
          {groupComplete && !knockoutComplete && (
            <Link href="/predictions/knockout" className="rounded-lg border border-gray-600 hover:border-gray-400 px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors">
              Edit Knockout Bracket →
            </Link>
          )}
          {groupComplete && knockoutComplete && !awardsComplete && (
            <Link href="/predictions/awards" className="rounded-lg border border-gray-600 hover:border-gray-400 px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors">
              Complete Awards →
            </Link>
          )}
          <Link href="/dashboard" className="rounded-lg border border-gray-700 hover:border-gray-500 px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors">
            ← Dashboard
          </Link>
        </div>
      )}

    </div>
  )
}
