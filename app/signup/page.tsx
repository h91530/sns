'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAlert } from '@/context/AlertContext'
import { useAuthStore } from '@/store/authStore'

export default function SignUp() {
  const router = useRouter()
  const { showAlert } = useAlert()
  const setUser = useAuthStore((state) => state.setUser)
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // 회원가입 API 호출
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        credentials: 'include', // 쿠키 포함
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          username,
          password,
          confirmPassword,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMsg = data.message || data.error || '회원가입 실패'
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

      showAlert('회원가입 성공! 피드로 이동합니다.', 'success')
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
          <p className="auth-logo-subtitle">커뮤니티에 참여하세요</p>
        </div>
      </div>

      <div className="auth-form-section">
        <div className="auth-form-wrapper">
          <h2 className="auth-form-title">계정 만들기</h2>
          <p className="auth-form-subtitle">양에 참여하고 멋진 순간들을 공유해보세요</p>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSignUp}>
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
              <label htmlFor="username" className="auth-label">사용자명</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="고유한 사용자명을 선택하세요"
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
                placeholder="강력한 비밀번호를 만드세요"
                className="auth-input"
                required
                disabled={loading}
              />
            </div>

            <div className="auth-form-group">
              <label htmlFor="confirmPassword" className="auth-label">비밀번호 확인</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="비밀번호를 다시 입력하세요"
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
              {loading ? '계정 생성 중...' : '계정 만들기'}
            </button>
          </form>

          <div className="auth-divider">
            <span className="auth-divider-text">또는</span>
          </div>

          <div className="auth-link-text">
            이미 계정이 있으신가요?{' '}
            <Link href="/login" className="auth-link">
              여기서 로그인
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
