import { Client } from 'pg'

const client = new Client({ connectionString: process.env.DATABASE_URL })

async function main() {
  await client.connect()

  const tables = ['portfolios', 'holdings', 'alerts', 'briefings', 'news_items', 'rules']

  for (const t of tables) {
    const { rows } = await client.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position
    `, [t])
    console.log(`\n── ${t} ──`)
    rows.forEach((r: { column_name: string; data_type: string; column_default: string; is_nullable: string }) =>
      console.log(`  ${r.column_name} (${r.data_type}) default=${r.column_default} nullable=${r.is_nullable}`))
  }

  await client.end()
}

main().catch(async (err) => { console.error(err.message); await client.end(); process.exit(1) })
