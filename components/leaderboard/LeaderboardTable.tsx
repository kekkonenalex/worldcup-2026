'use client'

import { useState } from 'react'
import Link from 'next/link'

// Serializable breakdown — Maps stripped so this crosses server→client safely.
export type LeaderboardBreakdown = {
  groupTotal: number
  knockoutTotal: number
  topFourBonus: number
  awardsTotal: number
  awardsBreakdown: {
    boot: number
    bootTally: number
    ball: number
    glove: number
    young: number
  }
  total: number
  tiebreakers: {
    gold: 0 | 1
    silver: 0 | 1
    bronze: 0 | 1
    goldenBoot: 0 | 1
    groupPoints: number
    r32Correct: number
  }
}

export type LeaderboardRow = {
  userId: string
  displayName: string
  rank: number
  breakdown: LeaderboardBreakdown
}

interface Props {
  rows: LeaderboardRow[]
  emptyMessage?: string
}

function TbCell({ label, value }: { label: string; value: string | number }) {
  return (
    <span className="inline-flex flex-col items-center text-xs">
      <span className="text-gray-600 leading-none">{label}</span>
      <span className="text-gray-300 font-medium leading-tight">{value}</span>
    </span>
  )
}

function ExpandedBreakdown({ b }: { b: LeaderboardBreakdown }) {
  return (
    <div className="border-t border-gray-800 bg-gray-900/50 px-4 py-3 text-xs space-y-3">

      {/* Score rows */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="rounded-lg bg-gray-800/60 px-3 py-2">
          <div className="text-gray-500 mb-0.5">Group stage</div>
          <div className="text-white font-semibold tabular-nums">{b.groupTotal} pts</div>
        </div>
        <div className="rounded-lg bg-gray-800/60 px-3 py-2">
          <div className="text-gray-500 mb-0.5">Knockout</div>
          <div className="text-white font-semibold tabular-nums">{b.knockoutTotal} pts</div>
        </div>
        <div className="rounded-lg bg-gray-800/60 px-3 py-2">
          <div className="text-gray-500 mb-0.5">Top-4 bonus</div>
          <div className="text-yellow-400 font-semibold tabular-nums">+{b.topFourBonus} pts</div>
        </div>
        <div className="rounded-lg bg-gray-800/60 px-3 py-2">
          <div className="text-gray-500 mb-0.5">Awards</div>
          <div className="text-white font-semibold tabular-nums">{b.awardsTotal} pts</div>
        </div>
      </div>

      {/* Awards sub-breakdown */}
      <div>
        <div className="text-gray-600 mb-1.5 font-medium">Awards breakdown</div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-gray-400">
          <span>Golden Boot player <span className="text-white">{b.awardsBreakdown.boot}</span></span>
          <span>Boot goals <span className="text-white">{b.awardsBreakdown.bootTally}</span></span>
          <span>Golden Ball <span className="text-white">{b.awardsBreakdown.ball}</span></span>
          <span>Golden Glove <span className="text-white">{b.awardsBreakdown.glove}</span></span>
          <span>Young Player <span className="text-white">{b.awardsBreakdown.young}</span></span>
        </div>
      </div>

      {/* Tiebreakers */}
      <div>
        <div className="text-gray-600 mb-1.5 font-medium">Tiebreakers</div>
        <div className="flex flex-wrap gap-3">
          <TbCell label="Champion" value={b.tiebreakers.gold ? '✓' : '✗'} />
          <TbCell label="Runner-up" value={b.tiebreakers.silver ? '✓' : '✗'} />
          <TbCell label="3rd place" value={b.tiebreakers.bronze ? '✓' : '✗'} />
          <TbCell label="Boot player" value={b.tiebreakers.goldenBoot ? '✓' : '✗'} />
          <TbCell label="Group pts" value={b.tiebreakers.groupPoints} />
          <TbCell label="R32 correct" value={b.tiebreakers.r32Correct} />
        </div>
      </div>

    </div>
  )
}

function LeaderboardRow({ row }: { row: LeaderboardRow }) {
  const [expanded, setExpanded] = useState(false)
  const allZero = row.breakdown.total === 0

  return (
    <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-800/50 transition-colors text-left"
      >
        {/* Rank */}
        <span className="w-8 text-center shrink-0 text-sm font-bold text-gray-500 tabular-nums">
          #{row.rank}
        </span>

        {/* Name */}
        <Link
          href={`/users/${row.userId}`}
          onClick={e => e.stopPropagation()}
          className="flex-1 text-sm font-medium text-white hover:text-blue-400 transition-colors truncate"
        >
          {row.displayName}
        </Link>

        {/* Score */}
        <span className={`text-sm font-bold tabular-nums shrink-0 ${allZero ? 'text-gray-600' : 'text-white'}`}>
          {row.breakdown.total} pts
        </span>

        {/* Expand indicator */}
        <span className="text-gray-600 text-xs shrink-0 ml-1">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && <ExpandedBreakdown b={row.breakdown} />}
    </div>
  )
}

export default function LeaderboardTable({ rows, emptyMessage }: Props) {
  if (rows.length === 0) {
    return (
      <p className="text-gray-500 text-sm text-center py-8">
        {emptyMessage ?? 'No participants yet.'}
      </p>
    )
  }

  const allZero = rows.every(r => r.breakdown.total === 0)

  // Pre-tournament: sort alphabetically, keep rank numbers from data (all will be 1)
  const displayRows = allZero
    ? [...rows].sort((a, b) => a.displayName.localeCompare(b.displayName))
    : rows

  return (
    <div className="space-y-2">
      {allZero && (
        <div className="rounded-lg bg-gray-900 border border-gray-800 px-4 py-3 text-sm text-gray-400 mb-4">
          No match results yet — scores will appear as games are played.
        </div>
      )}
      {displayRows.map(row => (
        <LeaderboardRow key={row.userId} row={row} />
      ))}
    </div>
  )
}
