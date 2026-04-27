'use client'

export default function GlobalError({ error, reset }) {
  return (
    <html>
      <body style={{ backgroundColor: '#DFDDD9', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ maxWidth: 400, padding: 24, textAlign: 'center', background: '#F5F3EF', borderRadius: 12, border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: '#2C2C2A', marginBottom: 8 }}>Something went wrong</h2>
          <p style={{ fontSize: 12, color: '#9B8C82', marginBottom: 16, wordBreak: 'break-word', fontFamily: 'monospace', background: 'rgba(0,0,0,0.03)', borderRadius: 8, padding: 12 }}>
            {error?.message || 'Unknown error'}
          </p>
          <button
            onClick={() => reset()}
            style={{ fontSize: 13, padding: '8px 16px', backgroundColor: '#2C2C2A', color: '#DFDDD9', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 500 }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
