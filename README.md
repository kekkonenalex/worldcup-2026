# FIFA World Cup 2026 Predictions

A prediction game for the 2026 FIFA World Cup. Built with Next.js, Supabase, Vercel, and Resend.

This app is not affiliated with FIFA or any official World Cup organisation.

## Local development

1. Clone the repo and run `npm install`
2. Create a `.env.local` file with the following variables (values not included):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` (if used)
   - `RESEND_API_KEY`
   - `FOOTBALL_DATA_API_KEY`
   - `CRON_SECRET`
3. Set up the Supabase database schema (migrations in /supabase if present)
4. Run `npm run dev`

## Stack

- Next.js 16 (App Router, TypeScript)
- Supabase (database, auth, RLS)
- Tailwind CSS
- Vercel (hosting + cron)
- Resend (email)
