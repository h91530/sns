'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import Header from '@/components/Header'

interface FAQItem {
  id: string
  category: string
  question: string
  answer: string
}

const FAQ_ITEMS: FAQItem[] = [
  // 계정 관련
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

  // 프로필 관련
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

  // 게시글 관련
  {
    id: '6',
    category: '게시글',
    question: '게시글을 작성하려면?',
    answer: '헤더의 "업로드" 메뉴에서 새 게시물 작성 페이지로 이동할 수 있습니다. 제목(선택)과 내용은 필수이며, 이미지는 선택사항입니다.',
  },
  {
    id: '7',
    category: '게시글',
    question: '작성한 게시글을 수정하거나 삭제할 수 있나요?',
    answer: '현재 버전에서는 게시글 수정이 지원되지 않습니다. 삭제하려면 프로필 페이지에서 게시글의 삭제 버튼을 클릭하면 됩니다.',
  },
  {
    id: '8',
    category: '게시글',
    question: '좋아요는 어떻게 하나요?',
    answer: '피드나 프로필 페이지의 게시글 우측 하단 하트 아이콘을 클릭하면 좋아요를 할 수 있습니다. 다시 클릭하면 취소됩니다.',
  },

  // 팔로우 관련
  {
    id: '9',
    category: '팔로우',
    question: '다른 사용자를 팔로우하려면?',
    answer: '다른 사용자의 프로필 페이지에서 "팔로우" 버튼을 클릭하면 됩니다. 팔로우 목록은 프로필 페이지에서 확인할 수 있습니다.',
  },
  {
    id: '10',
    category: '팔로우',
    question: '팔로워를 차단할 수 있나요?',
    answer: '현재 버전에서는 차단 기능이 지원되지 않습니다. 하지만 팔로워 목록에서 특정 사용자를 언팔로우할 수 있습니다.',
  },

  // 댓글 관련
  {
    id: '11',
    category: '댓글',
    question: '댓글을 남기려면?',
    answer: '게시글의 댓글 아이콘을 클릭하면 게시글 상세 모달이 열리고, 하단의 입력창에서 댓글을 작성할 수 있습니다.',
  },
  {
    id: '12',
    category: '댓글',
    question: '댓글을 삭제할 수 있나요?',
    answer: '본인이 작성한 댓글은 삭제 가능합니다. 댓글 우측의 삭제 버튼을 클릭하면 됩니다.',
  },

  // 1:1 문의
  {
    id: '13',
    category: '문의',
    question: '1:1 문의는 어떻게 보내나요?',
    answer: '헤더의 "1:1 문의" 버튼을 클릭하여 문의 페이지로 이동합니다. 제목과 내용을 입력하고 선택사항으로 이미지를 첨부할 수 있습니다.',
  },
  {
    id: '14',
    category: '문의',
    question: '문의에 답변이 왔는지 어떻게 알아요?',
    answer: '헤더의 "1:1 문의" 버튼에 빨간 배지가 표시되면 답변 대기 중인 문의가 있다는 의미입니다. 문의 페이지에서 답변을 확인할 수 있습니다.',
  },

  // 보안 관련
  {
    id: '15',
    category: '보안',
    question: '계정 보안은 어떻게 유지되나요?',
    answer: '모든 비밀번호는 암호화되어 저장되며, 통신은 HTTPS를 통해 보호됩니다. 정기적으로 비밀번호를 변경하고 강력한 비밀번호를 사용하세요.',
  },
  {
    id: '16',
    category: '보안',
    question: '개인정보는 어떻게 보호되나요?',
    answer: '개인정보는 엄격한 보안 정책에 따라 보호됩니다. 자세한 내용은 개인정보처리방침을 참조해주세요.',
  },
]

const CATEGORIES = ['전체', ...Array.from(new Set(FAQ_ITEMS.map((item) => item.category)))]

export default function FAQPage() {
  const [selectedCategory, setSelectedCategory] = useState('전체')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filteredItems =
    selectedCategory === '전체'
      ? FAQ_ITEMS
      : FAQ_ITEMS.filter((item) => item.category === selectedCategory)

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* 제목 */}
        <section className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">자주 묻는 질문</h1>
          <p className="text-gray-600">자주 있는 질문과 답변을 모았습니다.</p>
        </section>

        {/* 카테고리 필터 */}
        <section className="mb-8">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors focus:outline-none ${
                  selectedCategory === category
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </section>

        {/* FAQ 목록 */}
        <section className="space-y-4">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">해당 카테고리에 질문이 없습니다.</p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.id}
                className="border border-gray-200 rounded-lg overflow-hidden hover:border-gray-300 transition-colors"
              >
                <button
                  onClick={() => toggleExpand(item.id)}
                  className="w-full px-6 py-4 flex items-start justify-between hover:bg-gray-50 transition-colors focus:outline-none"
                >
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-3">
                      <span className="inline-block px-2 py-1 text-xs font-semibold text-gray-600 bg-gray-100 rounded">
                        {item.category}
                      </span>
                      <h3 className="text-base font-semibold text-gray-900">{item.question}</h3>
                    </div>
                  </div>
                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ml-2 flex-shrink-0 ${
                      expandedId === item.id ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </button>

                {expandedId === item.id && (
                  <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                    <p className="text-gray-700 leading-relaxed whitespace-pre-line">{item.answer}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </section>

        {/* 추가 도움말 */}
        <section className="mt-12 p-6 bg-gray-50 rounded-lg border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">더 도움이 필요하신가요?</h2>
          <p className="text-gray-600 mb-4">위의 FAQ에서 찾을 수 없는 질문이 있다면 1:1 문의를 통해 문의해주세요.</p>
          <a
            href="/settings/inquiries"
            className="inline-block px-4 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors focus:outline-none"
          >
            1:1 문의하기
          </a>
        </section>
      </main>
    </div>
  )
}
