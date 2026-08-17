import fs from 'fs';
import pkg from 'pg';
const { Client } = pkg;
const env = fs.readFileSync('.env', 'utf8');
const client = new Client({ connectionString: env.match(/^DATABASE_URL=(.*)$/m)[1].trim() });
async function run() {
  await client.connect();
  let res = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'files'");
  console.log('files columns:', res.rows.map(r => r.column_name).join(', '));
  await client.end();
}
run();
