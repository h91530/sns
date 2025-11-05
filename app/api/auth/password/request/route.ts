'use server'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHash, randomInt } from 'crypto'
import { sendMail } from '@/lib/mailer'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key'

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

const CODE_TTL_MINUTES = Number(process.env.PASSWORD_CHANGE_CODE_TTL_MINUTES ?? 10)

const MAIL_SUBJECT = '[sns] 비밀번호 변경 인증 코드'

export async function POST(request: NextRequest) {
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

    let requestPayload: Record<string, unknown> = {}

    try {
      requestPayload = await request.json()
    } catch (parseError) {
      requestPayload = {}
    }

    const requestedEmail =
      typeof requestPayload.email === 'string'
        ? requestPayload.email.trim()
        : ''

    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, username')
      .eq('id', currentUserId)
      .single()

    if (userError || !user) {
      console.error('Password change code: missing user', { userId: currentUserId, user, userError })
      return NextResponse.json(
        { error: '사용자 정보를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    if (!requestedEmail) {
      return NextResponse.json(
        { error: '이메일 주소를 입력해 주세요.' },
        { status: 400 }
      )
    }

    const recipient = requestedEmail.toLowerCase()

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (!emailPattern.test(recipient)) {
      console.error('Password change code: invalid email format', { userId: currentUserId, email: recipient })
      return NextResponse.json(
        { error: '올바른 이메일 주소를 입력해 주세요.' },
        { status: 400 }
      )
    }

    const code = randomInt(100000, 999999).toString()
    const codeHash = createHash('sha256').update(`change:${code}`).digest('hex')
    const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000).toISOString()

    await supabaseAdmin
      .from('password_reset_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('used_at', null)

    const { error: insertError } = await supabaseAdmin
      .from('password_reset_tokens')
      .insert([
        {
          user_id: user.id,
          token_hash: codeHash,
          expires_at: expiresAt,
        }
      ])

    if (insertError) {
      console.error('Password change code insert error:', insertError)
      return NextResponse.json(
        { error: '인증 코드를 생성하지 못했습니다.' },
        { status: 500 }
      )
    }

    const emailSent = await sendMail({
      to: recipient,
      subject: MAIL_SUBJECT,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111;">
          <p>안녕하세요${user.username ? `, ${user.username}` : ''}님.</p>
          <p>비밀번호 변경을 위한 인증 코드는 아래와 같습니다.</p>
          <p style="font-size: 24px; font-weight: bold; letter-spacing: 6px; margin: 24px 0;">${code}</p>
          <p>${CODE_TTL_MINUTES}분 안에 입력해 주세요. 시간이 지나면 자동으로 만료됩니다.</p>
          <p>본인이 요청한 작업이 아니라면 즉시 비밀번호를 변경하고 계정 활동을 확인해 주세요.</p>
          <p style="margin-top: 32px;">감사합니다.<br/>sns 팀</p>
        </div>
      `,
    })

    if (!emailSent) {
      return NextResponse.json(
        { error: '이메일 발송에 실패했습니다. 잠시 후 다시 시도해 주세요.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: '인증 코드가 이메일로 전송되었습니다. 메일함을 확인해 주세요.',
    })
  } catch (error) {
    console.error('Password change code request error:', error)
    return NextResponse.json(
      { error: '인증 코드 전송 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
