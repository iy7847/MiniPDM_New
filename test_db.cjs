
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkOrders() {
  const { data, error } = await supabase.from('orders').select('*');
  if (error) console.error('Error:', error);
  else console.log('Orders Count:', data.length, data.map(d => ({id: d.id, estimate_id: d.estimate_id, company: d.company_id})));
}

checkOrders();

