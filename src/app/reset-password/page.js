'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowser } from '../../lib/supabase/client'

const KCLogo = () => (
  <div className="w-9 h-9 bg-[#2C2C2A] rounded-lg flex items-center justify-center flex-shrink-0">
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M3 2v14M3 9l6-7v14l6-7" stroke="#DFDDD9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  </div>
)

export default function ResetPasswordPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowser()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)

  // When the user arrives via the reset email link, Supabase establishes a
  // short-lived recovery session. We wait for it before allowing password update.
  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) setSessionReady(true)
    }
    check()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setSessionReady(true)
      }
    })
    return () => subscription.unsubscribe()
  }, [supabase])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }

    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setSuccess(true)
      // Redirect to app after a short pause
      setTimeout(() => { router.push('/'); router.refresh() }, 1500)
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
          <h2 className="text-[14px] font-medium text-[#2C2C2A] mb-1">Set a new password</h2>
          <p className="text-[12px] text-[#9B8C82] mb-5">
            Choose a password you'll remember. Minimum 6 characters.
          </p>

          {success ? (
            <div className="space-y-3">
              <div className="text-[12px] text-[#3B6D11] bg-[rgba(99,153,34,0.08)] rounded-lg px-3 py-2.5 border border-[rgba(99,153,34,0.15)]">
                ✓ Password updated. Signing you in...
              </div>
            </div>
          ) : !sessionReady ? (
            <div className="space-y-3">
              <div className="text-[12px] text-[#854F0B] bg-[rgba(186,117,23,0.08)] rounded-lg px-3 py-2.5 border border-[rgba(186,117,23,0.15)]">
                No active reset session found. The link may have expired.
              </div>
              <a href="/forgot-password" className="block text-center text-[12px] text-[#2C2C2A] py-2 hover:underline">
                Request a new reset link
              </a>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <label className="text-[11px] text-[#9B8C82] font-medium block mb-1">New password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                required
                minLength={6}
                autoFocus
                className="w-full text-[13px] border border-[rgba(0,0,0,0.06)] rounded-lg px-3 py-2.5 mb-3 text-[#2C2C2A] placeholder-[#B7A99D] bg-[#F5F3EF] focus:outline-none focus:border-[#2C2C2A] transition-colors"
              />

              <label className="text-[11px] text-[#9B8C82] font-medium block mb-1">Confirm password</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Type it again"
                required
                minLength={6}
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
                {loading ? 'Updating...' : 'Update password'}
              </button>
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
