import pg from 'pg';
import fs from 'fs';
const client = new pg.Client({ connectionString: 'postgresql://postgres.rbirnrvjmjztjmsorlgm:km0OvLuL2RMufWt2@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres' });
client.connect().then(() => {
  const sql = fs.readFileSync('supabase/migrations/20260812022023_add_received_qty_to_orders.sql', 'utf8');
  return client.query(sql);
}).then((res) => {
  console.log('Migration successful');
  client.end();
}).catch(console.error);
