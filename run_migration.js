const fs = require('fs');
const { Client } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL not found in .env');
  process.exit(1);
}

const client = new Client({
  connectionString,
});

async function runMigration() {
  try {
    await client.connect();
    console.log('Connected to DB');

    const sql = fs.readFileSync('supabase/migrations/20260826224201_add_process_routing_tables.sql', 'utf8');
    
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    
    console.log('Migration successfully applied.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error running migration:', err);
  } finally {
    await client.end();
  }
}

runMigration();
