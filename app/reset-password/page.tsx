'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAlert } from '@/context/AlertContext'

interface ResetResponse {
  message?: string
  error?: string
  debug?: {
    resetUrl?: string
  }
}

export default function ResetPasswordRequestPage() {
  const { showAlert } = useAlert()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [debugLink, setDebugLink] = useState('')

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    setDebugLink('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/reset/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data: ResetResponse = await response.json()

      if (!response.ok) {
        const message = data.error || '비밀번호 재설정 요청에 실패했습니다.'
        setError(message)
        showAlert(message, 'error')
        return
      }

      const message = data.message || '비밀번호 재설정 안내 메일이 발송되었다면 곧 도착할 거예요. 메일함을 확인해 주세요.'
      setSuccess(message)
      showAlert(message, 'success', 4000)

      if (data.debug?.resetUrl) {
        setDebugLink(data.debug.resetUrl)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '잠시 후 다시 시도해 주세요.'
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
          <p className="auth-logo-subtitle">계정 보안을 안전하게 지켜 드릴게요.</p>
        </div>
      </div>

      <div className="auth-form-section">
        <div className="auth-form-wrapper">
          <h2 className="auth-form-title">비밀번호 재설정</h2>
          <p className="auth-form-subtitle">
            가입하신 이메일을 입력하면 재설정 링크를 보내 드립니다.
          </p>

          {error && <div className="auth-error">{error}</div>}
          {success && <div className="auth-success">{success}</div>}

          <form onSubmit={handleSubmit}>
            <div className="auth-form-group">
              <label htmlFor="email" className="auth-label">이메일 주소</label>
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
              {loading ? '요청 처리 중...' : '재설정 메일 보내기'}
            </button>
          </form>

          {debugLink && (
            <div className="auth-success" style={{ marginTop: '16px' }}>
              개발 환경: <a href={debugLink} className="auth-link" target="_blank" rel="noopener noreferrer">링크로 바로 이동하기</a>
            </div>
          )}

          <div className="auth-divider">
            <span className="auth-divider-text">또는</span>
          </div>

          <div className="auth-link-text">
            비밀번호를 기억하셨나요?{' '}
            <Link href="/login" className="auth-link">
              로그인으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
