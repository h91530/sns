import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key'

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

const getNumericUserId = (request: NextRequest): { response: NextResponse | null; userId: number | null } => {
  const userId = request.headers.get('x-user-id')
  if (!userId) {
    return { response: NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 }), userId: null }
  }

  const numericUserId = Number(userId)
  if (!Number.isInteger(numericUserId)) {
    return {
      response: NextResponse.json({ error: '올바른 사용자 식별자가 아닙니다.' }, { status: 400 }),
      userId: null,
    }
  }

  return { response: null as NextResponse | null, userId: numericUserId }
}

const toTimestamp = (value?: string | null) => {
  if (!value) {
    return 0
  }

  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? 0 : parsed
}

export async function GET(request: NextRequest) {
  const { userId, response } = getNumericUserId(request)
  if (response) {
    return response
  }

  if (userId === null) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('user_inquiries')
      .select('responded_at, status_changed_at, updated_at, last_viewed_at')
      .eq('user_id', userId)

    if (error) {
      console.error('Failed to load unread inquiries:', error)
      return NextResponse.json({ error: '문의 알림 정보를 불러오지 못했습니다.' }, { status: 500 })
    }

    const unreadCount = (data || []).reduce((count, row) => {
      const lastViewed = toTimestamp(row.last_viewed_at)
      const latestActivity = Math.max(
        toTimestamp(row.responded_at),
        toTimestamp(row.status_changed_at),
        toTimestamp(row.updated_at)
      )
      return latestActivity > lastViewed ? count + 1 : count
    }, 0)

    return NextResponse.json({ count: unreadCount })
  } catch (unreadError) {
    console.error('Unexpected unread inquiry error:', unreadError)
    return NextResponse.json({ error: '문의 알림 정보를 불러오지 못했습니다.' }, { status: 500 })
  }
}
