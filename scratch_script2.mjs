import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const envFile = fs.readFileSync('.env', 'utf8');
const getEnv = (key) => envFile.split('\n').find(l => l.startsWith(key))?.split('=')[1]?.replace(/['"\r]/g, '');

const supabase = createClient(getEnv('VITE_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('VITE_SUPABASE_ANON_KEY'));
supabase.from('outsource_orders').select('id, status').then(({data, error}) => {
  if (error) { console.error('Error:', error); return; }
  console.log('Current statuses (service role):', data);
  if (data && data.length > 0) {
    supabase.from('outsource_orders').update({ status: '발주대기' }).neq('status', '발주대기').then(({data: d2, error}) => {
       console.log('Update result:', error || 'Success');
    });
  }
});
