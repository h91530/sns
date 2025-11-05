'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAlert } from '@/context/AlertContext'

interface PasswordChangeResponse {
  message?: string
  error?: string
}

export default function PasswordSettingsPage() {
  const router = useRouter()
  const { showAlert } = useAlert()

  const [checkingAuth, setCheckingAuth] = useState(true)
  const [email, setEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [sendingCode, setSendingCode] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    let active = true

    const verifyUser = async () => {
      try {
        const response = await fetch('/api/auth/me')
        if (!response.ok) {
          throw new Error('인증 정보를 확인할 수 없습니다.')
        }

        const data = await response.json()

        if (!data.user) {
          showAlert('로그인 후 이용해 주세요.', 'warning')
          router.replace('/login')
          return
        }

        if (typeof data.user.email === 'string') {
          setEmail(data.user.email)
        }
      } catch (err) {
        console.error('Password settings auth check error:', err)
        showAlert('세션이 만료되었습니다. 다시 로그인해 주세요.', 'error')
        router.replace('/login')
      } finally {
        if (active) {
          setCheckingAuth(false)
        }
      }
    }

    void verifyUser()

    return () => {
      active = false
    }
  }, [router, showAlert])

  const handleSendCode = async () => {
    setError('')
    setSuccess('')
    setSendingCode(true)

    try {
      const trimmedEmail = email.trim()

      if (!trimmedEmail) {
        setError('이메일 주소를 입력해 주세요.')
        showAlert('이메일 주소를 입력해 주세요.', 'error')
        return
      }

      if (!trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
        setError('올바른 이메일 형식을 입력해 주세요.')
        showAlert('올바른 이메일 형식을 입력해 주세요.', 'error')
        return
      }

      const response = await fetch('/api/auth/password/request', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: trimmedEmail }),
      })

      const data: PasswordChangeResponse = await response.json()

      if (!response.ok) {
        const message = data.error || '인증 코드 전송에 실패했습니다.'
        setError(message)
        showAlert(message, 'error')
        return
      }

      const message = data.message || '인증 코드가 전송되었습니다.'
      setSuccess(message)
      showAlert(message, 'success', 4000)
      setCodeSent(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : '인증 코드 전송 중 오류가 발생했습니다.'
      setError(message)
      showAlert(message, 'error')
    } finally {
      setSendingCode(false)
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    setSubmitting(true)

    try {
      const response = await fetch('/api/auth/password', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
          verificationCode,
        }),
      })

      const data: PasswordChangeResponse = await response.json()

      if (!response.ok) {
        const message = data.error || '비밀번호 변경에 실패했습니다.'
        setError(message)
        showAlert(message, 'error')
        return
      }

      const message = data.message || '비밀번호가 변경되었습니다.'
      setSuccess(message)
      showAlert(message, 'success', 4000)

      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setVerificationCode('')
      setCodeSent(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : '비밀번호 변경 중 오류가 발생했습니다.'
      setError(message)
      showAlert(message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600 text-sm">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-12 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">비밀번호 변경</h1>
          <p className="mt-2 text-sm text-gray-600">
            현재 비밀번호를 확인한 뒤, 새로운 비밀번호로 변경할 수 있습니다.
          </p>
        </div>

        <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-6">
          {error && <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}
          {success && <div className="mb-4 text-sm text-green-600 bg-green-50 border border-green-100 rounded-lg px-3 py-2">{success}</div>}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                현재 비밀번호
              </label>
              <input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition"
                placeholder="현재 비밀번호를 입력해 주세요"
                required
                disabled={submitting}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                이메일 주소
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value)
                  setCodeSent(false)
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition"
                placeholder="계정에 등록된 이메일 주소를 입력해 주세요"
                required
                disabled={sendingCode || submitting}
              />

              <div className="flex items-center justify-between">
                <label htmlFor="verificationCode" className="block text-sm font-medium text-gray-700">
                  이메일 인증 코드
                </label>
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={sendingCode || submitting}
                  className="text-sm font-medium text-gray-700 hover:text-gray-900 disabled:opacity-60"
                >
                  {sendingCode ? '전송 중...' : '인증 코드 전송'}
                </button>
              </div>
              <input
                id="verificationCode"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={verificationCode}
                onChange={(event) => setVerificationCode(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition"
                placeholder="이메일로 받은 6자리 코드를 입력해 주세요"
                required
                disabled={submitting}
              />
              <p className="text-xs text-gray-500">
                {codeSent ? '인증 코드가 전송되었습니다. 메일함(스팸함 포함)을 확인해 주세요.' : '비밀번호를 변경하기 전에 이메일로 전송된 인증 코드를 입력해야 합니다.'}
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                새 비밀번호
              </label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition"
                placeholder="새 비밀번호를 입력해 주세요"
                required
                disabled={submitting}
              />
              <p className="text-xs text-gray-500">비밀번호는 최소 5자 이상이어야 합니다.</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                새 비밀번호 확인
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition"
                placeholder="새 비밀번호를 다시 입력해 주세요"
                required
                disabled={submitting}
              />
            </div>

            <div className="flex items-center justify-between">
              <Link href="/feed" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
                ← 피드로 돌아가기
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 disabled:opacity-60 transition"
              >
                {submitting ? '변경 중...' : '비밀번호 변경'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
