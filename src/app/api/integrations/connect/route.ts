import { NextResponse } from 'next/server'
import { validateBody } from '@/lib/validators'
import { z } from 'zod'

const connectSchema = z.object({
  business_id: z.string().min(1),
  platform: z.string().min(1),
  platform_identifier: z.string().min(1),
  access_token: z.string().optional().nullable(),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const validation = validateBody(connectSchema, body)
    if (!validation.success) return validation.response

    const { business_id, platform, platform_identifier, access_token } = validation.data

    const CHATBOT_URL = process.env.CHATBOT_URL || 'http://localhost:5001'

    // Forward integration info to cafe-chatbot service
    const chatbotResp = await fetch(`${CHATBOT_URL}/api/integrations/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        business_id,
        platform,
        platform_identifier,
        access_token,
      }),
    })

    if (!chatbotResp.ok) {
      const err = await chatbotResp.json().catch(() => ({ error: 'Chatbot service unreachable' }))
      console.error('[integrations/connect] Chatbot error:', err)
      // Non-blocking — integration was already saved, chatbot notification is best-effort
      return NextResponse.json({
        success: true,
        chatbot_notified: false,
        chatbot_error: err.error || 'Chatbot service error',
      })
    }

    const chatbotData = await chatbotResp.json()

    return NextResponse.json({
      success: true,
      chatbot_notified: true,
      chatbot_response: chatbotData,
    })
  } catch (error) {
    console.error('[integrations/connect] Error:', error)
    return NextResponse.json({
      success: true,
      chatbot_notified: false,
      chatbot_error: 'Could not reach chatbot service',
    })
  }
}
