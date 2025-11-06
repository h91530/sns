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

export async function POST(request: NextRequest) {
  const { userId, response } = getNumericUserId(request)
  if (response) {
    return response
  }

  if (userId === null) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  try {
    const nowIso = new Date().toISOString()
    const { error } = await supabaseAdmin
      .from('user_inquiries')
      .update({ last_viewed_at: nowIso })
      .eq('user_id', userId)

    if (error) {
      console.error('Failed to mark inquiries as viewed:', error)
      return NextResponse.json({ error: '문의 상태 업데이트에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (updateError) {
    console.error('Unexpected mark viewed error:', updateError)
    return NextResponse.json({ error: '문의 상태 업데이트에 실패했습니다.' }, { status: 500 })
  }
}
