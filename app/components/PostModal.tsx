'use client'

import { useState, useEffect } from 'react'
import { useAlert } from '@/context/AlertContext'
import { HeartIcon, CommentIcon } from './Icons'
import { fetchWithAuth } from '@/lib/auth'

interface PostModalProps {
  post: any
  isOpen: boolean
  onClose: () => void
  onLike?: () => void
}

export default function PostModal({ post, isOpen, onClose, onLike }: PostModalProps) {
  const { showAlert } = useAlert()
  const [comment, setComment] = useState('')
  const [comments, setComments] = useState<any[]>([])
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [isLoadingComments, setIsLoadingComments] = useState(false)
  const [postState, setPostState] = useState<any>(post || {})

  // post 상태 동기화
  useEffect(() => {
    if (post) {
      setPostState(post)
    }
  }, [post])

  // 모달이 열릴 때 댓글 로드
  useEffect(() => {
    if (isOpen && post?.id) {
      loadComments()
    }
  }, [isOpen, post?.id])

  const loadComments = async () => {
    try {
      setIsLoadingComments(true)
      const response = await fetch(`/api/posts/${post.id}/comments`)
      if (response.ok) {
        const data = await response.json()
        setComments(data || [])
      }
    } catch (error) {
      console.error('Failed to load comments:', error)
    } finally {
      setIsLoadingComments(false)
    }
  }

  if (!isOpen || !post || !postState.id) return null

  const handleLike = async () => {
    try {
      // 좋아요 토글
      const method = postState.liked ? 'DELETE' : 'POST'
      const response = await fetchWithAuth(`/api/posts/${postState.id}/like`, {
        method,
      })

      if (response.ok) {
        const data = await response.json()

        // postState 업데이트
        setPostState({
          ...postState,
          likes_count: data.likes_count,
          liked: !postState.liked,
        })

        showAlert(data.message, 'success')
        onLike?.()
      } else if (response.status === 401) {
        showAlert('로그인이 필요합니다', 'error')
      } else {
        showAlert('좋아요 처리에 실패했습니다', 'error')
      }
    } catch (error) {
      console.error('Like error:', error)
      showAlert('오류가 발생했습니다', 'error')
    }
  }

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!comment.trim()) {
      showAlert('댓글을 입력해주세요', 'error')
      return
    }

    setIsSubmittingComment(true)

    try {
      const response = await fetchWithAuth(`/api/posts/${post.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: comment }),
      })

      if (response.ok) {
        const newComment = await response.json()
        setComments([...comments, newComment])
        setComment('')
        showAlert('댓글이 등록되었습니다', 'success')
        // 댓글 목록 다시 로드
        loadComments()
      } else {
        showAlert('댓글 등록에 실패했습니다', 'error')
      }
    } catch (error) {
      console.error('Comment error:', error)
      showAlert('오류가 발생했습니다', 'error')
    } finally {
      setIsSubmittingComment(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" onClick={onClose}>
      <div className="absolute inset-0 bg-black bg-opacity-50" />

      <div
        className="absolute right-0 top-0 h-full w-full max-w-2xl bg-white shadow-lg overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="sticky top-4 left-full -ml-12 p-2 text-gray-500"
        >
          ✕
        </button>

        {/* 게시물 내용 */}
        <div className="p-6 space-y-6">
          {/* 사용자 정보 */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
              {postState.users?.avatar ? (
                <img
                  src={postState.users.avatar}
                  alt={postState.users.username || 'User avatar'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              )}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{postState.users?.username || '사용자'}</h3>
              <p className="text-sm text-gray-500">
                {new Date(postState.created_at).toLocaleDateString('ko-KR')}
              </p>
            </div>
          </div>

          {/* 이미지 */}
          {postState.image_url && (
            <div className="rounded-lg overflow-hidden">
              <img
                src={postState.image_url}
                alt={postState.title || 'Post'}
                className="w-full max-h-96 object-cover"
              />
            </div>
          )}

          {/* 제목과 내용 */}
          <div className="space-y-3">
            {postState.title && (
              <h2 className="text-2xl font-bold text-gray-900">{postState.title}</h2>
            )}
            <p className="text-gray-700 text-lg leading-relaxed whitespace-pre-wrap">
              {postState.content}
            </p>
          </div>

          {/* 액션 버튼들 */}
          <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={handleLike}
              className="flex items-center transition-colors focus:outline-none"
              style={{ gap: '2px' }}
            >
              <HeartIcon
                size={20}
                filled={postState.liked}
                className={`transition-colors ${
                  postState.liked
                    ? 'text-red-500'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              />
              <span className="text-sm font-medium text-gray-500">
                {postState.likes_count || 0}
              </span>
            </button>
            <div className="flex items-center text-gray-500" style={{ gap: '2px' }}>
              <CommentIcon size={20} className="text-gray-500" />
              <span className="text-sm font-medium text-gray-500">{comments.length}</span>
            </div>
          </div>

          {/* 댓글 섹션 */}
          <div className="border-t border-gray-200 pt-6">
            <h4 className="font-semibold text-gray-900 mb-4">댓글 {comments.length}</h4>

            {/* 댓글 목록 */}
            <div className="space-y-4 mb-6 max-h-64 overflow-y-auto">
              {isLoadingComments ? (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500">댓글을 불러오는 중...</p>
                </div>
              ) : comments.length > 0 ? (
                comments.map((comment: any) => (
                  <div key={comment.id} className="flex gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {comment.users?.avatar ? (
                        <img
                          src={comment.users.avatar}
                          alt={comment.users.username || 'User avatar'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-sm font-semibold text-gray-900">
                          {comment.users?.username || '사용자'}
                        </p>
                        <p className="text-sm text-gray-700 mt-1">{comment.content}</p>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(comment.created_at).toLocaleDateString('ko-KR')}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-500">아직 댓글이 없습니다</p>
                </div>
              )}
            </div>

            {/* 댓글 입력 */}
            <form onSubmit={handleCommentSubmit} className="flex gap-3">
              <input
                type="text"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="댓글을 입력하세요..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
              <button
                type="submit"
                disabled={isSubmittingComment}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 disabled:bg-gray-400 transition-colors focus:outline-none"
              >
                {isSubmittingComment ? '...' : '전송'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
