'use client'

import Link from 'next/link'
import type { TeamStanding, ThirdPlaceResult } from '@/lib/simulation'

interface Props {
  groupStandings: TeamStanding[][]
  thirdPlaceResult: ThirdPlaceResult
  advancingTeams: TeamStanding[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rowBg(position: number): string {
  switch (position) {
    case 1: return 'bg-green-900/30'
    case 2: return 'bg-green-900/15'
    case 3: return 'bg-yellow-900/20'
    default: return 'bg-gray-800/20'
  }
}

function qualBorder(position: number): string {
  switch (position) {
    case 1: return 'border-green-500 bg-green-900/20'
    case 2: return 'border-green-700 bg-green-900/10'
    default: return 'border-yellow-600 bg-yellow-900/15'
  }
}

// ─── Group card ───────────────────────────────────────────────────────────────

function GroupCard({ standings }: { standings: TeamStanding[] }) {
  const letter = standings[0]?.group_letter ?? '?'
  return (
    <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
      <div className="px-3 py-2 bg-gray-800 border-b border-gray-700">
        <span className="font-bold text-sm">Group {letter}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-500 border-b border-gray-800">
              <th className="px-2 py-1.5 text-left w-5 font-normal">#</th>
              <th className="px-2 py-1.5 text-left font-normal">Team</th>
              <th className="px-1 py-1.5 text-center font-normal w-6">P</th>
              <th className="px-1 py-1.5 text-center font-normal w-6">W</th>
              <th className="px-1 py-1.5 text-center font-normal w-6">D</th>
              <th className="px-1 py-1.5 text-center font-normal w-6">L</th>
              <th className="px-1 py-1.5 text-center font-normal w-7">GF</th>
              <th className="px-1 py-1.5 text-center font-normal w-7">GA</th>
              <th className="px-1 py-1.5 text-center font-normal w-7">GD</th>
              <th className="px-1 py-1.5 text-center font-bold w-8">Pts</th>
            </tr>
          </thead>
          <tbody>
            {standings.map(s => (
              <tr key={s.team_id} className={`border-b border-gray-800/50 last:border-0 ${rowBg(s.position)}`}>
                <td className="px-2 py-1.5 text-center text-gray-500">{s.position}</td>
                <td className="px-2 py-1.5">
                  <span title={s.team_name} className="cursor-default">
                    {s.flag_emoji} {s.short_code}
                  </span>
                </td>
                <td className="px-1 py-1.5 text-center text-gray-300">{s.played}</td>
                <td className="px-1 py-1.5 text-center text-gray-300">{s.won}</td>
                <td className="px-1 py-1.5 text-center text-gray-300">{s.drawn}</td>
                <td className="px-1 py-1.5 text-center text-gray-300">{s.lost}</td>
                <td className="px-1 py-1.5 text-center text-gray-300">{s.goals_for}</td>
                <td className="px-1 py-1.5 text-center text-gray-300">{s.goals_against}</td>
                <td className={`px-1 py-1.5 text-center ${s.goal_difference > 0 ? 'text-green-400' : s.goal_difference < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                  {s.goal_difference > 0 ? `+${s.goal_difference}` : s.goal_difference}
                </td>
                <td className="px-1 py-1.5 text-center font-bold text-white">{s.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function StandingsReview({ groupStandings, thirdPlaceResult, advancingTeams }: Props) {
  const allThirds = [...thirdPlaceResult.advancing, ...thirdPlaceResult.eliminated]
  const advancingIds = new Set(thirdPlaceResult.advancing.map(t => t.team_id))

  return (
    <div className="max-w-5xl mx-auto px-4 pb-24">

      {/* ── Section 1: Group standings grid ── */}
      <section className="mb-12">
        <h2 className="text-xl font-bold mb-4">Group Standings</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groupStandings.map(standings => (
            <GroupCard key={standings[0]?.group_letter} standings={standings} />
          ))}
        </div>
      </section>

      {/* ── Section 2: Third-place ranking ── */}
      <section className="mb-12">
        <h2 className="text-xl font-bold mb-1">Third-Place Team Ranking</h2>
        <p className="text-gray-400 text-sm mb-4">The top 8 advance to the Round of 32.</p>
        <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs border-b border-gray-700">
                  <th className="px-3 py-2.5 text-left font-normal w-10">Rank</th>
                  <th className="px-3 py-2.5 text-left font-normal">Team</th>
                  <th className="px-3 py-2.5 text-center font-normal w-14">Group</th>
                  <th className="px-3 py-2.5 text-center font-normal w-12">Pts</th>
                  <th className="px-3 py-2.5 text-center font-normal w-12">GD</th>
                  <th className="px-3 py-2.5 text-center font-normal w-12">GF</th>
                  <th className="px-3 py-2.5 text-center font-normal w-28">Status</th>
                </tr>
              </thead>
              <tbody>
                {allThirds.map((team, idx) => {
                  const rank = idx + 1
                  const advances = advancingIds.has(team.team_id)
                  return (
                    <tr
                      key={team.team_id}
                      className={`border-b border-gray-800/50 last:border-0 ${advances ? 'bg-green-900/20' : 'bg-red-900/10'}`}
                    >
                      <td className="px-3 py-2.5 text-center text-gray-400 tabular-nums">{rank}</td>
                      <td className="px-3 py-2.5">
                        <span className="mr-1.5">{team.flag_emoji}</span>
                        {team.team_name}
                      </td>
                      <td className="px-3 py-2.5 text-center text-gray-400">{team.group_letter}</td>
                      <td className="px-3 py-2.5 text-center font-bold">{team.points}</td>
                      <td className={`px-3 py-2.5 text-center ${team.goal_difference > 0 ? 'text-green-400' : team.goal_difference < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                        {team.goal_difference > 0 ? `+${team.goal_difference}` : team.goal_difference}
                      </td>
                      <td className="px-3 py-2.5 text-center text-gray-300">{team.goals_for}</td>
                      <td className="px-3 py-2.5 text-center">
                        {advances
                          ? <span className="text-green-400 font-medium">✓ Advances</span>
                          : <span className="text-red-400">✗ Eliminated</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Section 3: 32 qualifying teams ── */}
      <section className="mb-12">
        <h2 className="text-xl font-bold mb-1">32 Teams Advance to the Round of 32</h2>
        <p className="text-gray-400 text-sm mb-4">All group winners, runners-up, and the 8 best third-place teams.</p>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 mb-4">
          {advancingTeams.map(team => (
            <div
              key={`${team.team_id}-${team.group_letter}`}
              className={`rounded-lg border p-2 text-center ${qualBorder(team.position)}`}
            >
              <div className="text-xl">{team.flag_emoji}</div>
              <div className="text-xs font-medium mt-0.5 leading-tight">{team.team_name}</div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded border border-green-500 bg-green-900/20 inline-block" />
            Group winner
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded border border-green-700 bg-green-900/10 inline-block" />
            Runner-up
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded border border-yellow-600 bg-yellow-900/15 inline-block" />
            Best third-place
          </span>
        </div>
      </section>

      {/* ── Action buttons ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-gray-800">
        <Link
          href="/predictions"
          className="w-full sm:w-auto text-center rounded-lg border border-gray-600 hover:border-gray-400 px-6 py-2.5 font-medium text-gray-300 hover:text-white transition-colors"
        >
          ← Adjust my predictions
        </Link>
        <Link
          href="/predictions/knockout"
          className="w-full sm:w-auto text-center rounded-lg bg-blue-600 hover:bg-blue-500 px-6 py-2.5 font-semibold transition-colors"
        >
          Continue to Knockout Bracket →
        </Link>
      </div>
    </div>
  )
}
