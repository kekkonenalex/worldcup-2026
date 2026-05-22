import { z } from 'zod'

export const displayNameSchema = z.string()
  .trim()
  .min(2, 'Username must be at least 2 characters')
  .max(30, 'Username must be at most 30 characters')
  .regex(/^[a-zA-Z0-9_\- ]+$/, 'Only letters, numbers, spaces, hyphens, and underscores are allowed')
