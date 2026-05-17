'use client'

import React from 'react'
import { BracketMatch, type BracketMatchProps } from './BracketMatch'
import type { ResolvedMatch } from '@/lib/bracket'

// ─── Layout constants ─────────────────────────────────────────────────────────

const SLOT = 130   // vertical px per R32 slot
const CARD_H = 96  // match card height in px
const CARD_W = 200 // match card width in px
const COL_GAP = 28 // horizontal gap between adjacent columns
const COL_STEP = CARD_W + COL_GAP  // = 228

// Container dimensions
const TOTAL_W = 8 * COL_STEP + CARD_W  // 2024px
const TOTAL_H = 8 * SLOT               // 1040px

// 3rd place card sits below the Final
const THIRD_PLACE_TOP = 4 * SLOT - CARD_H / 2 + CARD_H + 20  // 540px

// ─── Match placement ──────────────────────────────────────────────────────────

type MatchPlacement = {
  matchNumber: number
  col: number      // 0-8
  r32Start: number // index of first R32 slot in this match's span
  depth: number    // 0=R32 1=R16 2=QF 3=SF (special handling for center col)
}

// cardTop: vertical position of card's top edge
function cardTop(r32Start: number, depth: number): number {
  const span = Math.pow(2, depth - 1)  // half-span in R32 slots (0.5 for depth=0)
  return (r32Start + span) * SLOT - CARD_H / 2
}

// colLeft: horizontal position of card's left edge
function colLeft(col: number): number {
  return col * COL_STEP
}

// Left half: R32 → R16 → QF → SF (cols 0 → 3)
const LEFT: MatchPlacement[] = [
  // R32 left (col 0)
  { matchNumber: 74, col: 0, r32Start: 0, depth: 0 },
  { matchNumber: 77, col: 0, r32Start: 1, depth: 0 },
  { matchNumber: 73, col: 0, r32Start: 2, depth: 0 },
  { matchNumber: 75, col: 0, r32Start: 3, depth: 0 },
  { matchNumber: 83, col: 0, r32Start: 4, depth: 0 },
  { matchNumber: 84, col: 0, r32Start: 5, depth: 0 },
  { matchNumber: 81, col: 0, r32Start: 6, depth: 0 },
  { matchNumber: 82, col: 0, r32Start: 7, depth: 0 },
  // R16 left (col 1)
  { matchNumber: 89, col: 1, r32Start: 0, depth: 1 },
  { matchNumber: 90, col: 1, r32Start: 2, depth: 1 },
  { matchNumber: 93, col: 1, r32Start: 4, depth: 1 },
  { matchNumber: 94, col: 1, r32Start: 6, depth: 1 },
  // QF left (col 2)
  { matchNumber: 97, col: 2, r32Start: 0, depth: 2 },
  { matchNumber: 98, col: 2, r32Start: 4, depth: 2 },
  // SF left (col 3)
  { matchNumber: 101, col: 3, r32Start: 0, depth: 3 },
]

// Right half: R32 → R16 → QF → SF (cols 8 → 5) — same vertical positions
const RIGHT: MatchPlacement[] = [
  // R32 right (col 8)
  { matchNumber: 76, col: 8, r32Start: 0, depth: 0 },
  { matchNumber: 78, col: 8, r32Start: 1, depth: 0 },
  { matchNumber: 79, col: 8, r32Start: 2, depth: 0 },
  { matchNumber: 80, col: 8, r32Start: 3, depth: 0 },
  { matchNumber: 86, col: 8, r32Start: 4, depth: 0 },
  { matchNumber: 88, col: 8, r32Start: 5, depth: 0 },
  { matchNumber: 85, col: 8, r32Start: 6, depth: 0 },
  { matchNumber: 87, col: 8, r32Start: 7, depth: 0 },
  // R16 right (col 7)
  { matchNumber: 91, col: 7, r32Start: 0, depth: 1 },
  { matchNumber: 92, col: 7, r32Start: 2, depth: 1 },
  { matchNumber: 95, col: 7, r32Start: 4, depth: 1 },
  { matchNumber: 96, col: 7, r32Start: 6, depth: 1 },
  // QF right (col 6)
  { matchNumber: 99, col: 6, r32Start: 0, depth: 2 },
  { matchNumber: 100, col: 6, r32Start: 4, depth: 2 },
  // SF right (col 5)
  { matchNumber: 102, col: 5, r32Start: 0, depth: 3 },
]

// ─── Round labels ─────────────────────────────────────────────────────────────

const ROUND_LABELS: Array<{ col: number; label: string }> = [
  { col: 0, label: 'Round of 32' },
  { col: 1, label: 'Round of 16' },
  { col: 2, label: 'Quarter-finals' },
  { col: 3, label: 'Semi-finals' },
  { col: 4, label: 'Final' },
  { col: 5, label: 'Semi-finals' },
  { col: 6, label: 'Quarter-finals' },
  { col: 7, label: 'Round of 16' },
  { col: 8, label: 'Round of 32' },
]

const LABEL_HEIGHT = 32

// ─── Connector lines ──────────────────────────────────────────────────────────

type Connector = {
  child0Y: number
  child1Y: number
  parentY: number
  childCol: number
  parentCol: number
  side: 'left' | 'right'
}

const S = SLOT

// Left side: children are to the left, parent to the right
// child0Y / child1Y = Y-center of each child card
// parentY = Y-center of parent card
const LEFT_CONNECTORS: Connector[] = [
  // R32 → R16
  { child0Y: 0.5*S, child1Y: 1.5*S, parentY: 1*S,   childCol: 0, parentCol: 1, side: 'left' },
  { child0Y: 2.5*S, child1Y: 3.5*S, parentY: 3*S,   childCol: 0, parentCol: 1, side: 'left' },
  { child0Y: 4.5*S, child1Y: 5.5*S, parentY: 5*S,   childCol: 0, parentCol: 1, side: 'left' },
  { child0Y: 6.5*S, child1Y: 7.5*S, parentY: 7*S,   childCol: 0, parentCol: 1, side: 'left' },
  // R16 → QF
  { child0Y: 1*S,   child1Y: 3*S,   parentY: 2*S,   childCol: 1, parentCol: 2, side: 'left' },
  { child0Y: 5*S,   child1Y: 7*S,   parentY: 6*S,   childCol: 1, parentCol: 2, side: 'left' },
  // QF → SF
  { child0Y: 2*S,   child1Y: 6*S,   parentY: 4*S,   childCol: 2, parentCol: 3, side: 'left' },
]

// Right side: mirror — children to the right, parent to the left
const RIGHT_CONNECTORS: Connector[] = [
  // R32 → R16
  { child0Y: 0.5*S, child1Y: 1.5*S, parentY: 1*S,   childCol: 8, parentCol: 7, side: 'right' },
  { child0Y: 2.5*S, child1Y: 3.5*S, parentY: 3*S,   childCol: 8, parentCol: 7, side: 'right' },
  { child0Y: 4.5*S, child1Y: 5.5*S, parentY: 5*S,   childCol: 8, parentCol: 7, side: 'right' },
  { child0Y: 6.5*S, child1Y: 7.5*S, parentY: 7*S,   childCol: 8, parentCol: 7, side: 'right' },
  // R16 → QF
  { child0Y: 1*S,   child1Y: 3*S,   parentY: 2*S,   childCol: 7, parentCol: 6, side: 'right' },
  { child0Y: 5*S,   child1Y: 7*S,   parentY: 6*S,   childCol: 7, parentCol: 6, side: 'right' },
  // QF → SF
  { child0Y: 2*S,   child1Y: 6*S,   parentY: 4*S,   childCol: 6, parentCol: 5, side: 'right' },
]

type SVGLine = { x1: number; y1: number; x2: number; y2: number }

function buildLines(connectors: Connector[]): SVGLine[] {
  const lines: SVGLine[] = []

  for (const c of connectors) {
    if (c.side === 'left') {
      // Children to the left of parent
      const childRightX = c.childCol * COL_STEP + CARD_W
      const junctionX = childRightX + COL_GAP / 2
      const parentLeftX = c.parentCol * COL_STEP

      lines.push({ x1: childRightX, y1: c.child0Y, x2: junctionX, y2: c.child0Y })
      lines.push({ x1: childRightX, y1: c.child1Y, x2: junctionX, y2: c.child1Y })
      lines.push({ x1: junctionX,   y1: c.child0Y, x2: junctionX, y2: c.child1Y })
      lines.push({ x1: junctionX,   y1: c.parentY, x2: parentLeftX, y2: c.parentY })
    } else {
      // Children to the right of parent (mirrored)
      const childLeftX = c.childCol * COL_STEP
      const junctionX = childLeftX - COL_GAP / 2
      const parentRightX = c.parentCol * COL_STEP + CARD_W

      lines.push({ x1: childLeftX,  y1: c.child0Y, x2: junctionX, y2: c.child0Y })
      lines.push({ x1: childLeftX,  y1: c.child1Y, x2: junctionX, y2: c.child1Y })
      lines.push({ x1: junctionX,   y1: c.child0Y, x2: junctionX, y2: c.child1Y })
      lines.push({ x1: junctionX,   y1: c.parentY, x2: parentRightX, y2: c.parentY })
    }
  }

  // SF-101 → Final (left horizontal)
  const sfLeftRight = 3 * COL_STEP + CARD_W  // right edge of SF-101
  const finalLeft = 4 * COL_STEP              // left edge of Final
  const finalCenterY = 4 * S
  lines.push({ x1: sfLeftRight, y1: finalCenterY, x2: finalLeft, y2: finalCenterY })

  // SF-102 → Final (right horizontal)
  const sfRightLeft = 5 * COL_STEP            // left edge of SF-102
  const finalRight = 4 * COL_STEP + CARD_W    // right edge of Final
  lines.push({ x1: sfRightLeft, y1: finalCenterY, x2: finalRight, y2: finalCenterY })

  return lines
}

const ALL_LINES = buildLines([...LEFT_CONNECTORS, ...RIGHT_CONNECTORS])

// ─── Component ────────────────────────────────────────────────────────────────

export type BracketViewProps = {
  resolvedMatches: ResolvedMatch[]
  matchProps?: (mn: number) => Partial<BracketMatchProps>
}

export function BracketView({ resolvedMatches, matchProps }: BracketViewProps) {
  const matchMap = new Map(resolvedMatches.map(m => [m.match_number, m]))

  function renderMatch(placement: MatchPlacement) {
    const match = matchMap.get(placement.matchNumber)
    if (!match) return null

    const top = cardTop(placement.r32Start, placement.depth)
    const left = colLeft(placement.col)
    const extra = matchProps?.(placement.matchNumber) ?? {}

    return (
      <div
        key={placement.matchNumber}
        style={{ position: 'absolute', top: LABEL_HEIGHT + top, left }}
      >
        <BracketMatch match={match} {...extra} />
      </div>
    )
  }

  function renderCenterMatch(matchNumber: number, top: number) {
    const match = matchMap.get(matchNumber)
    if (!match) return null
    const extra = matchProps?.(matchNumber) ?? {}
    return (
      <div
        key={matchNumber}
        style={{ position: 'absolute', top: LABEL_HEIGHT + top, left: colLeft(4) }}
      >
        <BracketMatch match={match} {...extra} />
      </div>
    )
  }

  const finalCenterY = 4 * SLOT
  const finalTop = finalCenterY - CARD_H / 2

  return (
    <div className="overflow-x-auto">
      <div
        style={{
          position: 'relative',
          width: TOTAL_W,
          height: LABEL_HEIGHT + TOTAL_H,
          minHeight: LABEL_HEIGHT + THIRD_PLACE_TOP + CARD_H + 16,
        }}
      >
        {/* Round labels */}
        {ROUND_LABELS.map(({ col, label }) => (
          <div
            key={col}
            style={{
              position: 'absolute',
              top: 0,
              left: colLeft(col),
              width: CARD_W,
              height: LABEL_HEIGHT,
            }}
            className="flex items-center justify-center"
          >
            <span className="text-[10px] font-semibold uppercase tracking-widest text-fg-muted text-center leading-tight">
              {label}
            </span>
          </div>
        ))}

        {/* Connector lines (SVG overlay) */}
        <svg
          style={{ position: 'absolute', top: LABEL_HEIGHT, left: 0, pointerEvents: 'none' }}
          width={TOTAL_W}
          height={TOTAL_H}
          overflow="visible"
        >
          {ALL_LINES.map((l, i) => (
            <line
              key={i}
              x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
              stroke="var(--color-border-subtle)"
              strokeWidth={1}
            />
          ))}
        </svg>

        {/* Left half matches */}
        {LEFT.map(renderMatch)}

        {/* Right half matches */}
        {RIGHT.map(renderMatch)}

        {/* Center: Final + 3rd place */}
        {renderCenterMatch(104, finalTop)}
        {renderCenterMatch(103, THIRD_PLACE_TOP)}
      </div>
    </div>
  )
}
