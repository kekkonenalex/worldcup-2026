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
  onClick,
}: {
  team: TeamStanding | null
  picked: boolean
  winner: boolean
  loser: boolean
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
      {picked && <span className="ml-auto text-accent text-[10px] font-bold leading-none">✓</span>}
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
}: BracketMatchProps) {
  const effectivePick = pickedWinnerId ?? match.user_pick_team_id
  const hasResult = actualWinnerId != null

  const aWins = hasResult && match.team_a?.team_id === actualWinnerId
  const bWins = hasResult && match.team_b?.team_id === actualWinnerId

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
          onClick={canPick && match.team_a ? () => onPick!(match.team_a!.team_id) : undefined}
        />
        <div className="mx-2.5 h-px bg-border-subtle" />
        <TeamRow
          team={match.team_b}
          picked={effectivePick != null && match.team_b?.team_id === effectivePick}
          winner={bWins}
          loser={hasResult && !bWins && match.team_b != null}
          onClick={canPick && match.team_b ? () => onPick!(match.team_b!.team_id) : undefined}
        />
      </div>
    </div>
  )
}
