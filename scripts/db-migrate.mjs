// Applies the migrations in drizzle/ (npm run db:migrate). Publish runs it before
// anything goes live, so a failure here keeps the previous version serving. All of it
// runs in one transaction, and a migration that is applied is never applied again.
//
// A database built by `drizzle-kit push`, from before this app had migrations, has
// tables and no record of any migration. It gets one last push, then every migration
// is recorded as applied without running, except the seed-* ones.
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import postgres from 'postgres'
import { readMigrationFiles } from 'drizzle-orm/migrator'

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Configure the production PostgreSQL connection before running migrations.')
  process.exit(1)
}

const folder = './drizzle'
const allowDataLoss = '-- getlaunch:allow-data-loss'
const dataLoss = /\b(DROP\s+(TABLE|COLUMN|SCHEMA)|TRUNCATE|DELETE\s+FROM|ALTER\s+COLUMN\s+\S+\s+(SET\s+DATA\s+)?TYPE)\b/i

run('node', ['scripts/db-check.mjs'])
if (process.env.NODE_ENV === 'production') refuseUngeneratedSchema()

const migrations = readMigrations()
const sql = postgres(process.env.DATABASE_URL ?? 'postgres://postgres@127.0.0.1:5432/app', { max: 1, prepare: false, onnotice: () => {} })

try {
  const applied = await lastApplied()
  if (applied === null && (await hasTables())) {
    await adopt()
  } else {
    await apply(migrations.filter((m) => m.folderMillis > (applied ?? 0)))
  }
} catch (err) {
  console.error(err?.message ?? err)
  process.exitCode = 1
} finally {
  await sql.end({ timeout: 5 }).catch(() => {})
}

function readMigrations() {
  const { entries } = JSON.parse(readFileSync(`${folder}/meta/_journal.json`, 'utf8'))
  return readMigrationFiles({ migrationsFolder: folder }).map((m, i) => ({ ...m, tag: entries[i].tag }))
}

async function lastApplied() {
  const [{ tracked }] = await sql`select to_regclass('drizzle.__drizzle_migrations') is not null as tracked`
  if (!tracked) return null
  const [{ last }] = await sql`select max(created_at) as last from drizzle.__drizzle_migrations`
  return last === null ? null : Number(last)
}

async function hasTables() {
  const [{ count }] = await sql`select count(*)::int as count from information_schema.tables where table_schema = 'public'`
  return count > 0
}

async function apply(pending) {
  const risky = pending.filter((m) => dataLoss.test(m.sql.join('\n')) && !m.sql.join('\n').includes(allowDataLoss))
  if (risky.length > 0) {
    throw new Error(`Refused: ${risky.map((m) => m.tag).join(', ')} can delete data that is already in this database. Nothing was changed. Add "${allowDataLoss}" to the top of the file only after the app's owner has agreed to lose that data.`)
  }
  await sql.begin(async (tx) => {
    await ensureTrackingTable(tx)
    for (const m of pending) {
      await runStatements(tx, m)
      await record(tx, m)
    }
  })
  console.log(pending.length > 0 ? `Applied ${pending.map((m) => m.tag).join(', ')}.` : 'Database is up to date.')
}

async function adopt() {
  pushSchema()
  await sql.begin(async (tx) => {
    await ensureTrackingTable(tx)
    for (const m of migrations) {
      if (/^\d+_seed-/.test(m.tag)) await runStatements(tx, m)
      await record(tx, m)
    }
  })
  console.log(`Recorded ${migrations.length} existing migration(s) for this database.`)
}

async function ensureTrackingTable(tx) {
  await tx`create schema if not exists drizzle`
  await tx`create table if not exists drizzle.__drizzle_migrations (id serial primary key, hash text not null, created_at bigint)`
}

async function runStatements(tx, migration) {
  for (const statement of migration.sql) await tx.unsafe(statement)
}

async function record(tx, migration) {
  await tx`insert into drizzle.__drizzle_migrations (hash, created_at) values (${migration.hash}, ${migration.folderMillis})`
}

// With no terminal to ask on, drizzle-kit prints an error and exits 0 having done
// nothing, so its output is the only proof that it worked.
function drizzleKit(args) {
  const { stdout, stderr } = spawnSync('npx', ['drizzle-kit', ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  return `${stdout}${stderr}`
}

function pushSchema() {
  const output = drizzleKit(['push'])
  if (!/Changes applied|No changes detected/.test(output)) {
    throw new Error(`Refused: could not bring this database up to the current schema, and nothing was recorded. drizzle-kit needs an answer it can't get here, usually about a rename or lost data.\n${output}`)
  }
}

function refuseUngeneratedSchema() {
  if (!drizzleKit(['generate', '--name=publish_check']).includes('No schema changes')) {
    console.error('Refused: src/lib/db/schema.ts has changes with no migration. Run npm run db:generate and commit the file it writes.')
    process.exit(1)
  }
}

function run(command, args) {
  const { status } = spawnSync(command, args, { stdio: 'inherit' })
  if (status !== 0) process.exit(status ?? 1)
}
