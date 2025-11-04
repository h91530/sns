import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key'

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

export async function POST(request: NextRequest) {
  try {
    const { email, username, password, confirmPassword } = await request.json()

    if (!email || !username || !password || !confirmPassword) {
      return NextResponse.json(
        { error: '모든 필드가 필요합니다' },
        { status: 400 }
      )
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: '비밀번호가 일치하지 않습니다' },
        { status: 400 }
      )
    }

    // 사용자 존재 여부 확인
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: '이미 존재하는 이메일입니다' },
        { status: 409 }
      )
    }

    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(password, 10)

    // 새 사용자 생성
    const { data: newUser, error: insertError } = await supabaseAdmin
      .from('users')
      .insert([
        {
          email,
          username,
          password_hash: hashedPassword,
        }
      ])
      .select()
      .single()

    if (insertError) {
      return NextResponse.json(
        { error: '사용자 생성에 실패했습니다' },
        { status: 500 }
      )
    }

    const response = NextResponse.json({
      message: '회원가입 성공',
      user: {
        id: newUser.id,
        email: newUser.email,
        username: newUser.username,
      }
    })

    response.cookies.set('user_id', newUser.id.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 86400
    })

    return response
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: '회원가입 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
