import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomBytes, createHash } from 'crypto'
import { sendMail } from '@/lib/mailer'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key'

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

const TOKEN_TTL_MINUTES = Number(process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES ?? 60)
const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: '유효한 이메일을 입력해 주세요.' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.trim().toLowerCase()

    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('email', normalizedEmail)
      .single()

    if (userError || !user) {
      return NextResponse.json({
        message: '비밀번호 재설정 안내 메일이 발송되었다면 곧 도착할 거예요. 메일함을 확인해 주세요.'
      })
    }

    const token = randomBytes(32).toString('hex')
    const tokenHash = createHash('sha256').update(token).digest('hex')
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000).toISOString()

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
          token_hash: tokenHash,
          expires_at: expiresAt,
        }
      ])

    if (insertError) {
      console.error('Password reset token insert error:', insertError)
      return NextResponse.json(
        { error: '비밀번호 재설정 요청을 처리하지 못했습니다.' },
        { status: 500 }
      )
    }

    const resetUrl = `${APP_BASE_URL.replace(/\/$/, '')}/reset-password/${token}`

    const emailSent = await sendMail({
      to: user.email,
      subject: '[sns] 비밀번호 재설정 안내',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111;">
          <p>안녕하세요.</p>
          <p>아래 버튼을 클릭하여 비밀번호를 재설정해 주세요. 이 링크는 ${TOKEN_TTL_MINUTES}분 동안만 유효합니다.</p>
          <p style="margin: 24px 0;">
            <a href="${resetUrl}" style="display: inline-block; padding: 10px 18px; background: #111; color: #fff; text-decoration: none; border-radius: 6px;">비밀번호 재설정하기</a>
          </p>
          <p>버튼이 동작하지 않을 경우 아래 링크를 복사해 주소창에 붙여넣어 주세요.</p>
          <p style="word-break: break-all; color: #555;">${resetUrl}</p>
          <p>만약 본인이 요청하지 않은 경우 이 메일을 무시해 주세요. 계정 보안을 위해 비밀번호를 변경하셨다면 추가 조치를 취하시는 것을 권장드립니다.</p>
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

    const responsePayload: Record<string, unknown> = {
      message: '비밀번호 재설정 안내 메일이 발송되었다면 곧 도착할 거예요. 메일함을 확인해 주세요.'
    }

    if (process.env.NODE_ENV !== 'production') {
      responsePayload.debug = {
        resetUrl
      }
    }

    return NextResponse.json(responsePayload)
  } catch (error) {
    console.error('Password reset request error:', error)
    return NextResponse.json(
      { error: '비밀번호 재설정 요청을 처리하지 못했습니다.' },
      { status: 500 }
    )
  }
}
