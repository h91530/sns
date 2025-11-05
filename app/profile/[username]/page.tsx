'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Header from '@/components/Header'
import { useAlert } from '@/context/AlertContext'
import { uploadImage, deleteImage, extractPublicIdFromUrl } from '@/lib/cloudinary'

interface UserProfile {
  id: string
  email: string
  username: string
  avatar?: string
  bio?: string
  website?: string
  created_at: string
  followers_count?: number
  following_count?: number
  posts_count?: number
}

interface Post {
  id: string
  title: string
  content: string
  image_url: string | null
  created_at: string
  likes_count: number
  liked?: boolean
}

interface FollowUser {
  id: string
  username: string
  avatar?: string
  bio?: string
  isFollowing?: boolean
}

export default function ProfilePage() {
  const params = useParams()
  const { showAlert } = useAlert()
  const username = (params?.username as string) || ''

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [isOwnProfile, setIsOwnProfile] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [editBio, setEditBio] = useState('')
  const [editWebsite, setEditWebsite] = useState('')
  const [editAvatar, setEditAvatar] = useState('')
  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null)
  const [editAvatarPreview, setEditAvatarPreview] = useState('')
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [avatarError, setAvatarError] = useState('')

  // 팔로우/팔로잉 모달 state
  const [showFollowModal, setShowFollowModal] = useState(false)
  const [followModalType, setFollowModalType] = useState<'followers' | 'following'>('followers')
  const [followList, setFollowList] = useState<FollowUser[]>([])
  const [followListLoading, setFollowListLoading] = useState(false)

  useEffect(() => {
    const fetchProfileAndPosts = async () => {
      try {
        // 프로필 정보 가져오기
        const profileRes = await fetch(`/api/users/username/${username}`)
        if (profileRes.ok) {
          const profileData = await profileRes.json()
          setProfile({
            id: profileData.id,
            email: profileData.email,
            username: profileData.username,
            avatar: profileData.avatar,
            bio: profileData.bio,
            website: profileData.website,
            created_at: profileData.created_at,
            followers_count: profileData.followers_count || 0,
            following_count: profileData.following_count || 0,
            posts_count: profileData.posts_count || 0,
          })
          setPosts(profileData.posts || [])

          // 팔로우 상태 설정
          if (profileData.is_following !== undefined) {
            setIsFollowing(profileData.is_following)
          }

          // 편집 필드 초기화
          setEditBio(profileData.bio || '')
          setEditWebsite(profileData.website || '')
          // editAvatar는 유저가 파일을 선택할 때만 업데이트하므로 로드시에 초기화하지 않음

          // 자신의 프로필인지 확인
          const meRes = await fetch('/api/auth/me')
          if (meRes.ok) {
            const meData = await meRes.json()
            setIsOwnProfile(meData.user?.username === username)
          }
        } else {
          console.error('Profile fetch failed:', profileRes.status)
          setProfile(null) // 프로필 없음을 명시적으로 설정
        }
      } catch (error) {
        console.error('Error fetching profile:', error)
        setProfile(null)
      } finally {
        setLoading(false)
      }
    }

    if (username) {
      fetchProfileAndPosts()
    }
  }, [username])

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center text-white text-xl font-bold mb-4 animate-pulse mx-auto">
            Y
          </div>
          <div className="text-gray-600 text-sm font-medium">프로필을 불러오는 중...</div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">프로필을 찾을 수 없습니다</h2>
            <p className="text-gray-600 text-sm">요청하신 사용자의 프로필이 존재하지 않습니다.</p>
          </div>
        </div>
      </div>
    )
  }

  const handleFollow = async () => {
    try {
      if (isFollowing) {
        // 언팔로우
        const response = await fetch(`/api/follows/${profile?.id}`, {
          method: 'DELETE',
          credentials: 'include',
        })
        if (response.ok) {
          setIsFollowing(false)
          showAlert('팔로우를 취소했습니다', 'success')
          setProfile(prev => prev ? {
            ...prev,
            followers_count: (prev.followers_count || 0) - 1
          } : null)
        } else if (response.status === 401) {
          showAlert('로그인이 필요합니다', 'error')
        } else {
          showAlert('팔로우 취소에 실패했습니다', 'error')
        }
      } else {
        // 팔로우
        const response = await fetch(`/api/follows/${profile?.id}`, {
          method: 'POST',
          credentials: 'include',
        })
        if (response.ok) {
          setIsFollowing(true)
          showAlert('팔로우했습니다', 'success')
          setProfile(prev => prev ? {
            ...prev,
            followers_count: (prev.followers_count || 0) + 1
          } : null)
        } else if (response.status === 401) {
          showAlert('로그인이 필요합니다', 'error')
        } else {
          showAlert('팔로우에 실패했습니다', 'error')
        }
      }
    } catch (error) {
      console.error('Follow error:', error)
      showAlert('작업 중 오류가 발생했습니다', 'error')
    }
  }

  const handleOpenFollowModal = async (type: 'followers' | 'following') => {
    setFollowModalType(type)
    setFollowListLoading(true)
    setShowFollowModal(true)

    try {
      const response = await fetch(`/api/follows/list?userId=${profile?.id}&type=${type}`)
      if (response.ok) {
        const data = await response.json()
        setFollowList(data.follows || [])
      } else {
        showAlert('목록을 불러올 수 없습니다', 'error')
        setFollowList([])
      }
    } catch (error) {
      console.error('Error fetching follow list:', error)
      showAlert('오류가 발생했습니다', 'error')
      setFollowList([])
    } finally {
      setFollowListLoading(false)
    }
  }

  const handleLike = async (postId: string) => {
    try {
      // 현재 게시물의 좋아요 상태 확인
      const currentPost = posts.find(p => p.id === postId)
      const isLiked = currentPost?.liked

      // 좋아요 토글
      const method = isLiked ? 'DELETE' : 'POST'
      const response = await fetch(`/api/posts/${postId}/like`, {
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
      } else {
        showAlert('좋아요 처리에 실패했습니다', 'error')
      }
    } catch (error) {
      console.error('Like error:', error)
    }
  }

  const handleToggleEditProfile = () => {
    if (!isEditingProfile && profile?.avatar) {
      // 프로필 수정 모드 활성화 시 현재 avatar를 editAvatar에 설정
      setEditAvatar(profile.avatar)
      // 파일 입력과 미리보기 초기화
      setEditAvatarFile(null)
      setEditAvatarPreview('')
    } else if (isEditingProfile) {
      // 프로필 수정 모드 비활성화 시 변경 사항 초기화
      setEditAvatar('')
      setEditAvatarFile(null)
      setEditAvatarPreview('')
      setAvatarError('')
    }
    setIsEditingProfile(!isEditingProfile)
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setAvatarError('')

    // 기존 이미지가 있으면 삭제하도록 표시 (저장할 때 실제 삭제)
    if (profile?.avatar && profile.avatar.includes('cloudinary')) {
      console.log('Previous avatar will be deleted on save:', profile.avatar)
    }

    // 로컬 미리보기만 생성 (Cloudinary 업로드는 저장할 때)
    const reader = new FileReader()
    reader.onload = (e) => {
      const preview = e.target?.result as string
      setEditAvatarPreview(preview)
      console.log('Local preview set:', preview.substring(0, 50) + '...')
    }
    reader.readAsDataURL(file)

    // 파일 저장 (저장할 때 업로드)
    setEditAvatarFile(file)
    console.log('File selected for upload (not uploaded yet):', file.name)
    showAlert('이미지가 선택되었습니다. 저장 버튼을 눌러서 업로드합니다.', 'info')
  }

  const handleUseDefaultImage = () => {
    // 기존 이미지가 있으면 삭제하도록 표시 (저장할 때 실제 삭제)
    if (profile?.avatar && profile.avatar.includes('cloudinary')) {
      console.log('Previous avatar will be deleted on save:', profile.avatar)
    }

    setEditAvatar('')
    setEditAvatarFile(null)
    setEditAvatarPreview('')
    setAvatarError('')
    console.log('Default image selected - avatar will be set to empty string')
    showAlert('기본 이미지로 설정되었습니다', 'success')
  }

  const handleSaveProfile = async () => {
    try {
      console.log('handleSaveProfile called')

      let avatarUrl = editAvatar

      // 기존 이미지 삭제 (새 이미지로 변경하거나 기본 이미지로 설정할 때)
      if (profile?.avatar && profile.avatar.includes('cloudinary')) {
        // 새 이미지를 선택했거나 기본 이미지로 설정한 경우
        if (editAvatarFile || editAvatar === '') {
          console.log('Deleting previous avatar:', profile.avatar)
          const publicId = extractPublicIdFromUrl(profile.avatar)
          if (publicId) {
            try {
              await deleteImage(publicId)
              console.log('Previous image deleted successfully:', publicId)
            } catch (error) {
              console.error('Failed to delete previous image:', error)
              // 삭제 실패해도 계속 진행
            }
          }
        }
      }

      // 새로운 파일이 선택된 경우 업로드
      if (editAvatarFile) {
        console.log('Uploading new image to Cloudinary...')
        setIsUploadingAvatar(true)
        try {
          const uploadedImage = await uploadImage(editAvatarFile)
          avatarUrl = uploadedImage.secure_url
          console.log('Image uploaded successfully:', avatarUrl)
          showAlert('이미지가 업로드되었습니다', 'success')
        } catch (error) {
          console.error('Cloudinary upload failed:', error)
          setAvatarError('이미지 업로드에 실패했습니다')
          showAlert('이미지 업로드에 실패했습니다', 'error')
          setIsUploadingAvatar(false)
          return
        }
        setIsUploadingAvatar(false)
      }

      console.log('Final avatar value:', avatarUrl)
      console.log('editBio:', editBio)
      console.log('editWebsite:', editWebsite)

      const payload = {
        avatar: avatarUrl,
        bio: editBio,
        website: editWebsite,
      }
      console.log('Payload to send:', payload)

      const response = await fetch(`/api/users/username/${username}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      })

      console.log('API response status:', response.status)
      if (response.ok) {
        const updatedData = await response.json()
        console.log('Updated data:', updatedData)
        setProfile(prev => prev ? {
          ...prev,
          ...updatedData
        } : null)
        // 편집 필드도 최신 데이터로 업데이트
        setEditAvatar(updatedData.avatar || '')
        setEditBio(updatedData.bio || '')
        setEditWebsite(updatedData.website || '')
        // 파일 입력 초기화
        setEditAvatarFile(null)
        setEditAvatarPreview('')
        setIsEditingProfile(false)
        showAlert('프로필이 저장되었습니다', 'success')
      } else {
        const errorData = await response.json()
        console.error('API error:', errorData)
        showAlert('프로필 저장에 실패했습니다', 'error')
      }
    } catch (error) {
      console.error('Profile save error:', error)
      showAlert('오류가 발생했습니다', 'error')
    }
  }

  if (!profile && !loading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">프로필을 찾을 수 없습니다</h2>
            <p className="text-gray-600 mb-6">요청하신 사용자의 프로필이 없거나 삭제되었습니다.</p>
            <a href="/feed" className="inline-block px-6 py-2 bg-gray-900 text-white font-semibold rounded hover:bg-gray-800 transition-colors">
              피드로 돌아가기
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 프로필 헤더 */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {profile.avatar && profile.avatar.trim() !== '' ? (
                <img
                  src={profile.avatar}
                  alt={profile.username}
                  className="w-16 h-16 bg-gray-100 rounded-full object-cover"
                  onError={(e) => {
                    // 이미지 로드 실패 시 fallback
                    e.currentTarget.style.display = 'none'
                  }}
                />
              ) : (
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{profile.username}</h1>
                <p className="text-gray-500 text-sm">{profile.email}</p>
              </div>
            </div>
            
            {isOwnProfile ? (
              <button
                onClick={handleToggleEditProfile}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-900 text-white hover:bg-gray-800 transition-colors focus:outline-none"
              >
                {isEditingProfile ? '취소' : '프로필 수정'}
              </button>
            ) : (
              <button
                onClick={handleFollow}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none ${
                  isFollowing
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    : 'bg-gray-900 text-white hover:bg-gray-800'
                }`}
              >
                {isFollowing ? '팔로잉' : '팔로우'}
              </button>
            )}
          </div>

          {/* 통계 정보 */}
          <div className="flex items-center gap-8 mt-6 pt-6 border-t border-gray-100">
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">{profile.posts_count || 0}</div>
              <div className="text-sm text-gray-500">게시글</div>
            </div>
            <button
              onClick={() => handleOpenFollowModal('followers')}
              className="text-center hover:opacity-70 transition-opacity focus:outline-none"
            >
              <div className="text-lg font-semibold text-gray-900">{profile.followers_count || 0}</div>
              <div className="text-sm text-gray-500">팔로워</div>
            </button>
            <button
              onClick={() => handleOpenFollowModal('following')}
              className="text-center hover:opacity-70 transition-opacity focus:outline-none"
            >
              <div className="text-lg font-semibold text-gray-900">{profile.following_count || 0}</div>
              <div className="text-sm text-gray-500">팔로잉</div>
            </button>
          </div>

          {/* 프로필 정보 표시 */}
          {!isEditingProfile && (profile.bio || profile.website) && (
            <div className="mt-4 space-y-2">
              {profile.bio && (
                <div>
                  <p className="text-gray-700 text-sm">{profile.bio}</p>
                </div>
              )}
              {profile.website && (
                <div>
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline text-sm"
                  >
                    {profile.website}
                  </a>
                </div>
              )}
            </div>
          )}

          {/* 프로필 편집 섹션 */}
          {isOwnProfile && isEditingProfile && (
            <div className="mt-8 bg-gray-50 rounded-xl p-6 border border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">프로필 수정</h3>

              <div className="space-y-6">
                {/* 프로필 이미지 섹션 */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                  {/* 이미지 미리보기 */}
                  <div className="md:col-span-3 flex justify-center md:justify-start">
                    <div className="relative">
                      {editAvatarPreview || editAvatar ? (
                        <img
                          src={editAvatarPreview || editAvatar}
                          alt="Preview"
                          className="w-32 h-32 rounded-full object-cover border-2 border-gray-900"
                        />
                      ) : (
                        <div className="w-32 h-32 rounded-full bg-gray-100 border-2 border-gray-300 flex items-center justify-center">
                          <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 파일 입력 및 옵션 */}
                  <div className="md:col-span-9 space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">프로필 이미지</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        disabled={isUploadingAvatar}
                        className="block w-full text-sm text-gray-700 file:mr-3 file:py-2 file:px-4 file:rounded file:border file:border-gray-300 file:text-sm file:font-medium file:bg-white file:text-gray-700 hover:file:bg-gray-50 disabled:opacity-50 cursor-pointer"
                      />
                    </div>

                    {isUploadingAvatar && (
                      <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        <p className="text-xs text-blue-700 font-medium">저장할 준비 중입니다</p>
                      </div>
                    )}

                    {avatarError && (
                      <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                        <p className="text-xs text-red-700 font-medium">{avatarError}</p>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleUseDefaultImage}
                      className="text-xs text-gray-600 hover:text-gray-900 font-medium underline underline-offset-2 focus:outline-none"
                    >
                      기본 이미지로 설정
                    </button>
                  </div>
                </div>

                {/* 소개 및 웹사이트 */}
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">소개</label>
                    <textarea
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 resize-none text-sm"
                      placeholder="자신을 소개해주세요"
                      rows={3}
                    />
                    <p className="text-xs text-gray-500 mt-2 text-right">{editBio.length} / 500</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">웹사이트</label>
                    <input
                      type="url"
                      value={editWebsite}
                      onChange={(e) => setEditWebsite(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 text-sm"
                      placeholder="https://example.com"
                    />
                  </div>
                </div>

                {/* 버튼 영역 */}
                <div className="flex gap-3 pt-6 border-t border-gray-200">
                  <button
                    onClick={handleSaveProfile}
                    className="flex-1 px-6 py-3 bg-gray-900 text-white text-sm font-semibold rounded hover:bg-gray-800 transition-colors focus:outline-none"
                  >
                    저장
                  </button>
                  <button
                    onClick={handleToggleEditProfile}
                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 text-sm font-semibold rounded hover:bg-gray-50 transition-colors focus:outline-none"
                  >
                    취소
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 게시물 섹션 */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">게시물</h2>

          {posts.length > 0 ? (
            <div className="space-y-4">
              {posts.map((post) => (
                <article key={post.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                  {post.image_url && (
                    <div className="w-full h-48 overflow-hidden bg-gray-100 rounded-lg mb-4">
                      <img
                        src={post.image_url}
                        alt={post.title || 'Post'}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  
                  <div className="space-y-3">
                    {post.title && (
                      <h3 className="font-semibold text-gray-900 text-lg">{post.title}</h3>
                    )}
                    <p className="text-gray-700 leading-relaxed">{post.content}</p>
                    
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <span className="text-sm text-gray-500">
                        {new Date(post.created_at).toLocaleDateString('ko-KR')}
                      </span>
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => handleLike(post.id)}
                          className={`text-sm transition-colors focus:outline-none ${
                            post.liked
                              ? 'text-red-500'
                              : 'text-gray-500 hover:text-gray-900'
                          }`}
                        >
                          ♥ {post.likes_count || 0}
                        </button>
                        <span className="text-sm text-gray-500">
                          댓글 0
                        </span>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                Y
              </div>
              <h3 className="text-gray-900 text-lg font-semibold mb-2">아직 게시물이 없습니다</h3>
              <p className="text-gray-600 text-sm">첫 번째 게시물을 공유해보세요!</p>
            </div>
          )}
        </div>
      </div>

      {/* 팔로우/팔로잉 모달 */}
      {showFollowModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md mx-4 max-h-96 overflow-hidden flex flex-col">
            {/* 헤더 */}
            <div className="flex items-center justify-between border-b border-gray-200 p-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {followModalType === 'followers' ? '팔로워' : '팔로잉'}
              </h2>
              <button
                onClick={() => setShowFollowModal(false)}
                className="text-gray-500 hover:text-gray-700 text-xl focus:outline-none"
              >
                ✕
              </button>
            </div>

            {/* 목록 */}
            <div className="overflow-y-auto flex-1">
              {followListLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-gray-500">로딩 중...</div>
                </div>
              ) : followList.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {followList.map((user) => (
                    <div key={user.id} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between">
                      <a
                        href={`/profile/${user.username}`}
                        className="flex items-center gap-3 no-underline flex-1 text-gray-900"
                      >
                        {user.avatar ? (
                          <img
                            src={user.avatar}
                            alt={user.username}
                            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900">{user.username}</div>
                          {user.bio && <div className="text-sm text-gray-500 truncate">{user.bio}</div>}
                        </div>
                      </a>
                      <button
                        onClick={async () => {
                          try {
                            const method = user.isFollowing ? 'DELETE' : 'POST'
                            const response = await fetch(`/api/follows/${user.id}`, {
                              method,
                              credentials: 'include',
                            })
                            if (response.ok) {
                              const message = user.isFollowing ? '팔로우 해제했습니다' : '팔로우했습니다'
                              const alertType = user.isFollowing ? 'error' : 'success'
                              showAlert(message, alertType)
                              // 모달의 팔로우 버튼 상태 업데이트
                              setFollowList(followList.map(u =>
                                u.id === user.id ? { ...u, isFollowing: !u.isFollowing } : u
                              ))
                            } else if (response.status === 401) {
                              showAlert('로그인이 필요합니다', 'error')
                            } else {
                              const message = user.isFollowing ? '팔로우 해제에 실패했습니다' : '팔로우에 실패했습니다'
                              showAlert(message, 'error')
                            }
                          } catch (error) {
                            console.error('Follow error:', error)
                            showAlert('작업 중 오류가 발생했습니다', 'error')
                          }
                        }}
                        className={`ml-2 px-3 py-1 text-xs font-medium rounded transition-colors focus:outline-none flex-shrink-0 ${
                          user.isFollowing
                            ? 'bg-gray-900 text-white hover:bg-gray-800'
                            : 'bg-gray-900 text-white hover:bg-gray-800'
                        }`}
                      >
                        {user.isFollowing ? '팔로잉' : '팔로우'}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center py-8">
                  <div className="text-gray-500 text-sm">
                    {followModalType === 'followers' ? '팔로워가 없습니다' : '팔로잉하는 사람이 없습니다'}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
