'use client'
import { useState } from 'react'
import { getSupabaseBrowser } from '../../lib/supabase/client'

const KCLogo = () => (
  <div className="w-9 h-9 bg-[#2C2C2A] rounded-lg flex items-center justify-center flex-shrink-0">
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M3 2v14M3 9l6-7v14l6-7" stroke="#DFDDD9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  </div>
)

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = getSupabaseBrowser()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      // redirectTo is where Supabase sends the user after they click the email link
      const redirectTo = `${window.location.origin}/reset-password`
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
      if (error) throw error
      setSent(true)
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#DFDDD9] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-3">
            <KCLogo />
          </div>
          <h1 className="text-xl font-medium text-[#2C2C2A] tracking-tight">Kindfolks</h1>
          <p className="text-[11px] uppercase tracking-[1.5px] text-[#9B8C82] mt-1">By Kind Collective</p>
        </div>

        <div className="bg-[#F5F3EF] rounded-xl border border-[rgba(0,0,0,0.04)] shadow-sm p-6">
          <h2 className="text-[14px] font-medium text-[#2C2C2A] mb-1">Forgot your password?</h2>
          <p className="text-[12px] text-[#9B8C82] mb-5">
            {sent
              ? "Check your email for a reset link. It may take a minute to arrive."
              : "Enter your email and we'll send you a link to reset it."}
          </p>

          {sent ? (
            <div className="space-y-3">
              <div className="text-[12px] text-[#3B6D11] bg-[rgba(99,153,34,0.08)] rounded-lg px-3 py-2.5 border border-[rgba(99,153,34,0.15)]">
                ✓ Email sent to <strong>{email}</strong>
              </div>
              <p className="text-[11px] text-[#B7A99D] leading-relaxed">
                The link expires in 1 hour. Can't find it? Check your spam folder, or{' '}
                <button onClick={() => { setSent(false); setEmail('') }} className="text-[#2C2C2A] underline">
                  try again
                </button>.
              </p>
              <a href="/login" className="block text-center text-[12px] text-[#2C2C2A] py-2 hover:underline">
                ← Back to sign in
              </a>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <label className="text-[11px] text-[#9B8C82] font-medium block mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@kindcollective.com"
                required
                autoFocus
                className="w-full text-[13px] border border-[rgba(0,0,0,0.06)] rounded-lg px-3 py-2.5 mb-4 text-[#2C2C2A] placeholder-[#B7A99D] bg-[#F5F3EF] focus:outline-none focus:border-[#2C2C2A] transition-colors"
              />

              {error && (
                <p className="text-[12px] text-[#A32D2D] bg-[rgba(226,75,74,0.06)] rounded-lg px-3 py-2 mb-3">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full text-[13px] py-2.5 bg-[#2C2C2A] text-[#DFDDD9] rounded-lg hover:bg-[#3D3D3A] transition-colors font-medium disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send reset link'}
              </button>

              <a href="/login" className="block text-center text-[12px] text-[#9B8C82] hover:text-[#2C2C2A] mt-3 hover:underline">
                ← Back to sign in
              </a>
            </form>
          )}
        </div>

        <p className="text-center text-[11px] text-[#B7A99D] mt-6 italic">
          Designed for one. Built for the all.
        </p>
      </div>
    </div>
  )
}
