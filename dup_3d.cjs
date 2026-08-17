require('dotenv').config();
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
async function run() {
  await client.connect();
  // Find the .x_t file for cc1eb3e1
  const x_t_res = await client.query("SELECT * FROM files WHERE order_item_id = 'cc1eb3e1-17f4-4a66-a533-00fed1689fa2' AND file_name LIKE '%.x_t%'");
  if (x_t_res.rows.length > 0) {
    const f = x_t_res.rows[0];
    await client.query(`
      INSERT INTO files (
        estimate_item_id, file_path, file_name, file_type, version, is_current, 
        created_at, updated_at, updated_by, file_size, order_item_id, original_name
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
      )
    `, [
      f.estimate_item_id, f.file_path, f.file_name, '3D', f.version, f.is_current,
      f.created_at, f.updated_at, f.updated_by, f.file_size, '95f917a7-f13f-47d9-9841-20afbd1b630b', f.original_name
    ]);
    console.log('3D file duplicated');
  } else {
    console.log('No 3D file found to duplicate');
  }
  await client.end();
}
run().catch(console.error);
