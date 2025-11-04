'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkUser = async () => {
      try {
        const response = await fetch('/api/auth/me')
        if (response.ok) {
          const data = await response.json()
          setUser(data.user)
        }
      } catch (error) {
        console.error('User check error:', error)
      } finally {
        setLoading(false)
      }
    }

    checkUser()
  }, [pathname])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      setUser(null)
      router.push('/')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  // 로그인 페이지나 회원가입 페이지에서는 헤더를 표시하지 않음
  if (pathname === '/login' || pathname === '/signup' || pathname === '/') {
    return null
  }

  if (loading) {
    return null
  }

  if (!user) {
    return null
  }

  return (
    <header className="sticky top-0 bg-white border-b border-gray-200 z-50">
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* 로고 */}
          <Link href="/feed" className="flex items-center gap-2 hover:opacity-80 transition-opacity focus:outline-none">
            <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center text-white text-sm font-bold">
              Y
            </div>
            <span className="text-lg font-semibold text-gray-900">Yang</span>
          </Link>

          {/* 네비게이션 */}
          <nav className="hidden md:flex items-center gap-1">
            <Link href="/feed">
              <button className={`px-3 py-2 text-sm font-medium rounded-md transition-colors focus:outline-none ${
                pathname === '/feed' 
                  ? 'bg-gray-100 text-gray-900' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}>
                홈
              </button>
            </Link>
            <Link href="/upload">
              <button className={`px-3 py-2 text-sm font-medium rounded-md transition-colors focus:outline-none ${
                pathname === '/upload' 
                  ? 'bg-gray-100 text-gray-900' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}>
                업로드
              </button>
            </Link>
            {user && (
              <Link href={`/profile/${user.username}`}>
                <button className={`px-3 py-2 text-sm font-medium rounded-md transition-colors focus:outline-none ${
                  pathname === `/profile/${user.username}` 
                    ? 'bg-gray-100 text-gray-900' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}>
                  프로필
                </button>
              </Link>
            )}
          </nav>

          {/* 사용자 정보 */}
          <div className="flex items-center gap-3">
            {user && (
              <>
                <span className="hidden sm:block text-sm text-gray-600 truncate max-w-32">
                  {user.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors focus:outline-none"
                >
                  로그아웃
                </button>
              </>
            )}
          </div>
        </div>

        {/* 모바일 네비게이션 */}
        <nav className="md:hidden mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-around">
            <Link href="/feed">
              <button className={`px-3 py-2 text-sm font-medium rounded-md transition-colors focus:outline-none ${
                pathname === '/feed' 
                  ? 'bg-gray-100 text-gray-900' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}>
                홈
              </button>
            </Link>
            <Link href="/upload">
              <button className={`px-3 py-2 text-sm font-medium rounded-md transition-colors focus:outline-none ${
                pathname === '/upload' 
                  ? 'bg-gray-100 text-gray-900' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}>
                업로드
              </button>
            </Link>
            {user && (
              <Link href={`/profile/${user.username}`}>
                <button className={`px-3 py-2 text-sm font-medium rounded-md transition-colors focus:outline-none ${
                  pathname === `/profile/${user.username}` 
                    ? 'bg-gray-100 text-gray-900' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}>
                  프로필
                </button>
              </Link>
            )}
          </div>
        </nav>
      </div>
    </header>
  )
}
