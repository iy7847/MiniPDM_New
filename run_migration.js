import fs from 'fs';
import pkg from 'pg';
const { Client } = pkg;

// Read .env file manually
const envContent = fs.readFileSync('.env', 'utf8');
const dbUrlMatch = envContent.match(/^DATABASE_URL=(.*)$/m);
if (!dbUrlMatch) {
  console.error('DATABASE_URL not found in .env');
  process.exit(1);
}
const dbUrl = dbUrlMatch[1].trim();

const client = new Client({
  connectionString: dbUrl,
});

async function run() {
  try {
    await client.connect();
    const sql = fs.readFileSync('supabase/migrations/20260812000001_release_production_orders.sql', 'utf8');
    await client.query(sql);
    console.log('Migration successfully applied!');
  } catch (err) {
    console.error('Error applying migration:', err);
  } finally {
    await client.end();
  }
}

run();
