const { Client } = require('pg');

async function checkDuplicates() {
  const connectionString = 'postgresql://postgres.rbirnrvjmjztjmsorlgm:km0OvLuL2RMufWt2@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres';
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('Successfully connected to Supabase Postgres!');
    
    // Check orders
    console.log('Checking orders for duplicates (company_id + po_no)...');
    const { rows: orders } = await client.query('SELECT company_id, po_no FROM public.orders');
    const orderSet = new Set();
    const orderDupes = [];
    orders.forEach(o => {
      const key = `${o.company_id}_${o.po_no}`;
      if (orderSet.has(key)) orderDupes.push(key);
      orderSet.add(key);
    });
    console.log(`Checked ${orders.length} orders. Duplicates found:`, orderDupes);

    // Check order_items
    console.log('Checking order_items for duplicates (order_id + order_item_no)...');
    const { rows: items } = await client.query('SELECT order_id, order_item_no FROM public.order_items');
    const itemSet = new Set();
    const itemDupes = [];
    items.forEach(i => {
      const key = `${i.order_id}_${i.order_item_no}`;
      if (itemSet.has(key)) itemDupes.push(key);
      itemSet.add(key);
    });
    console.log(`Checked ${items.length} items. Duplicates found:`, itemDupes);
    
  } catch (err) {
    console.error('Error connecting or querying:', err);
  } finally {
    await client.end();
  }
}

checkDuplicates();
