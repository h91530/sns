'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  email: string
}

export default function Home() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkUser = async () => {
      try {
        const response = await fetch('/api/auth/me')
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.user) {
            setUser(data.user)
            // 사용자가 이미 로그인되어 있으면 피드로 이동
            router.push('/feed')
          } else {
            setLoading(false)
          }
        } else {
          setLoading(false)
        }
      } catch (error) {
        console.error('User check error:', error)
        setLoading(false)
      }
    }

    checkUser()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center text-white text-xl font-bold mb-4 animate-pulse">
            Y
          </div>
          <div className="text-gray-600 text-sm font-medium">
            로딩 중...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-container">
      {/* 로고 섹션 */}
      <div className="auth-logo-section">
        <div className="auth-logo-content">
          <div className="auth-logo-icon">📷</div>
          <h1 className="auth-logo-text">Yang</h1>
          <p className="auth-logo-subtitle">순간을 공유하고 연결되는 새로운 경험</p>
        </div>
      </div>

      {/* 폼 섹션 */}
      <div className="auth-form-section">
        <div className="auth-form-wrapper">
          <h2 className="auth-form-title">시작하기</h2>
          <p className="auth-form-subtitle">
            계정을 만들거나 로그인하여 커뮤니티에 참여하세요
          </p>

          <div className="auth-button-group">
            <Link href="/login">
              <button className="auth-button auth-button-primary">
                로그인
              </button>
            </Link>

            <Link href="/signup">
              <button className="auth-button auth-button-secondary">
                계정 만들기
              </button>
            </Link>
          </div>

          <div className="auth-footer">
            © 2024 Yang. 모든 권리 보유.
          </div>
        </div>
      </div>
    </div>
  )
}
