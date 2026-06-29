'use client'

import { BracketView } from './BracketView'
import type { ResolvedMatch } from '@/lib/bracket'

interface Props {
  resolvedMatches: ResolvedMatch[]
  // Serializable maps: match_number → value (or null)
  winnerMap: Record<number, number | null>
  kickoffMap: Record<number, string | null>
  scoreMap?: Record<number, { home: number | null; away: number | null } | null>
}

export function TournamentBracketView({ resolvedMatches, winnerMap, kickoffMap, scoreMap }: Props) {
  return (
    <BracketView
      resolvedMatches={resolvedMatches}
      matchProps={(mn) => ({
        actualWinnerId: winnerMap[mn] ?? undefined,
        kickoffIso: kickoffMap[mn] ?? null,
        score: scoreMap?.[mn] ?? null,
      })}
    />
  )
}
