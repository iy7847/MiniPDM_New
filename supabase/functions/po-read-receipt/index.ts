import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const token = url.searchParams.get('token')
  const redirectUrl = url.searchParams.get('url')

  if (!token || !redirectUrl) {
    return new Response('Missing token or url parameter', { status: 400, headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

    const now = new Date().toISOString()

    // Update outsource_orders
    const outRes = await supabase
      .from('outsource_orders')
      .update({ status: '수신확인', read_at: now, updated_at: now })
      .eq('po_receipt_token', token)
      .eq('status', '발주완료')

    if (outRes.error) throw outRes.error

    // Update material_orders
    const matRes = await supabase
      .from('material_orders')
      .update({ status: '수신확인', read_at: now, updated_at: now })
      .eq('po_receipt_token', token)
      .eq('status', '발주완료')

    if (matRes.error) throw matRes.error

    // Redirect to the ZIP file URL
    return Response.redirect(redirectUrl, 302)
  } catch (error: any) {
    return new Response(`Error: ${error.message}\n${error.stack}`, { status: 500, headers: corsHeaders })
  }
})
