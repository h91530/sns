import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key'

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: '이메일과 비밀번호가 필요합니다' },
        { status: 400 }
      )
    }

    // 데이터베이스에서 사용자 조회
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, password_hash, username')
      .eq('email', email)
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { error: '이메일 또는 비밀번호가 잘못되었습니다' },
        { status: 401 }
      )
    }

    // 비밀번호 확인 (bcrypt 사용)
    const passwordMatch = await bcrypt.compare(password, user.password_hash)
    if (!passwordMatch) {
      return NextResponse.json(
        { error: '이메일 또는 비밀번호가 잘못되었습니다' },
        { status: 401 }
      )
    }

    // 응답 설정
    const response = NextResponse.json({
      message: '로그인 성공',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      }
    })

    // 쿠키 설정
    response.cookies.set('user_id', user.id.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 86400
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: '로그인 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
