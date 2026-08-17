require('dotenv').config();
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
async function run() {
  await client.connect();
  const res = await client.query("SELECT id, part_name, part_no, order_item_no, material_name FROM order_items WHERE part_no = '306SM0141-A'");
  console.log(res.rows);
  await client.end();
}
run().catch(console.error);
