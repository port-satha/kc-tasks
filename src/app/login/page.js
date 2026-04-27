'use client'
import { useState } from 'react'
import { getSupabaseBrowser } from '../../lib/supabase/client'
import { useRouter } from 'next/navigation'

const KCLogo = () => (
  <div className="w-9 h-9 bg-[#2C2C2A] rounded-lg flex items-center justify-center flex-shrink-0">
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M3 2v14M3 9l6-7v14l6-7" stroke="#DFDDD9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  </div>
)

export default function LoginPage() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = getSupabaseBrowser()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } }
        })
        if (error) throw error
      }
      router.push('/')
      router.refresh()
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
          <div className="flex rounded-full overflow-hidden mb-5 border border-[rgba(0,0,0,0.06)]">
            {['login', 'signup'].map(m => (
              <button key={m} onClick={() => { setMode(m); setError('') }}
                className={`flex-1 text-[13px] py-2 transition-all capitalize ${mode === m
                  ? 'bg-[#2C2C2A] text-[#DFDDD9] font-medium'
                  : 'text-[#9B8C82] hover:text-[#2C2C2A]'
                }`}>
                {m === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <>
                <label className="text-[11px] text-[#9B8C82] font-medium block mb-1">Full name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="e.g. Port Satha"
                  required={mode === 'signup'}
                  className="w-full text-[13px] border border-[rgba(0,0,0,0.06)] rounded-lg px-3 py-2.5 mb-3 text-[#2C2C2A] placeholder-[#B7A99D] bg-[#F5F3EF] focus:outline-none focus:border-[#2C2C2A] transition-colors"
                />
              </>
            )}

            <label className="text-[11px] text-[#9B8C82] font-medium block mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@kindcollective.com"
              required
              className="w-full text-[13px] border border-[rgba(0,0,0,0.06)] rounded-lg px-3 py-2.5 mb-3 text-[#2C2C2A] placeholder-[#B7A99D] bg-[#F5F3EF] focus:outline-none focus:border-[#2C2C2A] transition-colors"
            />

            <div className="flex items-baseline justify-between mb-1">
              <label className="text-[11px] text-[#9B8C82] font-medium">Password</label>
              {mode === 'login' && (
                <a href="/forgot-password" className="text-[11px] text-[#9B8C82] hover:text-[#2C2C2A] hover:underline">
                  Forgot password?
                </a>
              )}
            </div>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Min 6 characters"
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
              {loading ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-[#B7A99D] mt-6 italic">
          Designed for one. Built for the all.
        </p>
      </div>
    </div>
  )
}
