import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { validateBody, integrationCreateSchema, integrationDeleteSchema } from '@/lib/validators'

const MAX_INTEGRATIONS_PER_USER = 3

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const business_id = searchParams.get('business_id')
  if (!business_id) return NextResponse.json({ error: "Missing business_id" }, { status: 400 })

  try {
    const integrations = await prisma.integrationConfig.findMany({ where: { business_id } })
    return NextResponse.json({ integrations })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  
  try {
    const body = await req.json()

    // Validate input
    const validation = validateBody(integrationCreateSchema, body)
    if (!validation.success) return validation.response

    const { business_id, platform, platform_identifier, access_token } = validation.data

    // --- 3-ACCOUNT LIMIT CHECK ---
    if (session?.user?.id) {
      // Get all businesses owned by this user
      const userBusinesses = await prisma.business.findMany({
        where: { owner_id: session.user.id },
        select: { id: true }
      })
      const businessIds = userBusinesses.map(b => b.id)

      // Count total integrations across all user's businesses
      const totalIntegrations = await prisma.integrationConfig.count({
        where: { business_id: { in: businessIds } }
      })

      // Check if this is a new integration (not updating an existing one)
      const existing = await prisma.integrationConfig.findFirst({
        where: { platform, platform_identifier, business_id }
      })

      if (!existing && totalIntegrations >= MAX_INTEGRATIONS_PER_USER) {
        return NextResponse.json({ 
          error: `Maksimum ${MAX_INTEGRATIONS_PER_USER} entegrasyon hakkınız var. Yeni eklemek için mevcut bir entegrasyonu kaldırın.`,
          limit_reached: true,
          current_count: totalIntegrations,
          max_count: MAX_INTEGRATIONS_PER_USER,
        }, { status: 403 })
      }
    }

    // Save integration (upsert for same platform+identifier, create for new)
    const integration = await prisma.integrationConfig.upsert({
      where: { platform_platform_identifier: { platform, platform_identifier } },
      update: { access_token, business_id },
      create: { business_id, platform, platform_identifier, access_token },
    })

    // --- AUTO-CHATBOT ACTIVATION ---
    // Ensure ChatbotConfig exists for this business
    const existingConfig = await prisma.chatbotConfig.findUnique({
      where: { business_id }
    })

    if (!existingConfig) {
      // Auto-create basic ChatbotConfig so the chatbot can start working
      const business = await prisma.business.findUnique({ where: { id: business_id } })
      await prisma.chatbotConfig.create({
        data: {
          business_id,
          tone: 'friendly',
          table_count: 0,
          address: business?.location || '',
        }
      })
    }

    // --- NOTIFY CHATBOT SERVICE ---
    // Best-effort: don't block on failure
    let chatbotNotified = false
    try {
      const CHATBOT_URL = process.env.CHATBOT_URL || 'http://localhost:5001'
      const connectResp = await fetch(`${CHATBOT_URL}/api/integrations/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id,
          platform,
          platform_identifier,
          access_token,
        }),
      })
      chatbotNotified = connectResp.ok
    } catch (e) {
      console.error('[integrations] Chatbot notification failed:', e)
    }

    return NextResponse.json({ 
      success: true, 
      integration,
      chatbot_activated: true,
      chatbot_notified: chatbotNotified,
    })
  } catch (error) {
    console.error("[integrations] Error:", error)
    return NextResponse.json({ error: "Failed to save" }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json()

    // Validate input
    const validation = validateBody(integrationDeleteSchema, body)
    if (!validation.success) return validation.response

    const { id } = validation.data

    await prisma.integrationConfig.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 })
  }
}
