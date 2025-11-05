function Error({ statusCode }: { statusCode?: number }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 'bold', color: '#111827', marginBottom: '1rem' }}>
          {statusCode ? `An error ${statusCode} occurred` : 'An error occurred'}
        </h1>
        <p style={{ color: '#4b5563' }}>Sorry, something went wrong.</p>
      </div>
    </div>
  )
}

export default Error
