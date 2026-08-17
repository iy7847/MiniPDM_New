const fs = require('fs');
const { Client } = require('pg');

const env = fs.readFileSync('.env', 'utf8');
const match = env.match(/DATABASE_URL=(.*)/);
if (!match) {
  console.error("DATABASE_URL not found in .env");
  process.exit(1);
}
const connectionString = match[1].trim();

const client = new Client({
  connectionString,
});

async function run() {
  await client.connect();
  
  const tables = ['order_items', 'process_logs', 'material_orders', 'material_order_items', 'outsource_orders'];
  
  for (const table of tables) {
    const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = $1 AND table_schema = 'public'
      ORDER BY ordinal_position
    `, [table]);
    
    console.log(`\n--- TABLE: ${table} ---`);
    res.rows.forEach(r => console.log(`${r.column_name}: ${r.data_type}`));
  }

  await client.end();
}

run().catch(console.error);
