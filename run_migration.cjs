const fs = require('fs');
const { Client } = require('pg');
const path = require('path');

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
  
  const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20260731000001_create_split_rework_order.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');
  
  try {
    await client.query(sql);
    console.log("Migration executed successfully!");
  } catch (err) {
    console.error("Error executing migration:", err);
  } finally {
    await client.end();
  }
}

run().catch(console.error);
