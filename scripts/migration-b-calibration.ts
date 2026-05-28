import { Client } from 'pg'

const sql = `
ALTER TABLE news_items
  ADD COLUMN IF NOT EXISTS urgency_score  NUMERIC(4,2) CHECK (urgency_score BETWEEN 0 AND 10),
  ADD COLUMN IF NOT EXISTS scoring_reason TEXT;
`

const client = new Client({ connectionString: process.env.DATABASE_URL })

async function main() {
  await client.connect()
  await client.query(sql)
  console.log('Migration complete: added urgency_score, scoring_reason to news_items')
  await client.end()
}

main().catch(async err => { console.error(err.message); await client.end(); process.exit(1) })
