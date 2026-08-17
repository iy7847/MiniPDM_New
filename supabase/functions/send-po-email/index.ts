import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

// Resend API endpoint
const RESEND_API_URL = 'https://api.resend.com/emails'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY is not set')
    }

    const { receipt_token, supplier_email, supplier_name, zip_url, user_email, company_name, custom_message } = await req.json()

    if (!receipt_token || !supplier_email || !zip_url) {
      throw new Error('Missing required fields')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const publicUrl = `${supabaseUrl}/functions/v1/po-read-receipt?token=${receipt_token}&url=${encodeURIComponent(zip_url)}`

    // Prepare email content
    const htmlContent = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">발주서가 도착했습니다.</h2>
        <p>안녕하세요, <strong>${supplier_name}</strong> 님.</p>
        <p><strong>${company_name}</strong>에서 새로운 발주서를 발송했습니다.</p>
        
        <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #333;">전달 메시지</h3>
          <p style="color: #555; white-space: pre-wrap; line-height: 1.5;">${custom_message}</p>
        </div>

        <div style="margin: 30px 0; text-align: center;">
          <a href="${publicUrl}" 
             style="background-color: #0ea5e9; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 16px;">
            발주서 및 첨부파일 다운로드
          </a>
          <p style="font-size: 13px; color: #666; margin-top: 12px;">(위 버튼을 클릭하시면 파일이 다운로드되며 발주처에 수신 확인이 통보됩니다)</p>
        </div>

        <hr style="border: 1px solid #eee; margin: 30px 0;" />
        <p style="font-size: 12px; color: #999;">본 메일은 시스템에 의해 자동 발송되었습니다. 문의사항이 있으시면 본 메일에 답장(Reply)해 주세요.</p>
      </div>
    `

    // Extract domain from RESEND_API_KEY settings or environment
    const senderDomain = Deno.env.get('RESEND_DOMAIN') || 'minipdm.app'

    // Send email via Resend
    const res = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`
      },
      body: JSON.stringify({
        from: `${company_name} 발주팀 <noreply@${senderDomain}>`,
        to: [supplier_email],
        reply_to: user_email,
        subject: `[발주서] ${company_name}에서 발주서를 발송했습니다.`,
        html: htmlContent,
      })
    })

    if (!res.ok) {
      const errorData = await res.text()
      throw new Error(`Resend API Error: ${errorData}`)
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error('Error sending email:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
