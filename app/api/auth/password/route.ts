import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'
import bcrypt from 'bcryptjs'
import { sendMail } from '@/lib/mailer'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key'

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

export async function PATCH(request: NextRequest) {
  try {
    const cookieUserId = request.cookies.get('user_id')?.value
    const headerUserId = request.headers.get('x-user-id')
    const currentUserId = cookieUserId || headerUserId

    if (!currentUserId) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      )
    }

    const { currentPassword, newPassword, confirmPassword, verificationCode } = await request.json()

    if (
      !currentPassword ||
      typeof currentPassword !== 'string' ||
      !newPassword ||
      typeof newPassword !== 'string' ||
      !confirmPassword ||
      typeof confirmPassword !== 'string'
    ) {
      return NextResponse.json(
        { error: '모든 필드를 올바르게 입력해 주세요.' },
        { status: 400 }
      )
    }

    if (!verificationCode || typeof verificationCode !== 'string') {
      return NextResponse.json(
        { error: '이메일로 받은 인증 코드를 입력해 주세요.' },
        { status: 400 }
      )
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: '새 비밀번호와 확인 비밀번호가 일치하지 않습니다.' },
        { status: 400 }
      )
    }

    if (newPassword.length < 5) {
      return NextResponse.json(
        { error: '비밀번호는 5자 이상이어야 합니다.' },
        { status: 400 }
      )
    }

    if (currentPassword === newPassword) {
      return NextResponse.json(
        { error: '기존 비밀번호와 다른 새 비밀번호를 사용해 주세요.' },
        { status: 400 }
      )
    }

    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, password_hash')
      .eq('id', currentUserId)
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { error: '사용자 정보를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    const codeHash = createHash('sha256').update(`change:${verificationCode}`).digest('hex')

    const { data: changeToken, error: changeTokenError } = await supabaseAdmin
      .from('password_reset_tokens')
      .select('id, user_id, expires_at, used_at')
      .eq('token_hash', codeHash)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (changeTokenError || !changeToken || changeToken.user_id !== user.id) {
      return NextResponse.json(
        { error: '인증 코드가 올바르지 않습니다.' },
        { status: 400 }
      )
    }

    const codeExpired = new Date(changeToken.expires_at).getTime() < Date.now()

    if (changeToken.used_at || codeExpired) {
      return NextResponse.json(
        { error: '인증 코드가 만료되었거나 이미 사용되었습니다.' },
        { status: 410 }
      )
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash)

    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { error: '현재 비밀번호가 올바르지 않습니다.' },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)

    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ password_hash: hashedPassword })
      .eq('id', user.id)

    if (updateError) {
      console.error('Password update error:', updateError)
      return NextResponse.json(
        { error: '비밀번호를 변경하지 못했습니다.' },
        { status: 500 }
      )
    }

    const usedAt = new Date().toISOString()

    await supabaseAdmin
      .from('password_reset_tokens')
      .update({ used_at: usedAt })
      .eq('id', changeToken.id)

    await supabaseAdmin
      .from('password_reset_tokens')
      .update({ used_at: usedAt })
      .eq('user_id', user.id)
      .neq('id', changeToken.id)
      .is('used_at', null)

    await supabaseAdmin
      .from('password_reset_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('used_at', null)

    if (user.email) {
      await sendMail({
        to: user.email,
        subject: '[sns] 비밀번호가 변경되었습니다',
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111;">
            <p>안녕하세요.</p>
            <p>회원님의 계정 비밀번호가 방금 변경되었습니다.</p>
            <p>본인이 요청한 변경이 아니라면 즉시 비밀번호를 다시 재설정하고, 계정 활동을 확인해 주세요.</p>
            <p style="margin-top: 24px;">감사합니다.<br/>sns 팀</p>
          </div>
        `,
      })
    }

    return NextResponse.json({
      message: '비밀번호가 변경되었습니다.'
    })
  } catch (error) {
    console.error('Password change error:', error)
    return NextResponse.json(
      { error: '비밀번호 변경 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
