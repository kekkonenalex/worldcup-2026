'use client'

import { useState, useEffect } from 'react'
import { TeamBadge } from '@/components/ui/TeamBadge'
import type { ResolvedMatch } from '@/lib/bracket'
import type { TeamStanding } from '@/lib/simulation'

export type BracketMatchProps = {
  match: ResolvedMatch
  pickedWinnerId?: number | null
  actualWinnerId?: number | null
  mode?: 'predict' | 'view'
  onPick?: (teamId: number) => void
  disabled?: boolean
  kickoffIso?: string | null
  // Final-time goals for the played match (null until a result is recorded).
  score?: { home: number | null; away: number | null } | null
}

function useKickoffLabel(iso: string | null | undefined): string {
  const [label, setLabel] = useState('')
  useEffect(() => {
    if (!iso) return
    setLabel(
      new Intl.DateTimeFormat('en-GB', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
      }).format(new Date(iso))
    )
  }, [iso])
  return label
}

const STAGE_LABEL: Record<string, string> = {
  r32: 'R32', r16: 'R16', qf: 'QF', sf: 'SF', final: 'Final', third_place: '3rd Place',
}

function TeamRow({
  team,
  picked,
  winner,
  loser,
  goals,
  penaltyWinner,
  onClick,
}: {
  team: TeamStanding | null
  picked: boolean
  winner: boolean
  loser: boolean
  goals?: number | null
  penaltyWinner?: boolean
  onClick?: () => void
}) {
  const classes = [
    'flex items-center gap-2 px-2.5 py-[5px] transition-colors w-full text-left',
    winner ? 'bg-accent/10' : '',
    loser ? 'opacity-40' : '',
    onClick && team ? 'hover:bg-bg-elevated/80 cursor-pointer' : '',
  ].filter(Boolean).join(' ')

  const inner = team ? (
    <>
      <TeamBadge name={team.team_name} abbreviation={team.short_code} size="sm" />
      <span className="ml-auto flex items-center gap-1.5 leading-none">
        {picked && <span className="text-accent text-[10px] font-bold">✓</span>}
        {penaltyWinner && <span className="text-[9px] text-fg-muted font-semibold">(P)</span>}
        {goals != null && (
          <span className={`tabular-nums text-[12px] font-bold ${winner ? 'text-accent' : 'text-fg-secondary'}`}>
            {goals}
          </span>
        )}
      </span>
    </>
  ) : (
    <span className="text-fg-muted text-[11px] italic leading-none">TBD</span>
  )

  if (onClick && team) {
    return (
      <button type="button" onClick={onClick} className={classes}>
        {inner}
      </button>
    )
  }

  return <div className={classes}>{inner}</div>
}

export function BracketMatch({
  match,
  pickedWinnerId,
  actualWinnerId,
  mode = 'view',
  onPick,
  disabled = false,
  kickoffIso,
  score,
}: BracketMatchProps) {
  const effectivePick = pickedWinnerId ?? match.user_pick_team_id
  const hasResult = actualWinnerId != null

  const aWins = hasResult && match.team_a?.team_id === actualWinnerId
  const bWins = hasResult && match.team_b?.team_id === actualWinnerId

  // Match decided on penalties: regulation/ET ended level but a winner is set.
  const hasScore = score != null && score.home != null && score.away != null
  const decidedOnPens = hasResult && hasScore && score!.home === score!.away

  const canPick = mode === 'predict' && !disabled && !hasResult
  const kickoffLabel = useKickoffLabel(kickoffIso)

  return (
    <div className="w-[200px] rounded-lg border border-border-subtle bg-bg-card overflow-hidden select-none">
      <div className="px-2.5 pt-[3px] pb-[3px] border-b border-border-subtle bg-bg-elevated">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-fg-muted">
            {STAGE_LABEL[match.stage] ?? match.stage}
          </span>
          <span className="text-[10px] text-fg-muted opacity-60">#{match.match_number}</span>
        </div>
        {kickoffLabel && (
          <div className="text-[10px] text-fg-muted opacity-70 mt-0.5 tabular-nums">{kickoffLabel}</div>
        )}
      </div>
      <div className="py-0.5">
        <TeamRow
          team={match.team_a}
          picked={effectivePick != null && match.team_a?.team_id === effectivePick}
          winner={aWins}
          loser={hasResult && !aWins && match.team_a != null}
          goals={hasScore ? score!.home : null}
          penaltyWinner={decidedOnPens && aWins}
          onClick={canPick && match.team_a ? () => onPick!(match.team_a!.team_id) : undefined}
        />
        <div className="mx-2.5 h-px bg-border-subtle" />
        <TeamRow
          team={match.team_b}
          picked={effectivePick != null && match.team_b?.team_id === effectivePick}
          winner={bWins}
          loser={hasResult && !bWins && match.team_b != null}
          goals={hasScore ? score!.away : null}
          penaltyWinner={decidedOnPens && bWins}
          onClick={canPick && match.team_b ? () => onPick!(match.team_b!.team_id) : undefined}
        />
      </div>
    </div>
  )
}
