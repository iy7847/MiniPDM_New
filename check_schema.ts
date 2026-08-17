import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://rbirnrvjmjztjmsorlgm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiaXJucnZqbWp6dGptc29ybGdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwMDcwMzUsImV4cCI6MjA4MTU4MzAzNX0.vmQPRDtWRkQIl3_EweFFHuAbPNatL_9vEytTCnQEy6Q'
);

async function checkSchema() {
  console.log('--- Checking material_orders ---');
  // Just select one row to see its structure
  const { data: mData, error: mError } = await supabase.from('material_orders').select('*').limit(1);
  if (mError) {
    console.error('material_orders error:', mError);
  } else {
    console.log(mData.length > 0 ? Object.keys(mData[0]) : 'material_orders is empty, cannot infer schema via select');
  }

  console.log('--- Checking material_order_items ---');
  const { data: iData, error: iError } = await supabase.from('material_order_items').select('*').limit(1);
  if (iError) {
    console.error('material_order_items error:', iError);
  } else {
    console.log(iData.length > 0 ? Object.keys(iData[0]) : 'material_order_items is empty, cannot infer schema via select');
  }
}

checkSchema();
