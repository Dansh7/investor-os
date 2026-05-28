import { Client } from 'pg'
import { readFileSync } from 'fs'
import { join } from 'path'

const sql = readFileSync(join(__dirname, 'migration-phase-a.sql'), 'utf8')

const client = new Client({ connectionString: process.env.DATABASE_URL })

async function main() {
  await client.connect()
  console.log('Connected to database')
  await client.query(sql)
  console.log('Migration complete')
  await client.end()
}

main().catch(async (err) => {
  console.error('Migration failed:', err.message)
  await client.end()
  process.exit(1)
})
