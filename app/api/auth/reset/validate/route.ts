import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key'

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { error: '토큰이 필요합니다.' },
        { status: 400 }
      )
    }

    const tokenHash = createHash('sha256').update(token).digest('hex')

    const { data: resetToken, error: tokenError } = await supabaseAdmin
      .from('password_reset_tokens')
      .select('id, expires_at, used_at')
      .eq('token_hash', tokenHash)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (tokenError || !resetToken) {
      return NextResponse.json(
        { error: '유효하지 않은 토큰입니다.' },
        { status: 404 }
      )
    }

    const isExpired = new Date(resetToken.expires_at).getTime() < Date.now()

    if (resetToken.used_at || isExpired) {
      return NextResponse.json(
        { error: '토큰이 만료되었거나 이미 사용되었습니다.' },
        { status: 410 }
      )
    }

    return NextResponse.json({ valid: true })
  } catch (error) {
    console.error('Password reset token validation error:', error)
    return NextResponse.json(
      { error: '토큰 확인 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
