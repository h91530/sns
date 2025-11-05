'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAlert } from '@/context/AlertContext'

interface FindIdResponse {
  message?: string
  error?: string
  username?: string
}

export default function FindIdPage() {
  const { showAlert } = useAlert()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [username, setUsername] = useState('')

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setUsername('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/find-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data: FindIdResponse = await response.json()

      if (!response.ok) {
        const message = data.error || '아이디를 찾지 못했습니다.'
        setError(message)
        showAlert(message, 'error')
        return
      }

      if (data.username) {
        setUsername(data.username)
        const message = data.message || '계정을 찾았습니다.'
        showAlert(message, 'success', 4000)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '아이디 찾기 중 오류가 발생했습니다.'
      setError(message)
      showAlert(message, 'error')
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
          <p className="auth-logo-subtitle">가입 시 사용한 이메일 주소로 아이디를 확인해 보세요.</p>
        </div>
      </div>

      <div className="auth-form-section">
        <div className="auth-form-wrapper">
          <h2 className="auth-form-title">아이디 찾기</h2>
          <p className="auth-form-subtitle">
            가입할 때 사용한 이메일 주소를 입력하면 아이디를 확인할 수 있습니다.
          </p>

          {error && <div className="auth-error">{error}</div>}
          {username && (
            <div className="auth-success">
              회원님의 아이디는 <strong>{username}</strong> 입니다.
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="auth-form-group">
              <label htmlFor="email" className="auth-label">
                이메일 주소
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="이메일 주소를 입력해 주세요"
                className="auth-input"
                disabled={loading}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="auth-button auth-button-primary"
            >
              {loading ? '확인 중...' : '아이디 확인'}
            </button>
          </form>

          <div className="auth-divider">
            <span className="auth-divider-text">또는</span>
          </div>

          <div className="auth-link-text">
            비밀번호가 기억나지 않나요?{' '}
            <Link href="/reset-password" className="auth-link">
              비밀번호 찾기
            </Link>
          </div>

          <div className="auth-link-text" style={{ marginTop: 'var(--space-sm)' }}>
            로그인 화면으로 돌아가기{' '}
            <Link href="/login" className="auth-link">
              로그인
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
