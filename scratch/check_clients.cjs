const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase.from('clients').select('*').limit(1);
  if (error) console.error(error);
  if (data) {
    if (data.length > 0) {
      console.log(Object.keys(data[0]));
    } else {
      console.log('No rows, cant infer schema easily without rpc');
    }
  }
}
main();
