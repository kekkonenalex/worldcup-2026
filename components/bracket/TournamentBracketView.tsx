'use client'

import { BracketView } from './BracketView'
import type { ResolvedMatch } from '@/lib/bracket'

interface Props {
  resolvedMatches: ResolvedMatch[]
  // Serializable winner map: match_number → winner_team_id (or null if no result yet)
  winnerMap: Record<number, number | null>
}

export function TournamentBracketView({ resolvedMatches, winnerMap }: Props) {
  return (
    <BracketView
      resolvedMatches={resolvedMatches}
      matchProps={(mn) => ({ actualWinnerId: winnerMap[mn] ?? undefined })}
    />
  )
}
