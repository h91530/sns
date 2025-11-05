'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAlert } from '@/context/AlertContext'
import { useAuthStore } from '@/store/authStore'

export default function Login() {
  const router = useRouter()
  const { showAlert } = useAlert()
  const setUser = useAuthStore((state) => state.setUser)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // 로그인 API 호출
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include', // 쿠키 포함
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMsg = data.message || data.error || '로그인 실패'
        setError(errorMsg)
        showAlert(errorMsg, 'error')
        return
      }

      // Zustand 스토어에 사용자 정보 저장
      if (data.user?.id) {
        setUser({
          id: data.user.id,
          email: data.user.email,
          username: data.user.username,
        })
      }

      showAlert('로그인 성공!', 'success')
      router.push('/feed')
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.'
      setError(errorMsg)
      showAlert(errorMsg, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-logo-section">
        <div className="auth-logo-content">
          <div className="auth-logo-icon">Y</div>
          <h1 className="auth-logo-text">Yang</h1>
          <p className="auth-logo-subtitle">다시 오신 것을 환영합니다</p>
        </div>
      </div>

      <div className="auth-form-section">
        <div className="auth-form-wrapper">
          <h2 className="auth-form-title">로그인</h2>
          <p className="auth-form-subtitle">다시 오신 것을 환영합니다! 계정에 로그인해주세요</p>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleLogin}>
            <div className="auth-form-group">
              <label htmlFor="email" className="auth-label">이메일 주소</label>
              <input
                id="email"
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="이메일 주소를 입력하세요"
                className="auth-input"
                required
                disabled={loading}
              />
            </div>

            <div className="auth-form-group">
              <label htmlFor="password" className="auth-label">비밀번호</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                className="auth-input"
                required
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="auth-button auth-button-primary"
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>

            <div style={{ marginTop: 'var(--space-md)', display: 'flex', justifyContent: 'space-between', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
              <Link href="/find-id" className="auth-link">
                아이디를 잊으셨나요?
              </Link>
              <Link href="/reset-password" className="auth-link">
                비밀번호를 잊으셨나요?
              </Link>
            </div>
          </form>

          <div className="auth-divider">
            <span className="auth-divider-text">또는</span>
          </div>

          <div className="auth-link-text">
            계정이 없으신가요?{' '}
            <Link href="/signup" className="auth-link">
              지금 만들기
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
