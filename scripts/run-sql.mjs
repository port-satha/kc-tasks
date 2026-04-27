#!/usr/bin/env node
// Migration runner. Reads SQL files from the migrations/ folder and runs
// them against the Postgres URL in .env.local.
//
// Usage:
//   node scripts/run-sql.mjs migrations/some-file.sql
//   node scripts/run-sql.mjs --query "select count(*) from kpis"
//
// Loads SUPABASE_DB_URL from .env.local. Bypasses Supabase RLS — use only
// for migrations and admin diagnostics, never for app data manipulation.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

// Tiny .env.local parser — avoids adding a `dotenv` dep just for this.
function loadEnvLocal() {
  const envPath = path.join(repoRoot, '.env.local')
  if (!fs.existsSync(envPath)) return
  const raw = fs.readFileSync(envPath, 'utf8')
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq < 0) continue
    const key = trimmed.slice(0, eq).trim()
    const value = trimmed.slice(eq + 1).trim()
    if (!process.env[key]) process.env[key] = value
  }
}

loadEnvLocal()

const dbUrl = process.env.SUPABASE_DB_URL
if (!dbUrl) {
  console.error('SUPABASE_DB_URL not found in .env.local')
  process.exit(1)
}

const args = process.argv.slice(2)
let sql = null
let label = null

if (args[0] === '--query' && args[1]) {
  sql = args[1]
  label = '<inline query>'
} else if (args[0]) {
  const filePath = path.isAbsolute(args[0]) ? args[0] : path.join(repoRoot, args[0])
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`)
    process.exit(1)
  }
  sql = fs.readFileSync(filePath, 'utf8')
  label = path.relative(repoRoot, filePath)
} else {
  console.error('Usage: node scripts/run-sql.mjs <file.sql>  OR  --query "sql"')
  process.exit(1)
}

const client = new pg.Client({
  connectionString: dbUrl,
  // Supabase requires SSL; the cert is signed by AWS so just trust it for now.
  ssl: { rejectUnauthorized: false },
})

try {
  console.log(`Connecting to Postgres…`)
  await client.connect()
  console.log(`Running: ${label}`)
  const result = await client.query(sql)
  // pg returns either a single result or array (for multi-statement scripts)
  const results = Array.isArray(result) ? result : [result]
  for (const r of results) {
    if (r.rows && r.rows.length > 0) {
      console.log(`\n→ ${r.rows.length} row(s):`)
      console.table(r.rows)
    } else if (r.command) {
      console.log(`→ ${r.command} (${r.rowCount ?? 0} rows affected)`)
    }
  }
  console.log(`\n✓ Done.`)
} catch (err) {
  console.error(`\n✗ SQL error:`, err.message)
  if (err.detail) console.error(`  detail: ${err.detail}`)
  if (err.hint) console.error(`  hint: ${err.hint}`)
  process.exit(1)
} finally {
  await client.end()
}
