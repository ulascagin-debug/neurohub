export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { validateBody, chatbotControlSchema } from '@/lib/validators'

// GET: chatbot status (enabled, webhook_url, uptime proxy)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const business_id = searchParams.get('business_id')

  if (!business_id) {
    return NextResponse.json({ error: "Missing business_id" }, { status: 400 })
  }

  try {
    const config = await prisma.chatbotConfig.findUnique({ where: { business_id } })
    const integrations = await prisma.integrationConfig.findMany({ where: { business_id } })

    if (!config) {
      return NextResponse.json({
        chatbot_enabled: false,
        webhook_url: null,
        has_integrations: false,
        integration_count: 0,
      })
    }

    // Try to detect if chatbot Flask server is running by pinging it
    let chatbot_alive = false
    let chatbot_ping_ms: number | null = null
    try {
      const start = Date.now()
      const res = await fetch('http://localhost:5000/', { signal: AbortSignal.timeout(3000) })
      chatbot_ping_ms = Date.now() - start
      chatbot_alive = res.ok || res.status === 404 // Flask returns something
    } catch {
      chatbot_alive = false
    }

    return NextResponse.json({
      chatbot_enabled: config.chatbot_enabled,
      webhook_url: config.webhook_url || null,
      has_integrations: integrations.length > 0,
      integration_count: integrations.length,
      chatbot_alive,
      chatbot_ping_ms,
    })
  } catch (error) {
    console.error("[chatbot-control] GET error:", error)
    return NextResponse.json({ error: "Failed to fetch status" }, { status: 500 })
  }
}

// POST: toggle chatbot or update webhook URL
export async function POST(req: Request) {
  try {
    const body = await req.json()

    // Validate input
    const validation = validateBody(chatbotControlSchema, body)
    if (!validation.success) return validation.response

    const { business_id, chatbot_enabled, webhook_url } = validation.data

    const updateData: Record<string, any> = {}
    if (typeof chatbot_enabled === 'boolean') updateData.chatbot_enabled = chatbot_enabled
    if (typeof webhook_url === 'string') updateData.webhook_url = webhook_url

    const config = await prisma.chatbotConfig.upsert({
      where: { business_id },
      update: updateData,
      create: {
        business_id,
        chatbot_enabled: chatbot_enabled ?? true,
        webhook_url: webhook_url || null,
      },
    })

    return NextResponse.json({ success: true, config })
  } catch (error) {
    console.error("[chatbot-control] POST error:", error)
    return NextResponse.json({ error: "Failed to update" }, { status: 500 })
  }
}
