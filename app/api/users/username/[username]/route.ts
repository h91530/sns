import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key'

const supabase = createClient(supabaseUrl, supabaseKey)

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params
    const currentUserId = request.headers.get('x-user-id')

    // 사용자 정보 조회 (username으로)
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, username, avatar, bio, website, created_at')
      .eq('username', username)
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { message: '사용자를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // 사용자의 게시물 조회
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('id, title, content, image_url, created_at, likes_count')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (postsError) {
      return NextResponse.json(
        { message: '게시물을 불러올 수 없습니다' },
        { status: 500 }
      )
    }

    // 각 게시물에 대해 현재 사용자가 좋아요했는지 확인
    let postsWithLikeStatus = posts || []
    if (currentUserId && posts) {
      const postIds = posts.map(p => p.id)
      const { data: likedPosts } = await supabase
        .from('post_likes')
        .select('post_id')
        .eq('user_id', currentUserId)
        .in('post_id', postIds)

      const likedPostIds = new Set(likedPosts?.map(lp => lp.post_id) || [])
      postsWithLikeStatus = posts.map(post => ({
        ...post,
        liked: likedPostIds.has(post.id),
      }))
    } else if (posts) {
      postsWithLikeStatus = posts.map(post => ({
        ...post,
        liked: false,
      }))
    }

    // 팔로워 수 조회
    const { count: followersCount } = await supabase
      .from('follows')
      .select('*', { count: 'exact' })
      .eq('following_id', user.id)

    // 팔로잉 수 조회
    const { count: followingCount } = await supabase
      .from('follows')
      .select('*', { count: 'exact' })
      .eq('follower_id', user.id)

    // 현재 사용자가 이 사용자를 팔로우하는지 확인
    let isFollowing = false
    if (currentUserId) {
      const { data: followData } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', currentUserId)
        .eq('following_id', user.id)
        .single()

      isFollowing = !!followData
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      username: user.username,
      avatar: user.avatar,
      bio: user.bio,
      website: user.website,
      created_at: user.created_at,
      followers_count: followersCount || 0,
      following_count: followingCount || 0,
      posts_count: posts?.length || 0,
      posts: postsWithLikeStatus,
      is_following: isFollowing,
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { message: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params
    const currentUserId = request.headers.get('x-user-id')

    if (!currentUserId) {
      return NextResponse.json(
        { message: '인증이 필요합니다' },
        { status: 401 }
      )
    }

    const { avatar, bio, website } = await request.json()

    // 자신의 프로필인지 확인
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single()

    if (parseInt(currentUserId) !== user?.id) {
      return NextResponse.json(
        { message: '권한이 없습니다' },
        { status: 403 }
      )
    }

    // 프로필 업데이트
    const { data: updatedUser, error } = await supabase
      .from('users')
      .update({
        avatar,
        bio,
        website,
      })
      .eq('id', currentUserId)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { message: '프로필 업데이트에 실패했습니다' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      id: updatedUser.id,
      email: updatedUser.email,
      username: updatedUser.username,
      avatar: updatedUser.avatar,
      bio: updatedUser.bio,
      website: updatedUser.website,
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { message: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
