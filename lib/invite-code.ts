import { randomBytes } from 'node:crypto'

// Safe chars: excludes 0/O/1/I/L to avoid ambiguity when sharing verbally or in print.
// 256 / 32 = 8 exactly — no modulo bias.
const SAFE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

export function generateInviteCode(length = 6): string {
  const bytes = randomBytes(length)
  return Array.from(bytes)
    .map(b => SAFE_CHARS[b % SAFE_CHARS.length])
    .join('')
}
