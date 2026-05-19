/**
 * Wipes all data from the staging DB.
 * Safe to re-run: idempotent. Always run before sim:seed.
 */
import { stagingDb } from './lib/staging-client.js'

async function reset() {
  const db = stagingDb

  // Delete all auth users (cascades → profiles → group_predictions, knockout_predictions, award_predictions)
  const { data: { users }, error: listErr } = await db.auth.admin.listUsers({ perPage: 1000 })
  if (listErr) throw new Error(`listUsers failed: ${listErr.message}`)

  for (const u of users) {
    const { error } = await db.auth.admin.deleteUser(u.id)
    if (error) console.warn(`  Warning: deleteUser(${u.id}): ${error.message}`)
  }

  // Delete league data (not cascade-linked to auth)
  await db.from('league_memberships').delete().neq('id', 0)
  await db.from('leagues').delete().neq('id', 0)

  // Delete match and team data
  await db.from('matches').delete().neq('id', 0)
  await db.from('teams').delete().neq('id', 0)

  // Delete award results
  await db.from('award_results').delete().neq('id', 0)

  // Count remaining rows to confirm
  const [
    { count: teamCount },
    { count: matchCount },
    { count: predCount },
    { count: profileCount },
  ] = await Promise.all([
    db.from('teams').select('*', { count: 'exact', head: true }),
    db.from('matches').select('*', { count: 'exact', head: true }),
    db.from('group_predictions').select('*', { count: 'exact', head: true }),
    db.from('profiles').select('*', { count: 'exact', head: true }),
  ])

  console.log(
    `Reset complete. ${teamCount ?? 0} teams, ${matchCount ?? 0} matches, ` +
    `${predCount ?? 0} predictions, ${profileCount ?? 0} profiles, ` +
    `${users.length} auth users deleted.`
  )
}

reset().catch(err => { console.error(err); process.exit(1) })
