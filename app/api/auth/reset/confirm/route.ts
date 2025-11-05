import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'
import bcrypt from 'bcryptjs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key'

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

export async function POST(request: NextRequest) {
  try {
    const { token, password, confirmPassword } = await request.json()

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: '토큰이 필요합니다.' },
        { status: 400 }
      )
    }

    if (!password || typeof password !== 'string' || !confirmPassword || typeof confirmPassword !== 'string') {
      return NextResponse.json(
        { error: '새 비밀번호를 입력해 주세요.' },
        { status: 400 }
      )
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: '비밀번호가 서로 일치하지 않습니다.' },
        { status: 400 }
      )
    }

    if (password.length < 5) {
      return NextResponse.json(
        { error: '비밀번호는 5자 이상이어야 합니다.' },
        { status: 400 }
      )
    }

    const tokenHash = createHash('sha256').update(token).digest('hex')

    const { data: resetToken, error: tokenError } = await supabaseAdmin
      .from('password_reset_tokens')
      .select('id, user_id, expires_at, used_at')
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

    const hashedPassword = await bcrypt.hash(password, 10)

    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ password_hash: hashedPassword })
      .eq('id', resetToken.user_id)

    if (updateError) {
      console.error('Password update error:', updateError)
      return NextResponse.json(
        { error: '비밀번호를 업데이트하지 못했습니다.' },
        { status: 500 }
      )
    }

    const usedAt = new Date().toISOString()

    await supabaseAdmin
      .from('password_reset_tokens')
      .update({ used_at: usedAt })
      .eq('id', resetToken.id)

    await supabaseAdmin
      .from('password_reset_tokens')
      .update({ used_at: usedAt })
      .eq('user_id', resetToken.user_id)
      .neq('id', resetToken.id)
      .is('used_at', null)

    return NextResponse.json({
      message: '비밀번호가 재설정되었습니다. 새 비밀번호로 로그인해 주세요.'
    })
  } catch (error) {
    console.error('Password reset confirm error:', error)
    return NextResponse.json(
      { error: '비밀번호 재설정 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
