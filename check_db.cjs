const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env', 'utf8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const sb = createClient(url, key);

async function check() {
  const { data: { session }, error: authErr } = await sb.auth.signInWithPassword({
    email: 'iy7847@gmail.com', // guess email or just try without auth
    password: 'password'
  });
  
  const { data, error } = await sb.from('companies').select('default_time_step').limit(1);
  if (error) {
    console.error("DB Error:", error.message);
  } else {
    console.log("DB Data:", data);
  }
}
check();
