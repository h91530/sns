'use client'

import { useState, useEffect } from 'react'
import { fetchWithAuth } from '@/lib/auth'
import { useAlert } from '@/context/AlertContext'

interface Notification {
  id: number
  type: 'follow' | 'like' | 'comment'
  target_type: string
  target_id: number | null
  content: string
  is_read: boolean
  created_at: string
  actor?: {
    id: number
    username: string
    email: string
  }
}

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const { showAlert } = useAlert()

  // 알림 조회
  const fetchNotifications = async () => {
    setLoading(true)
    try {
      const response = await fetchWithAuth('/api/notifications?limit=10&offset=0')
      if (!response.ok) {
        throw new Error('Failed to fetch notifications')
      }

      const data = await response.json()
      setNotifications(data.notifications || [])
      setUnreadCount(data.unreadCount || 0)
    } catch (error) {
      console.error('Fetch notifications error:', error)
    } finally {
      setLoading(false)
    }
  }

  // 알림 읽음 처리
  const markAsRead = async (notificationId: number) => {
    try {
      const response = await fetchWithAuth('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notificationId,
          isRead: true,
        }),
      })

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
        )
        setUnreadCount((prev) => Math.max(prev - 1, 0))
      }
    } catch (error) {
      console.error('Mark as read error:', error)
    }
  }

  // 모든 알림 읽음 처리
  const markAllAsRead = async () => {
    try {
      const response = await fetchWithAuth('/api/notifications?markAllAsRead=true', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      if (response.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
        setUnreadCount(0)
        showAlert('모든 알림을 읽음 처리했습니다.', 'success')
      }
    } catch (error) {
      console.error('Mark all as read error:', error)
    }
  }

  // 알림 삭제
  const deleteNotification = async (notificationId: number) => {
    try {
      const response = await fetchWithAuth('/api/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId }),
      })

      if (response.ok) {
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
        setUnreadCount((prev) => Math.max(prev - 1, 0))
        showAlert('알림이 삭제되었습니다.', 'success')
      }
    } catch (error) {
      console.error('Delete notification error:', error)
    }
  }

  // 컴포넌트 마운트시 초기 알림 로드
  useEffect(() => {
    fetchNotifications()
  }, [])

  useEffect(() => {
    if (isOpen) {
      fetchNotifications()
    }
  }, [isOpen])

  const getNotificationMessage = (notification: Notification) => {
    const username = notification.actor?.username || 'Unknown'
    switch (notification.type) {
      case 'follow':
        return `${username}님이 팔로우했습니다`
      case 'like':
        return `${username}님이 게시물을 좋아합니다`
      case 'comment':
        return `${username}님이 댓글을 달았습니다`
      default:
        return '새로운 알림'
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'follow':
        return '👥'
      case 'like':
        return '❤️'
      case 'comment':
        return '💬'
      default:
        return '🔔'
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors focus:outline-none"
        title="알림"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '40px',
            right: '0',
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
            width: '350px',
            maxHeight: '500px',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* 헤더 */}
          <div
            style={{
              padding: '16px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
              알림
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#0ea5e9',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '500',
                }}
              >
                모두 읽음
              </button>
            )}
          </div>

          {/* 알림 목록 */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              maxHeight: '400px',
            }}
          >
            {loading ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                로딩 중...
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                알림이 없습니다
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => !notification.is_read && markAsRead(notification.id)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #f3f4f6',
                    cursor: 'pointer',
                    background: notification.is_read ? 'white' : '#f0f9ff',
                    transition: 'background 0.2s ease',
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'flex-start',
                  }}
                  onMouseEnter={(e) => {
                    if (!notification.is_read) {
                      (e.currentTarget as HTMLDivElement).style.background = '#e0f2fe'
                    }
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.background = notification.is_read
                      ? 'white'
                      : '#f0f9ff'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'flex-start',
                      flex: 1,
                    }}
                  >
                    <div style={{ fontSize: '20px' }}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          margin: '0 0 4px 0',
                          fontSize: '14px',
                          fontWeight: notification.is_read ? '400' : '600',
                          color: '#333',
                        }}
                      >
                        {getNotificationMessage(notification)}
                      </p>
                      {notification.content && (
                        <p
                          style={{
                            margin: '0 0 4px 0',
                            fontSize: '12px',
                            color: '#666',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {notification.content}
                        </p>
                      )}
                      <time
                        style={{
                          fontSize: '11px',
                          color: '#999',
                        }}
                      >
                        {new Date(notification.created_at).toLocaleString('ko-KR')}
                      </time>
                    </div>
                    {!notification.is_read && (
                      <div
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: '#0ea5e9',
                          flexShrink: 0,
                        }}
                      />
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteNotification(notification.id)
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#999',
                      cursor: 'pointer',
                      fontSize: '18px',
                      padding: '0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      transition: 'color 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.color = '#ef4444'
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.color = '#999'
                    }}
                    title="삭제"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 배경 클릭으로 닫기 */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999,
          }}
        />
      )}
    </div>
  )
}
