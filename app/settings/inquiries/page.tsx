'use client'

export const dynamic = 'force-dynamic'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import Header from '@/components/Header'
import { useAlert } from '@/context/AlertContext'
import { uploadImage, deleteImage, extractPublicIdFromUrl } from '@/lib/cloudinary'

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

const getStatusMeta = (status: string) => {
  const normalized = (status || '').toLowerCase()

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

export default function InquiriesPage() {
  const { showAlert } = useAlert()
  const [loading, setLoading] = useState(true)
  const [inquiries, setInquiries] = useState<UserInquiry[]>([])
  const [error, setError] = useState('')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const fetchInquiries = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/inquiries', { credentials: 'include' })
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

  useEffect(() => {
    fetchInquiries()
  }, [fetchInquiries])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
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

      // 이미지 업로드
      if (image) {
        setUploadingImage(true)
        try {
          imageUrl = await uploadImage(image)
        } catch (uploadError) {
          showAlert('이미지 업로드에 실패했습니다.', 'error')
          setSubmitting(false)
          setUploadingImage(false)
          return
        }
        setUploadingImage(false)
      }

      const formData = new FormData()
      formData.append('title', trimmedTitle)
      formData.append('content', trimmedContent)
      if (imageUrl) {
        formData.append('image_url', imageUrl)
      }

      const response = await fetch('/api/inquiries', {
        method: 'POST',
        credentials: 'include',
        body: formData,
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

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="max-w-3xl mx-auto px-4 py-8">
        <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-gray-900">1:1 문의</h1>
          <p className="mt-2 text-sm text-gray-600">궁금한 점을 남겨 주시면 답변과 함께 이메일로 안내해 드릴게요.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
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
                첨부 이미지 (선택사항)
              </label>
              <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors">
                <input
                  id="inquiry-image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  disabled={submitting || uploadingImage}
                />
                <label htmlFor="inquiry-image" className="cursor-pointer block">
                  {imagePreview ? (
                    <div className="space-y-2">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="max-h-32 mx-auto rounded-lg"
                      />
                      <p className="text-xs text-gray-500">다른 이미지를 선택하려면 클릭하세요</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-900">이미지를 선택하세요</p>
                      <p className="text-xs text-gray-500">또는 여기에 드래그하세요</p>
                    </div>
                  )}
                </label>
              </div>
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
                disabled={submitting}
              >
                취소
              </button>
              <button
                type="submit"
                className="rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-800 focus:outline-none disabled:opacity-60"
                disabled={submitting}
              >
                {submitting ? '등록 중...' : '문의 등록'}
              </button>
            </div>
          </form>
        </section>

        <section className="mt-8 bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">내 문의 내역</h2>
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
            <p className="mt-6 text-sm text-gray-500">문의 내역을 불러오는 중입니다...</p>
          ) : error ? (
            <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          ) : inquiries.length === 0 ? (
            <p className="mt-6 text-sm text-gray-500">등록된 문의가 아직 없습니다.</p>
          ) : (
            <ul className="mt-6 space-y-4">
              {inquiries.map((inquiry) => {
                const statusMeta = getStatusMeta(inquiry.status)
                return (
                  <li key={inquiry.id} className="rounded-lg border border-gray-200 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="text-base font-semibold text-gray-900">{inquiry.title}</h3>
                        <p className="mt-1 text-xs text-gray-500">등록일: {formatDateTime(inquiry.created_at) || '-'}</p>
                      </div>
                      <span className={statusMeta.className}>{statusMeta.label}</span>
                    </div>
                    <p className="mt-3 whitespace-pre-line text-sm text-gray-700">{inquiry.content}</p>
                    {inquiry.image_url && (
                      <div className="mt-3">
                        <img
                          src={inquiry.image_url}
                          alt="Inquiry attachment"
                          className="max-h-48 rounded-lg"
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
        </section>
      </main>
    </div>
  )
}
