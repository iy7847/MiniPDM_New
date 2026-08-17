import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const envFile = fs.readFileSync('.env', 'utf8');
const getEnv = (key) => envFile.split('\n').find(l => l.startsWith(key))?.split('=')[1]?.replace(/['"\r]/g, '');

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
// Use the Anon key but we might get empty result, so let's try fetch it using raw HTTP request to Supabase REST API or just use pg.
import pg from 'pg';
const client = new pg.Client({ connectionString: 'postgresql://postgres.rbirnrvjmjztjmsorlgm:km0OvLuL2RMufWt2@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres' });
client.connect().then(() => {
  return client.query("SELECT pgrst.source, pgrst.message, pgrst.details FROM (SELECT 1) AS pgrst"); // Just checking if we can query
}).catch(e => console.error(e)).finally(() => client.end());
