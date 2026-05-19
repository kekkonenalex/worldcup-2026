import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import path from 'path'

config({ path: path.resolve(process.cwd(), '.env.staging.local') })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL_STAGING
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY_STAGING

if (!url || !serviceKey) {
  throw new Error('Staging env vars missing. Did you populate .env.staging.local?')
}

if (url.includes('YOUR_STAGING_REF')) {
  throw new Error('Staging env vars still placeholders. Edit .env.staging.local.')
}

// Defensive check: refuse to run if URL matches production
const prodUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
if (prodUrl && url === prodUrl) {
  throw new Error('REFUSING TO RUN: staging URL equals production URL.')
}

export const stagingDb = createClient(url, serviceKey, {
  auth: { persistSession: false },
})
