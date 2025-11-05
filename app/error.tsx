'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 'bold', color: '#111827', marginBottom: '1rem' }}>오류가 발생했습니다</h1>
        <p style={{ color: '#4b5563', marginBottom: '2rem' }}>문제가 발생했습니다. 다시 시도해주세요.</p>
        <button
          onClick={() => reset()}
          style={{ padding: '0.5rem 1.5rem', backgroundColor: '#111827', color: '#fff', borderRadius: '0.5rem', fontWeight: '500', border: 'none', cursor: 'pointer' }}
        >
          다시 시도
        </button>
      </div>
    </div>
  )
}
