require('dotenv').config();
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
async function run() {
  await client.connect();
  const m = await client.query("SELECT * FROM material_order_items WHERE order_item_id = 'cc1eb3e1-17f4-4a66-a533-00fed1689fa2'");
  console.log('Material Order Items:', m.rows);
  const m2 = await client.query("SELECT * FROM material_orders WHERE order_item_id = 'cc1eb3e1-17f4-4a66-a533-00fed1689fa2'");
  console.log('Material Orders:', m2.rows);
  const o = await client.query("SELECT * FROM outsource_orders WHERE order_item_id = 'cc1eb3e1-17f4-4a66-a533-00fed1689fa2'");
  console.log('Outsource Orders:', o.rows);
  await client.end();
}
run().catch(console.error);
