'use client'

export default function Error({ error, reset }) {
  return (
    <div className="min-h-screen bg-[#DFDDD9] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-[#F5F3EF] rounded-xl border border-[rgba(0,0,0,0.04)] p-6 shadow-sm text-center">
        <div className="text-2xl mb-3">⚠️</div>
        <h2 className="text-[15px] font-semibold text-[#2C2C2A] mb-2">Something went wrong</h2>
        <p className="text-[12px] text-[#9B8C82] mb-4 break-words font-mono bg-[rgba(0,0,0,0.03)] rounded-lg p-3">
          {error?.message || 'Unknown error'}
        </p>
        <button
          onClick={() => reset()}
          className="text-[13px] px-4 py-2 bg-[#2C2C2A] text-[#DFDDD9] rounded-lg hover:bg-[#3D3D3A] transition-colors font-medium"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
