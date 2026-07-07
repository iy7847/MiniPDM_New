import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  console.log('Fetching company...');
  const { data: companies, error: compError } = await supabase.from('companies').select('id');
  if (compError || !companies || companies.length === 0) {
    console.error('Failed to fetch company', compError);
    return;
  }
  const companyId = companies[0].id;
  console.log('Company ID:', companyId);

  console.log('Deleting existing custom templates...');
  const { error: delError } = await supabase.from('custom_quotation_templates').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (delError) {
    console.error('Delete error', delError);
    return;
  }
  console.log('Deleted existing templates.');

  const idealLayout = {
    headerHeight: 220,
    footerHeight: 200,
    blocks: [
      {
        id: 'header_block',
        type: 'header',
        band: 'header',
        x: 30,
        y: 40,
        width: 734,
        height: 60,
        title: '견 적 서',
        showLogo: true,
        align: 'center'
      },
      {
        id: 'sender_receiver_block',
        type: 'sender_receiver',
        band: 'header',
        x: 30,
        y: 110,
        width: 734,
        height: 100,
        layout: 'side_by_side',
        showSeal: true,
        senderFields: []
      },
      {
        id: 'table_block',
        type: 'item_table',
        band: 'body',
        x: 30,
        y: 250,
        width: 734,
        height: 250,
        columns: ['품번', '품명', '규격', '수량', '단가', '공급가액'],
        theme: 'striped'
      },
      {
        id: 'cond_payment',
        type: 'condition',
        band: 'footer',
        x: 30,
        y: 1123 - 200 + 20,
        width: 350,
        height: 60,
        conditionType: 'payment_terms',
        showTitle: true
      },
      {
        id: 'cond_delivery',
        type: 'condition',
        band: 'footer',
        x: 30,
        y: 1123 - 200 + 90,
        width: 350,
        height: 60,
        conditionType: 'delivery_period',
        showTitle: true
      },
      {
        id: 'cond_note',
        type: 'condition',
        band: 'footer',
        x: 400,
        y: 1123 - 200 + 20,
        width: 364,
        height: 130,
        conditionType: 'note',
        showTitle: true
      }
    ]
  };

  console.log('Inserting ideal default template...');
  const { error: insError } = await supabase.from('custom_quotation_templates').insert({
    company_id: companyId,
    name: '스탠다드 견적서 (최적화)',
    layout_json: idealLayout,
    is_default: true
  });

  if (insError) {
    console.error('Insert error', insError);
  } else {
    console.log('Successfully inserted standard template!');
  }
}

run();
