'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, FormEvent, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Header from '@/components/Header'
import Link from 'next/link'
import { useAlert } from '@/context/AlertContext'
import { uploadImage, deleteImage, extractPublicIdFromUrl } from '@/lib/cloudinary'
import { fetchWithAuth } from '@/lib/auth'
import ConfirmAlert from '@/components/ConfirmAlert'

interface UserInquiry {
  id: string
  title: string
  content: string
  status: string
  response?: string | null
  created_at: string
  responded_at?: string | null
  updated_at?: string | null
  image_url?: string | null
}

interface EditingInquiry {
  id: string
  title: string
  content: string
  image_url?: string | null
}

interface FAQItem {
  id: string
  category: string
  question: string
  answer: string
}

const FAQ_ITEMS: FAQItem[] = [
  {
    id: '1',
    category: '계정',
    question: '회원가입은 어떻게 하나요?',
    answer: '로그인 페이지의 "회원가입" 버튼을 클릭하여 이메일과 비밀번호를 입력하면 됩니다. 이메일 인증 후 바로 사용 가능합니다.',
  },
  {
    id: '2',
    category: '계정',
    question: '비밀번호를 잊었어요',
    answer: '로그인 페이지에서 "비밀번호 찾기" 옵션을 선택하고 계정 이메일을 입력하면 비밀번호 재설정 링크가 전송됩니다.',
  },
  {
    id: '3',
    category: '계정',
    question: '계정을 삭제하려면?',
    answer: '설정 페이지에서 계정 삭제 옵션을 선택하시면 됩니다. 삭제 후 복구는 불가능하니 신중하게 진행해주세요.',
  },
  {
    id: '4',
    category: '프로필',
    question: '프로필 사진을 변경하려면?',
    answer: '프로필 페이지에서 프로필 사진 영역을 클릭하면 이미지 업로드 옵션이 나타납니다. Cloudinary를 통해 안전하게 저장됩니다.',
  },
  {
    id: '5',
    category: '프로필',
    question: '사용자명을 변경할 수 있나요?',
    answer: '프로필 페이지의 수정 버튼을 클릭하여 사용자명, 소개, 웹사이트 정보를 변경할 수 있습니다.',
  },
]

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return ''
  }

  try {
    return new Date(value).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch (error) {
    console.error('Date format error:', error)
    return value
  }
}

const getStatusMeta = (inquiry: UserInquiry) => {
  // responded_at이 있으면 답변이 있는 것으로 판단
  if (inquiry.responded_at) {
    return {
      label: '답변 완료',
      className:
        'inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200',
    }
  }

  const normalized = (inquiry.status || '').toLowerCase()

  switch (normalized) {
    case 'resolved':
    case 'answered':
    case 'completed':
      return {
        label: '답변 완료',
        className:
          'inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200',
      }
    case 'processing':
    case 'in_progress':
      return {
        label: '처리 중',
        className:
          'inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700 border border-blue-200',
      }
    default:
      return {
        label: '답변 대기',
        className:
          'inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-600 border border-gray-200',
      }
  }
}

function SettingsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { showAlert, showConfirm } = useAlert()
  const tab = searchParams?.get('tab') || 'faq'
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>(null)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSubmitting, setPasswordSubmitting] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmStep, setDeleteConfirmStep] = useState(1)

  // Inquiry states
  const [loading, setLoading] = useState(true)
  const [inquiries, setInquiries] = useState<UserInquiry[]>([])
  const [error, setError] = useState('')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [editingInquiry, setEditingInquiry] = useState<EditingInquiry | null>(null)
  const [editingImage, setEditingImage] = useState<File | null>(null)
  const [editingImagePreview, setEditingImagePreview] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleTabChange = (newTab: string) => {
    router.push(`/settings?tab=${newTab}`)
  }

  const toggleFaqExpand = (id: string) => {
    setExpandedFaqId(expandedFaqId === id ? null : id)
  }

  // Inquiry functions
  const fetchInquiries = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetchWithAuth('/api/inquiries')
      let payload: any = null

      try {
        payload = await response.json()
      } catch (parseError) {
        console.error('Inquiry list parse error:', parseError)
      }

      if (!response.ok) {
        setError(payload?.error || '문의 내역을 불러오지 못했습니다.')
        setInquiries([])
        return
      }

      const list: UserInquiry[] = Array.isArray(payload?.inquiries) ? payload.inquiries : []
      setInquiries(list)
    } catch (err) {
      console.error('Inquiry list error:', err)
      setError('문의 내역을 불러오지 못했습니다.')
      setInquiries([])
    } finally {
      setLoading(false)
    }
  }, [])

  // 페이지 로드 시 문의들을 읽음 처리
  const markInquiriesAsViewed = useCallback(async () => {
    try {
      await fetchWithAuth('/api/inquiries', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (err) {
      console.error('Mark inquiries as viewed error:', err)
    }
  }, [])

  useEffect(() => {
    if (tab === 'inquiries') {
      fetchInquiries()
      markInquiriesAsViewed()
    }
  }, [tab, fetchInquiries, markInquiriesAsViewed])

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      setImage(null)
      setImagePreview(null)
      return
    }

    setImage(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleDeleteClick = (inquiryId: string) => {
    showConfirm(
      '이 문의를 삭제하시겠습니까? 삭제된 문의는 복구할 수 없습니다.',
      async () => {
        try {
          const response = await fetchWithAuth(`/api/inquiries?id=${inquiryId}`, {
            method: 'DELETE',
          })

          if (!response.ok) {
            const data = await response.json()
            showAlert(data.error || '문의 삭제에 실패했습니다.', 'error')
            return
          }

          showAlert('문의가 삭제되었습니다.', 'success')
          setInquiries(prev => prev.filter(q => q.id !== inquiryId))
        } catch (err) {
          console.error('Delete error:', err)
          showAlert('문의 삭제 중 오류가 발생했습니다.', 'error')
        }
      },
      {
        title: '문의 삭제',
        confirmText: '삭제',
        cancelText: '취소',
        type: 'danger',
      }
    )
  }

  const handleEditClick = (inquiry: UserInquiry) => {
    setEditingInquiry({
      id: inquiry.id,
      title: inquiry.title,
      content: inquiry.content,
      image_url: inquiry.image_url || null,
    })
    setEditingImagePreview(inquiry.image_url || null)
    setEditingImage(null)
  }

  const handleEditingImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      setEditingImage(null)
      setEditingImagePreview(editingInquiry?.image_url || null)
      return
    }

    setEditingImage(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setEditingImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleSaveEdit = async () => {
    if (!editingInquiry) return

    const trimmedTitle = editingInquiry.title.trim()
    const trimmedContent = editingInquiry.content.trim()

    if (!trimmedTitle || !trimmedContent) {
      showAlert('제목과 내용을 모두 입력해 주세요.', 'error')
      return
    }

    setSubmitting(true)
    try {
      let imageUrl: string | null = editingImagePreview === editingInquiry.image_url ? editingInquiry.image_url : null

      // 새 이미지가 선택되었으면 업로드
      if (editingImage) {
        setUploadingImage(true)
        try {
          const uploadResponse = await uploadImage(editingImage)
          imageUrl = uploadResponse.secure_url
        } catch (uploadError) {
          console.error('Image upload error:', uploadError)
          showAlert('이미지 업로드에 실패했습니다.', 'error')
          setSubmitting(false)
          setUploadingImage(false)
          return
        } finally {
          setUploadingImage(false)
        }
      }

      const response = await fetchWithAuth(`/api/inquiries?id=${editingInquiry.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: trimmedTitle,
          content: trimmedContent,
          imageUrl,
        }),
      })

      let payload: any = null
      try {
        payload = await response.json()
      } catch (parseError) {
        console.error('Update parse error:', parseError)
      }

      if (!response.ok) {
        showAlert(payload?.error || '문의 수정에 실패했습니다.', 'error')
        return
      }

      showAlert('문의가 수정되었습니다.', 'success')
      setInquiries(prev =>
        prev.map(q => (q.id === editingInquiry.id ? (payload.inquiry as UserInquiry) : q))
      )
      setEditingInquiry(null)
      setEditingImage(null)
      setEditingImagePreview(null)
    } catch (err) {
      console.error('Update error:', err)
      showAlert('문의 수정 중 오류가 발생했습니다.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmedTitle = title.trim()
    const trimmedContent = content.trim()

    if (!trimmedTitle || !trimmedContent) {
      showAlert('제목과 내용을 모두 입력해 주세요.', 'error')
      return
    }

    setSubmitting(true)

    try {
      let imageUrl: string | null = null

      if (image) {
        setUploadingImage(true)
        try {
          const uploadResponse = await uploadImage(image)
          imageUrl = uploadResponse.secure_url
          console.log('Image uploaded successfully:', imageUrl)
        } catch (uploadError) {
          console.error('Image upload error:', uploadError)
          showAlert('이미지 업로드에 실패했습니다.', 'error')
          setSubmitting(false)
          setUploadingImage(false)
          return
        } finally {
          setUploadingImage(false)
        }
      }

      const response = await fetchWithAuth('/api/inquiries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: trimmedTitle,
          content: trimmedContent,
          imageUrl,
        }),
      })

      let payload: any = null
      try {
        payload = await response.json()
      } catch (parseError) {
        console.error('Inquiry create parse error:', parseError)
      }

      if (!response.ok) {
        showAlert(payload?.error || '문의 등록에 실패했습니다.', 'error')
        return
      }

      showAlert('문의가 등록되었습니다.', 'success')
      setTitle('')
      setContent('')
      setImage(null)
      setImagePreview(null)
      setError('')

      if (payload?.inquiry) {
        setInquiries(prev => [payload.inquiry as UserInquiry, ...prev])
      } else {
        fetchInquiries()
      }
    } catch (err) {
      console.error('Inquiry submit error:', err)
      showAlert('문의 등록 중 오류가 발생했습니다.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError('')

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('모든 필드를 입력해주세요')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('새 비밀번호가 일치하지 않습니다')
      return
    }

    if (newPassword.length < 6) {
      setPasswordError('비밀번호는 최소 6자 이상이어야 합니다')
      return
    }

    setPasswordSubmitting(true)

    try {
      const response = await fetchWithAuth('/api/auth/password-change', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      })

      if (response.ok) {
        showAlert('비밀번호가 변경되었습니다', 'success')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        const data = await response.json()
        setPasswordError(data.error || '비밀번호 변경에 실패했습니다')
        showAlert(data.error || '비밀번호 변경에 실패했습니다', 'error')
      }
    } catch (error) {
      console.error('Password change error:', error)
      setPasswordError('비밀번호 변경 중 오류가 발생했습니다')
      showAlert('비밀번호 변경 중 오류가 발생했습니다', 'error')
    } finally {
      setPasswordSubmitting(false)
    }
  }

  const handleDeleteAccount = () => {
    setShowDeleteConfirm(true)
    setDeleteConfirmStep(1)
  }

  const handleDeleteConfirm = async () => {
    if (deleteConfirmStep === 1) {
      setDeleteConfirmStep(2)
      return
    }

    setDeletingAccount(true)

    try {
      const response = await fetchWithAuth('/api/auth/account', {
        method: 'DELETE',
      })

      if (response.ok) {
        showAlert('계정이 삭제되었습니다', 'success')
        setTimeout(() => {
          router.push('/')
        }, 1500)
      } else {
        const data = await response.json()
        showAlert(data.error || '계정 삭제에 실패했습니다', 'error')
        setShowDeleteConfirm(false)
        setDeleteConfirmStep(1)
      }
    } catch (error) {
      console.error('Account deletion error:', error)
      showAlert('계정 삭제 중 오류가 발생했습니다', 'error')
      setShowDeleteConfirm(false)
      setDeleteConfirmStep(1)
    } finally {
      setDeletingAccount(false)
    }
  }

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false)
    setDeleteConfirmStep(1)
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* 페이지 제목 */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">설정</h1>
            <p className="text-gray-600 mt-2">계정 설정 및 도움말을 관리하세요</p>
          </div>

          {/* 탭 네비게이션 */}
          <div className="mb-6 border-b border-gray-200 overflow-x-auto">
            <nav className="flex gap-0 -mb-px whitespace-nowrap" aria-label="Tabs">
              <button
                onClick={() => handleTabChange('faq')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  tab === 'faq'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                FAQ
              </button>
              <button
                onClick={() => handleTabChange('inquiries')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  tab === 'inquiries'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                1:1 문의
              </button>
              <button
                onClick={() => handleTabChange('password')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  tab === 'password'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                비밀번호 변경
              </button>
              <button
                onClick={() => handleTabChange('account')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  tab === 'account'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                계정 관리
              </button>
            </nav>
          </div>

          {/* 탭 콘텐츠 */}
          <div className="bg-white rounded-lg shadow">
            {/* FAQ 탭 */}
            {tab === 'faq' && (
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">자주 묻는 질문</h2>
                <div className="space-y-2">
                  {FAQ_ITEMS.map((item) => (
                    <div
                      key={item.id}
                      className="border border-gray-200 rounded-lg overflow-hidden"
                    >
                      <button
                        onClick={() => toggleFaqExpand(item.id)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between transition-colors"
                      >
                        <span className="font-medium text-gray-900">{item.question}</span>
                        <svg
                          className={`w-5 h-5 text-gray-600 transition-transform ${
                            expandedFaqId === item.id ? 'rotate-180' : ''
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 14l-7 7m0 0l-7-7m7 7V3"
                          />
                        </svg>
                      </button>
                      {expandedFaqId === item.id && (
                        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                          <p className="text-gray-700 text-sm">{item.answer}</p>
                          <span className="inline-block mt-2 px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded">
                            {item.category}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 1:1 문의 탭 */}
            {tab === 'inquiries' && (
              <div className="p-6">
                {/* 문의 작성 폼 */}
                <div className="mb-8 pb-8 border-b border-gray-200">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">1:1 문의</h2>
                  <p className="text-sm text-gray-600 mb-6">궁금한 점을 남겨 주시면 답변과 함께 이메일로 안내해 드릴게요.</p>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                      <label htmlFor="inquiry-title" className="block text-sm font-medium text-gray-700">
                        제목
                      </label>
                      <input
                        id="inquiry-title"
                        type="text"
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        maxLength={150}
                        placeholder="문의 제목을 입력하세요"
                        className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                      />
                    </div>

                    <div>
                      <label htmlFor="inquiry-content" className="block text-sm font-medium text-gray-700">
                        내용
                      </label>
                      <textarea
                        id="inquiry-content"
                        value={content}
                        onChange={(event) => setContent(event.target.value)}
                        rows={5}
                        maxLength={2000}
                        placeholder="궁금한 내용을 자세히 작성해 주세요."
                        className="mt-2 w-full resize-none rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                      />
                      <p className="mt-1 text-right text-xs text-gray-400">{content.length} / 2000</p>
                    </div>

                    <div>
                      <label htmlFor="inquiry-image" className="block text-sm font-medium text-gray-700">
                        이미지 (선택사항)
                      </label>
                      <input
                        id="inquiry-image"
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        disabled={submitting || uploadingImage}
                        className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 file:border-0 file:bg-gray-100 file:px-3 file:py-1 file:text-sm file:font-medium file:text-gray-600 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                      />
                      {imagePreview && (
                        <div className="mt-3 relative">
                          <img
                            src={imagePreview}
                            alt="Preview"
                            className="max-w-xs max-h-48 rounded-lg border border-gray-300"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setImage(null)
                              setImagePreview(null)
                            }}
                            disabled={submitting || uploadingImage}
                            className="mt-2 text-xs text-red-600 hover:text-red-700 underline disabled:opacity-60"
                          >
                            이미지 제거
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setTitle('')
                          setContent('')
                          setImage(null)
                          setImagePreview(null)
                        }}
                        className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 focus:outline-none disabled:opacity-60"
                        disabled={submitting || uploadingImage}
                      >
                        취소
                      </button>
                      <button
                        type="submit"
                        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-800 focus:outline-none disabled:opacity-60"
                        disabled={submitting || uploadingImage}
                      >
                        {uploadingImage ? '이미지 업로드 중...' : submitting ? '등록 중...' : '문의 등록'}
                      </button>
                    </div>
                  </form>
                </div>

                {/* 문의 내역 */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">내 문의 내역</h3>
                    <button
                      type="button"
                      onClick={fetchInquiries}
                      className="text-sm font-medium text-gray-600 hover:text-gray-900 focus:outline-none"
                      disabled={loading}
                    >
                      새로 고침
                    </button>
                  </div>

                  {loading ? (
                    <p className="text-sm text-gray-500">문의 내역을 불러오는 중입니다...</p>
                  ) : error ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                      <p className="text-sm text-red-600">{error}</p>
                    </div>
                  ) : inquiries.length === 0 ? (
                    <p className="text-sm text-gray-500">등록된 문의가 아직 없습니다.</p>
                  ) : (
                    <ul className="space-y-4">
                      {inquiries.map((inquiry) => {
                        const statusMeta = getStatusMeta(inquiry)
                        return (
                          <li key={inquiry.id} className="rounded-lg border border-gray-200 p-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="flex-1">
                                <h4 className="text-base font-semibold text-gray-900">{inquiry.title}</h4>
                                <p className="mt-1 text-xs text-gray-500">등록일: {formatDateTime(inquiry.created_at) || '-'}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={statusMeta.className}>{statusMeta.label}</span>
                                {!inquiry.response && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleEditClick(inquiry)}
                                      className="text-xs font-medium text-blue-600 hover:text-blue-700 underline"
                                    >
                                      수정
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteClick(inquiry.id)}
                                      disabled={deletingId === inquiry.id}
                                      className="text-xs font-medium text-red-600 hover:text-red-700 underline disabled:opacity-60"
                                    >
                                      {deletingId === inquiry.id ? '삭제 중...' : '삭제'}
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                            <p className="mt-3 whitespace-pre-line text-sm text-gray-700">{inquiry.content}</p>
                            {inquiry.image_url && (
                              <div className="mt-4">
                                <img
                                  src={inquiry.image_url}
                                  alt="Inquiry attachment"
                                  className="max-w-sm max-h-64 rounded-lg border border-gray-200"
                                />
                              </div>
                            )}
                            {inquiry.response && (
                              <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                                <p className="text-xs font-semibold text-gray-600">답변</p>
                                <p className="mt-2 whitespace-pre-line text-sm text-gray-700">{inquiry.response}</p>
                                {inquiry.responded_at ? (
                                  <p className="mt-2 text-xs text-gray-400">답변일: {formatDateTime(inquiry.responded_at)}</p>
                                ) : null}
                              </div>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {/* 문의 수정 모달 */}
            {editingInquiry && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  <div className="p-6 border-b border-gray-200 sticky top-0 bg-white">
                    <h2 className="text-xl font-semibold text-gray-900">문의 수정</h2>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      handleSaveEdit()
                    }}
                    className="p-6 space-y-5"
                  >
                    <div>
                      <label htmlFor="edit-title" className="block text-sm font-medium text-gray-700">
                        제목
                      </label>
                      <input
                        id="edit-title"
                        type="text"
                        value={editingInquiry.title}
                        onChange={(e) =>
                          setEditingInquiry({ ...editingInquiry, title: e.target.value })
                        }
                        maxLength={150}
                        className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                      />
                    </div>

                    <div>
                      <label htmlFor="edit-content" className="block text-sm font-medium text-gray-700">
                        내용
                      </label>
                      <textarea
                        id="edit-content"
                        value={editingInquiry.content}
                        onChange={(e) =>
                          setEditingInquiry({ ...editingInquiry, content: e.target.value })
                        }
                        rows={5}
                        maxLength={2000}
                        className="mt-2 w-full resize-none rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                      />
                      <p className="mt-1 text-right text-xs text-gray-400">
                        {editingInquiry.content.length} / 2000
                      </p>
                    </div>

                    <div>
                      <label htmlFor="edit-image" className="block text-sm font-medium text-gray-700">
                        이미지 (선택사항)
                      </label>
                      <input
                        id="edit-image"
                        type="file"
                        accept="image/*"
                        onChange={handleEditingImageChange}
                        disabled={submitting || uploadingImage}
                        className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 file:border-0 file:bg-gray-100 file:px-3 file:py-1 file:text-sm file:font-medium file:text-gray-600 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                      />
                      {editingImagePreview && (
                        <div className="mt-3 relative">
                          <img
                            src={editingImagePreview}
                            alt="Preview"
                            className="max-w-xs max-h-48 rounded-lg border border-gray-300"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setEditingImage(null)
                              setEditingImagePreview(editingInquiry.image_url || null)
                            }}
                            disabled={submitting || uploadingImage}
                            className="mt-2 text-xs text-red-600 hover:text-red-700 underline disabled:opacity-60"
                          >
                            이미지 제거
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingInquiry(null)
                          setEditingImage(null)
                          setEditingImagePreview(null)
                        }}
                        className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 focus:outline-none disabled:opacity-60"
                        disabled={submitting || uploadingImage}
                      >
                        취소
                      </button>
                      <button
                        type="submit"
                        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-800 focus:outline-none disabled:opacity-60"
                        disabled={submitting || uploadingImage}
                      >
                        {uploadingImage ? '이미지 업로드 중...' : submitting ? '수정 중...' : '수정 완료'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* 비밀번호 변경 탭 */}
            {tab === 'password' && (
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">비밀번호 변경</h2>
                <form onSubmit={handlePasswordChange} className="space-y-6 max-w-md">
                  {passwordError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                      {passwordError}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      현재 비밀번호
                    </label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      placeholder="현재 비밀번호를 입력하세요"
                      disabled={passwordSubmitting}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      새 비밀번호
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      placeholder="새 비밀번호를 입력하세요 (최소 6자)"
                      disabled={passwordSubmitting}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      비밀번호 확인
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      placeholder="비밀번호를 다시 입력하세요"
                      disabled={passwordSubmitting}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={passwordSubmitting}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {passwordSubmitting ? '변경 중...' : '비밀번호 변경'}
                  </button>
                </form>
              </div>
            )}

            {/* 계정 관리 탭 */}
            {tab === 'account' && (
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">계정 관리</h2>
                <div className="space-y-6">
                  <div className="border border-red-200 bg-red-50 rounded-lg p-4">
                    <h3 className="font-semibold text-red-900 mb-2">계정 삭제</h3>
                    <p className="text-sm text-red-700 mb-4">
                      계정을 삭제하면 모든 데이터가 영구적으로 삭제되며 복구할 수 없습니다. 신중하게 진행해주세요.
                    </p>
                    <button
                      onClick={handleDeleteAccount}
                      disabled={deletingAccount}
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      {deletingAccount ? '삭제 중...' : '계정 삭제'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 계정 삭제 확인 알럼 */}
      {showDeleteConfirm && (
        <ConfirmAlert
          type="danger"
          title={deleteConfirmStep === 1 ? '계정 삭제' : '최종 확인'}
          message={
            deleteConfirmStep === 1
              ? '정말로 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.'
              : '계정 삭제를 최종 확인합니다. 모든 데이터가 영구적으로 삭제됩니다.'
          }
          confirmText={deleteConfirmStep === 1 ? '다음' : '삭제'}
          cancelText="취소"
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
          isLoading={deletingAccount}
        />
      )}
    </>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div>로딩 중...</div>}>
      <SettingsContent />
    </Suspense>
  )
}
