import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'

// Service role client for server-side operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key'
)

// 게시물 생성
export async function POST(request: NextRequest) {
  try {
    const { image_url, title, content } = await request.json()
    const userId = request.headers.get('x-user-id')

    // 필수 필드 검증
    if (!userId || !content) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // 데이터베이스에 게시물 저장
    const { data: post, error } = await supabaseAdmin
      .from('posts')
      .insert([
        {
          user_id: userId,
          title: title || null,
          content,
          image_url,
          likes_count: 0,
        },
      ])
      .select()
      .single()

    if (error) {
      console.error('Post creation error:', error)
      return NextResponse.json(
        { error: 'Failed to create post', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(post, { status: 201 })
  } catch (error) {
    console.error('Post creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create post', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// 게시물 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const currentUserId = request.headers.get('x-user-id')

    let query = supabase
      .from('posts')
      .select('*, users(id, username, avatar)')
      .order('created_at', { ascending: false })

    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data: posts, error } = await query

    if (error) {
      console.error('Posts fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch posts' },
        { status: 500 }
      )
    }

    // 현재 사용자가 좋아요한 게시물 조회
    let likedPostIds: string[] = []
    if (currentUserId) {
      const { data: likedPosts } = await supabase
        .from('post_likes')
        .select('post_id')
        .eq('user_id', currentUserId)

      likedPostIds = (likedPosts || []).map((like: any) => like.post_id)
    }

    // 각 게시물에 댓글과 liked 상태 추가
    const postsWithDetails = await Promise.all(
      (posts || []).map(async (post: any) => {
        const { data: comments } = await supabase
          .from('comments')
          .select('id, content, created_at, likes_count, dislikes_count, users(id, username, avatar)')
          .eq('post_id', post.id)
          .order('created_at', { ascending: false })

        // 각 댓글에 답글 추가
        const commentsWithReplies = await Promise.all(
          (comments || []).map(async (comment: any) => {
            const { data: replies } = await supabase
              .from('comment_replies')
              .select('id, content, created_at, updated_at, users(id, username, avatar)')
              .eq('comment_id', comment.id)
              .order('created_at', { ascending: true })

            return {
              ...comment,
              replies: (replies || []).map((reply: any) => {
                const userObj = Array.isArray(reply.users) ? reply.users[0] : reply.users
                return {
                  id: reply.id,
                  content: reply.content,
                  createdAt: reply.created_at,
                  author: {
                    id: userObj?.id,
                    username: userObj?.username,
                    avatar: userObj?.avatar,
                  },
                }
              }),
            }
          })
        )

        return {
          ...post,
          comments: commentsWithReplies,
          liked: likedPostIds.includes(post.id),
        }
      })
    )

    return NextResponse.json(postsWithDetails)
  } catch (error) {
    console.error('Posts fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    )
  }
}
