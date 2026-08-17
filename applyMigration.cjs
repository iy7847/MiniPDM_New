const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const connectionString = 'postgresql://postgres.rbirnrvjmjztjmsorlgm:km0OvLuL2RMufWt2@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres';
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('Successfully connected to Supabase Postgres!');
    
    const sqlPath = path.join(__dirname, 'supabase', 'migrations', '20260731000000_add_client_po_no.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Executing migration...');
    await client.query(sql);
    console.log('Migration applied successfully!');
    
  } catch (err) {
    console.error('Error connecting or querying:', err);
  } finally {
    await client.end();
  }
}

runMigration();
