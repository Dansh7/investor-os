import { Client } from 'pg'

const DDL = `
CREATE TABLE IF NOT EXISTS perplexity_cache (
  ticker     text        PRIMARY KEY,
  result     jsonb       NOT NULL,
  cached_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  perplexity_cache            IS 'Perplexity + scorer results cached for 4 h per ticker';
COMMENT ON COLUMN perplexity_cache.ticker     IS 'Stock ticker symbol (e.g. NVDA)';
COMMENT ON COLUMN perplexity_cache.result     IS 'Full CacheRecord: { perplexity, scored }';
COMMENT ON COLUMN perplexity_cache.cached_at  IS 'When this record was written; entries older than 4h are stale';
`

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL not set')

  const client = new Client({ connectionString: url })
  await client.connect()
  console.log('Connected to database')

  await client.query(DDL)
  console.log('✓ perplexity_cache table ready')

  await client.end()
}

main().catch(async err => {
  console.error('Migration failed:', err.message)
  process.exit(1)
})
