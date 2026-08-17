import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const connectionString = process.env.DATABASE_URL;

async function main() {
  const client = new Client({ connectionString });
  await client.connect();
  console.log('Connected to DB');
  
  const sql = `
ALTER TABLE public.outsource_orders 
ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS po_receipt_token UUID;

ALTER TABLE public.material_orders
ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS po_receipt_token UUID;
  `;
  
  try {
    await client.query(sql);
    console.log('Migration successful');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}
main();
