/**
 * Adds action_type, is_verified, confidence_score to news_items
 * so the dashboard can bucket/display news correctly.
 */
import { Client } from 'pg'

const sql = `
ALTER TABLE news_items
  ADD COLUMN IF NOT EXISTS action_type      TEXT CHECK (action_type IN ('immediate','daily','weekly','discard')),
  ADD COLUMN IF NOT EXISTS is_verified      BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS confidence_score NUMERIC(4,2) CHECK (confidence_score BETWEEN 0 AND 10);

-- thesis_impact already exists (original schema column)
-- Ensure thesis_impact has correct constraint if not already present
ALTER TABLE news_items
  DROP CONSTRAINT IF EXISTS news_items_thesis_impact_check;

ALTER TABLE news_items
  ADD CONSTRAINT news_items_thesis_impact_check
    CHECK (thesis_impact IN ('none','supporting','weakening','breaking') OR thesis_impact IS NULL);

CREATE INDEX IF NOT EXISTS idx_news_items_action_type ON news_items(action_type);
`

const client = new Client({ connectionString: process.env.DATABASE_URL })

async function main() {
  await client.connect()
  await client.query(sql)
  console.log('Migration complete: added action_type, is_verified, confidence_score to news_items')
  await client.end()
}

main().catch(async err => {
  console.error(err.message)
  await client.end()
  process.exit(1)
})
