const { Client } = require('pg');
const connectionString = 'postgresql://postgres.rbirnrvjmjztjmsorlgm:km0OvLuL2RMufWt2@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres';

async function checkSchema() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    
    // Check material_orders
    const res1 = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'material_orders';
    `);
    console.log('--- material_orders ---');
    console.table(res1.rows);
    
    // Check material_order_items
    const res2 = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'material_order_items';
    `);
    console.log('--- material_order_items ---');
    console.table(res2.rows);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

checkSchema();
