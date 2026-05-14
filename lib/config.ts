export const PREDICTION_DEADLINE = new Date('2026-06-10T23:59:00+03:00')

export const MAX_GOALS_PER_TEAM = 20

export function isPastDeadline(): boolean {
  return new Date() > PREDICTION_DEADLINE
}

export function timeUntilDeadline(): {
  days: number
  hours: number
  minutes: number
  total_ms: number
} {
  const diff = PREDICTION_DEADLINE.getTime() - Date.now()
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, total_ms: 0 }
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  return { days, hours, minutes, total_ms: diff }
}
