import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key'

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: '이메일 주소를 입력해 주세요.' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.trim().toLowerCase()

    if (!normalizedEmail) {
      return NextResponse.json(
        { error: '이메일 주소를 입력해 주세요.' },
        { status: 400 }
      )
    }

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('username')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (error) {
      console.error('Find ID query error:', error)
      return NextResponse.json(
        { error: '아이디를 조회하지 못했습니다. 잠시 후 다시 시도해 주세요.' },
        { status: 500 }
      )
    }

    if (!user?.username) {
      return NextResponse.json(
        { error: '입력하신 이메일로 가입된 계정을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      message: '계정을 찾았습니다.',
      username: user.username,
    })
  } catch (error) {
    console.error('Find ID request error:', error)
    return NextResponse.json(
      { error: '아이디 찾기 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
