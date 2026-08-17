require('dotenv').config();
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
async function run() {
  await client.connect();
  const res = await client.query("SELECT * FROM files WHERE file_name LIKE '%306SM0141%'");
  console.log(res.rows);
  await client.end();
}
run().catch(console.error);
