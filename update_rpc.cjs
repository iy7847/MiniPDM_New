const fs = require('fs');
const { Client } = require('pg');

async function updateRPC() {
  const connectionString = 'postgresql://postgres.rbirnrvjmjztjmsorlgm:km0OvLuL2RMufWt2@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres';
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('Connected to Supabase via Session Pooler');
    
    const sql = fs.readFileSync('D:/06_Coding/AntiGravity/MiniPDM_New/supabase/migrations/20260730000001_revert_po_no_format.sql', 'utf8');
    
    await client.query(sql);
    console.log('RPC update successful!');
  } catch (err) {
    console.error('Error updating RPC:', err);
  } finally {
    await client.end();
  }
}

updateRPC();
