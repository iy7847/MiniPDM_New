const { Client } = require('pg');
const { v4: uuidv4 } = require('uuid');

async function fixNullOrderItemNos() {
  const connectionString = 'postgresql://postgres.rbirnrvjmjztjmsorlgm:km0OvLuL2RMufWt2@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres';
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    
    // Find items with null order_item_no
    const { rows: items } = await client.query('SELECT id, order_item_no FROM public.order_items WHERE order_item_no IS NULL OR order_item_no = \'\'');
    console.log(`Found ${items.length} items with null/empty order_item_no.`);
    
    for (const item of items) {
      const generatedNo = `TEMP-${uuidv4().substring(0,8).toUpperCase()}`;
      await client.query('UPDATE public.order_items SET order_item_no = $1 WHERE id = $2', [generatedNo, item.id]);
    }
    
    console.log('Fixed all null order_item_nos.');
  } catch (err) {
    console.error('Error connecting or querying:', err);
  } finally {
    await client.end();
  }
}

fixNullOrderItemNos();
