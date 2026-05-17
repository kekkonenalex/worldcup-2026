import { revalidateTag } from 'next/cache'

export const CACHE_TAGS = {
  leaderboard: 'leaderboard',
  predictions: (userId: string) => `predictions:${userId}`,
  matches: 'matches',
  results: 'results',
}

// Helpers that call revalidateTag with the correct profile.
// These are no-ops until data is tagged via cacheTag() or fetch next.tags,
// but set up the invalidation contract for a future 'use cache' migration.

export function revalidateLeaderboard() {
  revalidateTag(CACHE_TAGS.leaderboard, { expire: 0 })
}

export function revalidatePredictions(userId: string) {
  revalidateTag(CACHE_TAGS.predictions(userId), { expire: 0 })
}

export function revalidateMatches() {
  revalidateTag(CACHE_TAGS.matches, { expire: 0 })
  revalidateTag(CACHE_TAGS.results, { expire: 0 })
}
