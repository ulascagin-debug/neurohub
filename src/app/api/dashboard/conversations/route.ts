export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// In-memory cache for Instagram username lookups
const igUsernameCache = new Map<string, string>()

async function resolveInstagramUsername(
  igUserId: string,
  businessId: string
): Promise<string> {
  if (igUsernameCache.has(igUserId)) return igUsernameCache.get(igUserId)!

  try {
    // Get Instagram access token from integration config
    const integration = await prisma.integrationConfig.findFirst({
      where: { business_id: businessId, platform: 'instagram' }
    })

    if (!integration?.access_token) {
      igUsernameCache.set(igUserId, igUserId)
      return igUserId
    }

    const res = await fetch(
      `https://graph.instagram.com/v21.0/${igUserId}?fields=username,name&access_token=${integration.access_token}`
    )

    if (res.ok) {
      const data = await res.json()
      const username = data.username || data.name || igUserId
      igUsernameCache.set(igUserId, username)
      return username
    }
  } catch (e) {
    console.error(`[IG lookup] Failed for ${igUserId}:`, e)
  }

  igUsernameCache.set(igUserId, igUserId)
  return igUserId
}

interface SessionGroup {
  id: string
  session_id: string
  user_id: string
  platform: string
  display_name: string
  last_message: string
  last_time: string
  first_time: string
  message_count: number
  status: string
  has_reservation: boolean
  messages: Array<{
    id: string
    content: string
    response: string | null
    user_id: string | null
    platform: string
    created_at: string
  }>
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const business_id = searchParams.get('business_id')
  const statusFilter = searchParams.get('status') // all | active | completed
  const reservationFilter = searchParams.get('has_reservation') // true | false

  if (!business_id) return NextResponse.json({ error: "Missing business_id" }, { status: 400 })

  try {
    // Build where clause
    const where: Record<string, unknown> = { business_id }
    if (statusFilter && statusFilter !== 'all') {
      where.session_status = statusFilter
    }
    if (reservationFilter === 'true') {
      where.has_reservation = true
    }

    const messages = await prisma.message.findMany({
      where,
      orderBy: { created_at: 'asc' }
    })

    // Group by user_id + platform
    const userMap = new Map<string, typeof messages>()
    for (const msg of messages) {
      const uid = `${msg.platform}_${msg.user_id || 'anon'}`
      if (!userMap.has(uid)) userMap.set(uid, [])
      userMap.get(uid)!.push(msg)
    }

    // Collect unique Instagram user IDs for batch resolution
    const igUserIds = new Set<string>()
    for (const [, userMsgs] of Array.from(userMap)) {
      const platform = userMsgs[0].platform
      const userId = userMsgs[0].user_id
      if (platform === 'instagram' && userId && userId !== 'anonymous') {
        igUserIds.add(userId)
      }
    }

    // Resolve all Instagram usernames in parallel
    const igResolvePromises = Array.from(igUserIds).map(uid =>
      resolveInstagramUsername(uid, business_id)
    )
    await Promise.all(igResolvePromises)

    const conversations: SessionGroup[] = []

    for (const [uidKey, userMsgs] of Array.from(userMap)) {
      // Sort messages ascending
      userMsgs.sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

      const firstMsg = userMsgs[0]
      const lastMsg = userMsgs[userMsgs.length - 1]
      const platform = firstMsg.platform
      const userId = firstMsg.user_id || 'anonymous'

      // Build display name
      let displayName = userId
      if (platform === 'whatsapp' && userId !== 'anonymous') {
        displayName = userId
      } else if (platform === 'instagram' && userId !== 'anonymous') {
        const resolvedName = igUsernameCache.get(userId) || userId
        displayName = `@${resolvedName.replace(/^@/, '')}`
      }

      // We determine status and has_reservation based on the latest session
      // OR by accumulating them
      const latestSessionId = lastMsg.session_id || `legacy_${uidKey}`
      const isActive = userMsgs.some(m => m.session_status === 'active')
      const hasRes = userMsgs.some(m => m.has_reservation)

      conversations.push({
        id: uidKey, // Use user unique key as folder ID
        session_id: latestSessionId, // Close/open acts on the latest session
        user_id: userId,
        platform,
        display_name: displayName, // Removed session date from name, it's a person folder now
        last_message: lastMsg.content || lastMsg.response || '',
        last_time: lastMsg.created_at.toISOString(),
        first_time: firstMsg.created_at.toISOString(),
        message_count: userMsgs.length,
        status: isActive ? 'active' : 'completed',
        has_reservation: hasRes,
        messages: userMsgs.map(m => ({
          id: m.id,
          content: m.content,
          response: m.response,
          user_id: m.user_id,
          platform: m.platform,
          created_at: m.created_at.toISOString(),
        })),
      })
    }

    // Sort newest first
    conversations.sort((a, b) => new Date(b.last_time).getTime() - new Date(a.last_time).getTime())

    return NextResponse.json({ conversations })
  } catch (error) {
    console.error("[conversations] Error:", error)
    return NextResponse.json({ error: "Failed to fetch conversations" }, { status: 500 })
  }
}

// PATCH: Close/reopen a conversation session
export async function PATCH(req: Request) {
  try {
    const body = await req.json()
    const { session_id, status } = body

    if (!session_id || !status) {
      return NextResponse.json({ error: "Missing session_id or status" }, { status: 400 })
    }

    if (!['active', 'completed'].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    }

    await prisma.message.updateMany({
      where: { session_id },
      data: { session_status: status }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[conversations PATCH] Error:", error)
    return NextResponse.json({ error: "Failed to update session" }, { status: 500 })
  }
}
