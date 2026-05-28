import { Client } from 'pg'

const client = new Client({ connectionString: process.env.DATABASE_URL })

async function main() {
  await client.connect()
  const { rows } = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `)
  console.log('Tables:', rows.map((r: { table_name: string }) => r.table_name).join(', '))
  await client.end()
}

main().catch(async (err) => { console.error(err.message); await client.end(); process.exit(1) })
