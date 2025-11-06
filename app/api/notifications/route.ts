import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  try {
    const numericUserId = parseInt(userId)
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    // 알림 조회 (먼저 기본 필드만 가져오기)
    const { data: notifications, error: fetchError } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('recipient_id', numericUserId)
      .order('created_at', { ascending: false })
      .limit(limit)
      .range(offset, offset + limit - 1)

    console.log('Query result:', { notifications, fetchError, numericUserId, limit, offset })

    // actor 정보 추가 (필요한 경우)
    let notificationsWithActor = notifications
    if (notifications && notifications.length > 0) {
      const actorIds = [...new Set(notifications.map((n: any) => n.actor_id))]
      const { data: actors } = await supabaseAdmin
        .from('users')
        .select('id, username, email')
        .in('id', actorIds)

      const actorMap = new Map(actors?.map((a: any) => [a.id, a]) || [])
      notificationsWithActor = notifications.map((n: any) => ({
        ...n,
        actor: actorMap.get(n.actor_id),
      }))
    }

    if (fetchError) {
      console.error('Failed to fetch notifications:', JSON.stringify(fetchError))
      return NextResponse.json({
        error: '알림을 불러올 수 없습니다.',
        details: fetchError?.message
      }, { status: 500 })
    }

    // 읽지 않은 알림 개수
    const { count: unreadCount, error: countError } = await supabaseAdmin
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', numericUserId)
      .eq('is_read', false)

    if (countError) {
      console.error('Failed to fetch unread count:', countError)
    }

    return NextResponse.json({
      notifications: notificationsWithActor || [],
      unreadCount: unreadCount || 0,
    })
  } catch (error) {
    console.error('Unexpected notification fetch error:', error)
    return NextResponse.json({ error: '알림을 불러올 수 없습니다.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  const numericUserId = parseInt(userId || '0')

  try {
    const { recipientId, type, targetType, targetId, content } = await request.json()

    if (!recipientId || !type || !targetType) {
      return NextResponse.json({ error: '필수 필드가 누락되었습니다.' }, { status: 400 })
    }

    // 자신에게는 알림을 보내지 않음
    if (recipientId === numericUserId) {
      return NextResponse.json({ notification: null })
    }

    // 이미 동일한 알림이 있는지 확인 (중복 방지)
    const { data: existingNotification, error: checkError } = await supabaseAdmin
      .from('notifications')
      .select('id')
      .eq('recipient_id', recipientId)
      .eq('actor_id', numericUserId)
      .eq('type', type)
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .eq('is_read', false)
      .maybeSingle()

    if (checkError) {
      console.error('Failed to check existing notification:', checkError)
    }

    // 동일한 미읽음 알림이 있으면 그것을 반환
    if (existingNotification) {
      return NextResponse.json({ notification: existingNotification })
    }

    // 새 알림 생성
    const { data: notification, error: insertError } = await supabaseAdmin
      .from('notifications')
      .insert({
        recipient_id: recipientId,
        actor_id: numericUserId,
        type,
        target_type: targetType,
        target_id: targetId,
        content: content || '',
        is_read: false,
      })
      .select('id, type, target_type, target_id, content, is_read, created_at')
      .single()

    if (insertError) {
      console.error('Failed to create notification:', insertError)
      return NextResponse.json({ error: '알림을 생성할 수 없습니다.' }, { status: 500 })
    }

    return NextResponse.json({ notification }, { status: 201 })
  } catch (error) {
    console.error('Unexpected notification create error:', error)
    return NextResponse.json({ error: '알림을 생성할 수 없습니다.' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  try {
    const numericUserId = parseInt(userId)
    const { searchParams } = new URL(request.url)
    const markAllAsRead = searchParams.get('markAllAsRead') === 'true'
    const { notificationId, isRead } = await request.json()

    if (markAllAsRead) {
      // 모든 알림을 읽음 처리
      const { error: updateError } = await supabaseAdmin
        .from('notifications')
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq('recipient_id', numericUserId)
        .eq('is_read', false)

      if (updateError) {
        console.error('Failed to mark all as read:', updateError)
        return NextResponse.json({ error: '알림 업데이트에 실패했습니다.' }, { status: 500 })
      }

      return NextResponse.json({ message: '모든 알림을 읽음 처리했습니다.' })
    }

    if (!notificationId) {
      return NextResponse.json({ error: '알림 ID가 필요합니다.' }, { status: 400 })
    }

    // 특정 알림 업데이트
    const { data: notification, error: updateError } = await supabaseAdmin
      .from('notifications')
      .update({ is_read: isRead, updated_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('recipient_id', numericUserId)
      .select('id, is_read')
      .single()

    if (updateError) {
      console.error('Failed to update notification:', updateError)
      return NextResponse.json({ error: '알림 업데이트에 실패했습니다.' }, { status: 500 })
    }

    if (!notification) {
      return NextResponse.json({ error: '알림을 찾을 수 없습니다.' }, { status: 404 })
    }

    return NextResponse.json({ notification })
  } catch (error) {
    console.error('Unexpected notification update error:', error)
    return NextResponse.json({ error: '알림 업데이트에 실패했습니다.' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  try {
    const numericUserId = parseInt(userId)
    const { notificationId } = await request.json()

    if (!notificationId) {
      return NextResponse.json({ error: '알림 ID가 필요합니다.' }, { status: 400 })
    }

    // 특정 알림 삭제
    const { error: deleteError } = await supabaseAdmin
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('recipient_id', numericUserId)

    if (deleteError) {
      console.error('Failed to delete notification:', deleteError)
      return NextResponse.json({ error: '알림 삭제에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ message: '알림이 삭제되었습니다.' })
  } catch (error) {
    console.error('Unexpected notification delete error:', error)
    return NextResponse.json({ error: '알림 삭제에 실패했습니다.' }, { status: 500 })
  }
}
