/**
 * Phase C.6: Extends action_type CHECK constraint to include 'historical'
 * for items archived by the recency filter.
 */
import { Client } from 'pg'

const sql = `
-- Drop old constraint and replace with one that includes 'historical'
ALTER TABLE news_items
  DROP CONSTRAINT IF EXISTS news_items_action_type_check;

ALTER TABLE news_items
  ADD CONSTRAINT news_items_action_type_check
    CHECK (action_type IN ('immediate','daily','weekly','discard','historical') OR action_type IS NULL);
`

const client = new Client({ connectionString: process.env.DATABASE_URL })

async function main() {
  await client.connect()
  await client.query(sql)
  console.log('Migration complete: action_type constraint updated to include historical')
  await client.end()
}

main().catch(async err => {
  console.error(err.message)
  await client.end()
  process.exit(1)
})
