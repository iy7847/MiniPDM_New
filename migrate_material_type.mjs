import pg from 'pg';

const connectionString = "postgresql://postgres.rbirnrvjmjztjmsorlgm:km0OvLuL2RMufWt2@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres";

const client = new pg.Client({
  connectionString,
});

async function run() {
  await client.connect();
  console.log("Connected to Supabase.");
  const query = `
    ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS material_supply_type TEXT DEFAULT 'NONE';
    COMMENT ON COLUMN public.order_items.material_supply_type IS '소재 조달 방식 (ORDER, STOCK, PROVIDED, NONE)';
  `;
  await client.query(query);
  console.log("Migration executed.");
  await client.end();
}

run().catch(err => {
  console.error("Migration error:", err);
  process.exit(1);
});
