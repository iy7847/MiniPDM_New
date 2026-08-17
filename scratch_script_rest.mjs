import fs from 'fs';
const envFile = fs.readFileSync('.env', 'utf8');
const getEnv = (key) => envFile.split('\n').find(l => l.startsWith(key))?.split('=')[1]?.replace(/['"\r]/g, '');

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const anonKey = getEnv('VITE_SUPABASE_ANON_KEY');

const query = `outsource_orders?select=id,order_item_id,supplier_id,supplier_name,process_name,quantity,status,order_date,expected_date,order_items(id,part_name,part_no,spec,material_name,files(id,file_name,file_path,original_name))`;
const url = `${supabaseUrl}/rest/v1/${query}`;

fetch(url, {
  headers: {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`
  }
}).then(r => r.text()).then(t => console.log(t)).catch(console.error);
