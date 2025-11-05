'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import PostModal from '@/components/PostModal'
import { useAlert } from '@/context/AlertContext'
import { HeartIcon, CommentIcon } from '@/components/Icons'
import { fetchWithAuth } from '@/lib/auth'

export default function Feed() {
  const router = useRouter()
  const { showAlert } = useAlert()
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPost, setSelectedPost] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await fetchWithAuth('/api/posts')
        if (response.ok) {
          const data = await response.json()
          setPosts(data)
        }
      } catch (error) {
        console.error('Error fetching posts:', error)
        showAlert('게시물을 불러올 수 없습니다', 'error')
      } finally {
        setLoading(false)
      }
    }

    fetchPosts()
  }, [showAlert])

  const handleLike = async (postId: string) => {
    try {
      // 현재 게시물의 좋아요 상태 확인
      const currentPost = posts.find(p => p.id === postId)
      const isLiked = currentPost?.liked

      // 좋아요 토글
      const method = isLiked ? 'DELETE' : 'POST'
      const response = await fetchWithAuth(`/api/posts/${postId}/like`, {
        method,
      })

      if (response.ok) {
        const data = await response.json()

        // API에서 받은 likes_count를 사용
        setPosts(posts.map(post =>
          post.id === postId
            ? {
                ...post,
                likes_count: data.likes_count,
                liked: !isLiked,
              }
            : post
        ))

        showAlert(data.message, 'success')
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

  const openPostModal = (post: any) => {
    setSelectedPost(post)
    setIsModalOpen(true)
  }

  const closePostModal = () => {
    setIsModalOpen(false)
    setSelectedPost(null)
  }

  const handleModalLike = () => {
    // 모달에서 좋아요를 업데이트하면 selectedPost도 변경되므로
    // 피드의 posts 배열도 함께 업데이트
    if (selectedPost) {
      setPosts(posts.map(post =>
        post.id === selectedPost.id
          ? { ...post, likes_count: selectedPost.likes_count, liked: selectedPost.liked }
          : post
      ))
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center text-white text-xl font-bold mb-4 animate-pulse mx-auto">
            Y
          </div>
          <div className="text-gray-600 text-sm font-medium">
            피드를 불러오는 중...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      {/* 메인 컨테이너 */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 헤더 섹션 */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">피드</h1>
          <p className="text-gray-600">
            네트워크의 콘텐츠를 발견해보세요
          </p>
        </div>

        {/* 게시물 목록 */}
        <div className="space-y-6">
          {posts.map((post: any, index: number) => (
            <article 
              key={post.id} 
              className="card p-6 hover:shadow-md transition-all duration-200"
            >
              {/* 사용자 정보 */}
              <button
                onClick={() => router.push(`/profile/${post.users?.username}`)}
                className="flex items-center gap-3 mb-4 hover:opacity-70 transition-opacity cursor-pointer focus:outline-none"
              >
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {post.users?.avatar ? (
                    <img
                      src={post.users.avatar}
                      alt={post.users.username || 'User avatar'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 text-left">
                  <h3 className="text-gray-900 font-semibold text-sm">
                    {post.users?.username || '사용자'}
                  </h3>
                  <p className="text-gray-500 text-xs">
                    {new Date(post.created_at).toLocaleDateString('ko-KR')}
                  </p>
                </div>
              </button>
              
              {/* 이미지 */}
              {post.image_url && (
                <div className="mb-4 rounded-lg overflow-hidden">
                  <img 
                    src={post.image_url} 
                    alt={post.title || 'Post image'} 
                    className="w-full h-64 object-cover"
                  />
                </div>
              )}
              
              {/* 콘텐츠 */}
              <div className="space-y-3">
                {post.title && (
                  <h2 className="text-gray-900 font-semibold text-lg leading-tight">
                    {post.title}
                  </h2>
                )}
                <p className="text-gray-700 leading-relaxed">
                  {post.content}
                </p>
              </div>
              
              {/* 액션 버튼들 */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleLike(post.id)}
                    className="flex items-center transition-colors focus:outline-none"
                    style={{ gap: '2px' }}
                  >
                    <HeartIcon
                      size={20}
                      filled={post.liked}
                      className={`transition-colors ${
                        post.liked
                          ? 'text-red-500'
                          : 'text-gray-500 hover:text-gray-900'
                      }`}
                    />
                    <span className="text-sm font-medium text-gray-500">
                      {post.likes_count || 0}
                    </span>
                  </button>
                  <button
                    onClick={() => openPostModal(post)}
                    className="flex items-center text-gray-500 hover:text-gray-900 transition-colors focus:outline-none"
                    style={{ gap: '2px' }}
                  >
                    <CommentIcon
                      size={20}
                      className="text-gray-500"
                    />
                    <span className="text-sm font-medium text-gray-500">
                      {post.comments?.length || 0}
                    </span>
                  </button>
                </div>
                <button
                  onClick={() => openPostModal(post)}
                  className="text-gray-500 hover:text-gray-900 transition-colors focus:outline-none"
                >
                  <span className="text-sm font-medium">전체 보기</span>
                </button>
              </div>
            </article>
          ))}
          
          {/* 빈 상태 */}
          {posts.length === 0 && (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                Y
              </div>
              <h3 className="text-gray-900 text-lg font-semibold mb-2">
                아직 게시물이 없습니다
              </h3>
              <p className="text-gray-600 text-sm">
                멋진 것을 공유하는 첫 번째 사람이 되어보세요!
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 게시물 모달 */}
      <PostModal
        post={selectedPost}
        isOpen={isModalOpen}
        onClose={closePostModal}
        onLike={handleModalLike}
      />
    </div>
  )
}
