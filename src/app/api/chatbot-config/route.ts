export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const business_id = searchParams.get('business_id')

  if (!business_id) {
    return NextResponse.json({ error: "Missing business_id" }, { status: 400 })
  }

  try {
    const config = await prisma.chatbotConfig.findUnique({ where: { business_id } })
    const business = await prisma.business.findUnique({ where: { id: business_id } })
    const integrations = await prisma.integrationConfig.findMany({ where: { business_id } })

    if (!config || !business) {
      return NextResponse.json({ error: "Config not found" }, { status: 404 })
    }

    // Find platform-specific integrations
    const igIntegration = integrations.find(i => i.platform === 'instagram')
    const waIntegration = integrations.find(i => i.platform === 'whatsapp')

    // Build the response format cafe-chatbot expects
    const response: Record<string, any> = {
      name: business.name,
      chatbot_enabled: config.chatbot_enabled ?? true,
      address: config.address || business.location || "",
      phone: config.phone || "",
      tone: config.tone || "friendly",
      table_count: config.table_count || 0,
      campaigns: config.campaigns ? config.campaigns.split('\n').filter(Boolean) : [],
      menu: config.menu ? JSON.parse(config.menu) : "",
      working_hours: config.working_hours ? JSON.parse(config.working_hours) : {},

      // Integration tokens — chatbot reads these to send IG/WA replies
      instagram_page_id: igIntegration?.platform_identifier || null,
      instagram_access_token: igIntegration?.access_token || null,
      whatsapp_phone_number_id: waIntegration?.platform_identifier || null,
      whatsapp_access_token: waIntegration?.access_token || null,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("[chatbot-config] Error:", error)
    return NextResponse.json({ error: "Failed to fetch config" }, { status: 500 })
  }
}
