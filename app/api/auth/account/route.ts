import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key'

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

export async function DELETE(request: NextRequest) {
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

    // 사용자 정보 조회
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', currentUserId)
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { error: '사용자 정보를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 관련 데이터 삭제 (외래키 제약이 있으므로 순서 주의)

    // 1. 댓글 반응 삭제
    await supabaseAdmin
      .from('comment_reactions')
      .delete()
      .eq('user_id', user.id)

    // 2. 댓글 답글 삭제
    await supabaseAdmin
      .from('comment_replies')
      .delete()
      .eq('user_id', user.id)

    // 3. 댓글 삭제
    await supabaseAdmin
      .from('comments')
      .delete()
      .eq('user_id', user.id)

    // 4. 게시물 좋아요 삭제
    await supabaseAdmin
      .from('post_likes')
      .delete()
      .eq('user_id', user.id)

    // 5. 게시물 삭제
    await supabaseAdmin
      .from('posts')
      .delete()
      .eq('user_id', user.id)

    // 6. 팔로우 관계 삭제
    await supabaseAdmin
      .from('follows')
      .delete()
      .or(`follower_id.eq.${user.id},following_id.eq.${user.id}`)

    // 7. 친구 관계 삭제
    await supabaseAdmin
      .from('friends')
      .delete()
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)

    // 8. 메시지 삭제
    await supabaseAdmin
      .from('messages')
      .delete()
      .eq('sender_id', user.id)

    // 9. 대화 삭제
    await supabaseAdmin
      .from('conversations')
      .delete()
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)

    // 10. 비밀번호 재설정 토큰 삭제
    await supabaseAdmin
      .from('password_reset_tokens')
      .delete()
      .eq('user_id', user.id)

    // 11. 1:1 문의 삭제
    await supabaseAdmin
      .from('user_inquiries')
      .delete()
      .eq('user_id', user.id)

    // 12. 알림 삭제 (두 개의 쿼리로 분리)
    await supabaseAdmin
      .from('notifications')
      .delete()
      .eq('recipient_id', user.id)

    await supabaseAdmin
      .from('notifications')
      .delete()
      .eq('actor_id', user.id)

    // 13. 사용자 삭제
    const { error: deleteError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', user.id)

    if (deleteError) {
      console.error('Account deletion error:', deleteError)
      return NextResponse.json(
        { error: '계정을 삭제하지 못했습니다.' },
        { status: 500 }
      )
    }

    // 응답에서 쿠키 제거
    const response = NextResponse.json({
      message: '계정이 삭제되었습니다.'
    })

    response.cookies.set('user_id', '', {
      maxAge: 0,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Account deletion error:', error)
    return NextResponse.json(
      { error: '계정 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
