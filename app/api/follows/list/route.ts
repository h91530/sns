import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const supabase = createClient(supabaseUrl, supabaseKey)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const type = searchParams.get('type') // 'followers' or 'following'
    const currentUserId = request.headers.get('x-user-id') // 현재 로그인한 사용자

    if (!userId || !type) {
      return NextResponse.json(
        { error: 'userId and type are required' },
        { status: 400 }
      )
    }

    if (type !== 'followers' && type !== 'following') {
      return NextResponse.json(
        { error: 'type must be followers or following' },
        { status: 400 }
      )
    }

    let follows: any[] = []

    if (type === 'followers') {
      // 이 사용자를 팔로우하는 사람들
      const { data, error } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('following_id', userId)

      if (error) {
        console.error('Database error:', error)
        return NextResponse.json(
          { error: 'Failed to fetch followers' },
          { status: 500 }
        )
      }

      // 각 팔로워의 사용자 정보 가져오기
      const followerIds = data?.map(f => f.follower_id) || []
      if (followerIds.length > 0) {
        const { data: users, error: userError } = await supabase
          .from('users')
          .select('id, username, avatar, bio')
          .in('id', followerIds)

        if (!userError && users) {
          follows = users
        }
      }
    } else {
      // 이 사용자가 팔로우하는 사람들
      const { data, error } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId)

      if (error) {
        console.error('Database error:', error)
        return NextResponse.json(
          { error: 'Failed to fetch following' },
          { status: 500 }
        )
      }

      // 각 팔로잉의 사용자 정보 가져오기
      const followingIds = data?.map(f => f.following_id) || []
      if (followingIds.length > 0) {
        const { data: users, error: userError } = await supabase
          .from('users')
          .select('id, username, avatar, bio')
          .in('id', followingIds)

        if (!userError && users) {
          follows = users
        }
      }
    }

    // 현재 사용자가 각 사용자를 팔로우하고 있는지 확인
    if (currentUserId && follows.length > 0) {
      const followUserIds = follows.map(u => u.id)
      const { data: followingStatus, error: followError } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', currentUserId)
        .in('following_id', followUserIds)

      if (!followError && followingStatus) {
        const followingSet = new Set(followingStatus.map(f => f.following_id))
        follows = follows.map(u => ({
          ...u,
          isFollowing: followingSet.has(u.id)
        }))
      }
    }

    return NextResponse.json({ follows })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    )
  }
}
