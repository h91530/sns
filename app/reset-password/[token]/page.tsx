'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAlert } from '@/context/AlertContext'

interface ResetConfirmResponse {
  message?: string
  error?: string
}

type PageStatus = 'validating' | 'ready' | 'invalid'

interface ResetPasswordProps {
  params: Promise<{
    token: string
  }>
}

export default function ResetPasswordConfirmPage({ params }: ResetPasswordProps) {
  const { token } = use(params)
  const tokenFromUrl = decodeURIComponent(token)
  const router = useRouter()
  const { showAlert } = useAlert()

  const [status, setStatus] = useState<PageStatus>('validating')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    const validateToken = async () => {
      try {
        const response = await fetch(`/api/auth/reset/validate?token=${encodeURIComponent(tokenFromUrl)}`)

        if (!response.ok) {
          const data = await response.json()
          setError(data.error || '토큰 확인에 실패했습니다.')
          setStatus('invalid')
          return
        }

        setStatus('ready')
      } catch (err) {
        const message = err instanceof Error ? err.message : '토큰 확인에 실패했습니다.'
        setError(message)
        setStatus('invalid')
      }
    }

    validateToken()
  }, [tokenFromUrl])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (status !== 'ready') {
      return
    }

    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/reset/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: tokenFromUrl,
          password,
          confirmPassword,
        }),
      })

      const data: ResetConfirmResponse = await response.json()

      if (!response.ok) {
        const message = data.error || '비밀번호 재설정에 실패했습니다.'
        setError(message)
        showAlert(message, 'error')
        return
      }

      const message = data.message || '비밀번호가 변경되었습니다.'
      setSuccess(message)
      showAlert(message, 'success', 4000)
      setStatus('invalid')

      setTimeout(() => {
        router.push('/login')
      }, 2000)
    } catch (err) {
      const message = err instanceof Error ? err.message : '비밀번호 재설정에 실패했습니다.'
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
          <p className="auth-logo-subtitle">안전한 비밀번호로 계정을 보호하세요.</p>
        </div>
      </div>

      <div className="auth-form-section">
        <div className="auth-form-wrapper">
          <h2 className="auth-form-title">새 비밀번호 설정</h2>
          <p className="auth-form-subtitle">
            보안을 위해 이전과 다른 비밀번호를 추천드려요.
          </p>

          {status === 'validating' && (
            <div className="auth-success">토큰을 확인하는 중입니다...</div>
          )}

          {error && <div className="auth-error">{error}</div>}
          {success && <div className="auth-success">{success}</div>}

          {status === 'ready' && (
            <form onSubmit={handleSubmit}>
              <div className="auth-form-group">
                <label htmlFor="password" className="auth-label">새 비밀번호</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="새 비밀번호를 입력해 주세요"
                  className="auth-input"
                  disabled={loading}
                  minLength={8}
                  required
                />
              </div>

              <div className="auth-form-group">
                <label htmlFor="confirmPassword" className="auth-label">비밀번호 확인</label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="다시 한 번 입력해 주세요"
                  className="auth-input"
                  disabled={loading}
                  minLength={8}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="auth-button auth-button-primary"
              >
                {loading ? '변경 중...' : '비밀번호 변경하기'}
              </button>
            </form>
          )}

          {status === 'invalid' && !success && (
            <div className="auth-link-text">
              토큰이 만료되었나요?{' '}
              <Link href="/reset-password" className="auth-link">
                새 토큰 요청하기
              </Link>
            </div>
          )}

          <div className="auth-divider">
            <span className="auth-divider-text">또는</span>
          </div>

          <div className="auth-link-text">
            이미 비밀번호를 변경하셨나요?{' '}
            <Link href="/login" className="auth-link">
              로그인으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
