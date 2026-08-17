import fs from 'fs';
const envFile = fs.readFileSync('.env', 'utf8');
const getEnv = (key) => envFile.split('\n').find(l => l.startsWith(key))?.split('=')[1]?.replace(/['"\r]/g, '');

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const roleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('VITE_SUPABASE_ANON_KEY'); // Fallback

// Let's use pg to query exactly
import pg from 'pg';
const client = new pg.Client({ connectionString: 'postgresql://postgres.rbirnrvjmjztjmsorlgm:km0OvLuL2RMufWt2@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres' });
client.connect().then(async () => {
  try {
    const res = await client.query(`SELECT id, order_item_id FROM outsource_orders LIMIT 5`);
    console.log('Orders:', res.rows);
    for (const r of res.rows) {
      const oi = await client.query(`SELECT id, part_name, part_no, spec, material_name FROM order_items WHERE id = $1`, [r.order_item_id]);
      console.log('Order Item:', oi.rows);
      if (oi.rows.length > 0) {
        const files = await client.query(`SELECT id, file_name, file_path, original_name FROM files WHERE order_item_id = $1`, [r.order_item_id]);
        console.log('Files:', files.rows);
      }
    }
  } catch (e) {
    console.error(e);
  } finally {
    client.end();
  }
});
