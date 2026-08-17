
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkEstimate() {
  const { data, error } = await supabase.from('estimates').select('id, status, project_name').ilike('id', '%AFB38FFB%');
  if (error) console.error('Error:', error);
  else console.log('Estimates:', data);
}

checkEstimate();

