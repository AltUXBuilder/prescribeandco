'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

export default function LoginPage() {
  const router    = useRouter()
  const { login } = useAuth()
  const [email,    setEmail]   = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await login(email, password)
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <div className="border-b border-[var(--grid-line)] px-8 py-5">
        <Link href="/" className="font-serif text-[24px] font-medium text-brand-lavender">P&amp;Co.</Link>
      </div>
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          <div className="bg-white border border-[var(--grid-line)] rounded-2xl overflow-hidden shadow-soft">
            <div className="px-8 pt-8 pb-6 border-b border-[var(--grid-line)]">
              <h1 className="font-serif text-[26px] font-medium text-charcoal mb-1">Sign in</h1>
              <p className="text-[13px] text-charcoal-muted">Welcome back to your P&amp;Co. account.</p>
            </div>
            <form onSubmit={handleSubmit} className="px-8 py-7 space-y-5">
              {error && <div className="px-4 py-3 rounded-lg bg-[#FBF0F0] border border-[#DDABAB] text-[13px] text-[#8A4040]">{error}</div>}
              <div>
                <label htmlFor="email" className="block text-[12px] font-medium text-charcoal mb-2 tracking-[0.04em] uppercase">Email address</label>
                <input id="email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="input-medical" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="password" className="block text-[12px] font-medium text-charcoal tracking-[0.04em] uppercase">Password</label>
                  <Link href="/forgot-password" className="text-[12px] text-charcoal-muted hover:text-charcoal transition-colors">Forgot password?</Link>
                </div>
                <div className="relative">
                  <input id="password" type={showPass ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" className="input-medical pr-12" />
                  <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-charcoal-muted hover:text-charcoal transition-colors" aria-label={showPass ? 'Hide password' : 'Show password'}>
                    {showPass ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading} className="w-full py-3.5 bg-charcoal text-white text-[14px] font-medium rounded-xl border border-charcoal hover:bg-charcoal-medium transition-all duration-200 disabled:bg-cream-deep disabled:text-charcoal-muted disabled:border-[var(--grid-line)] disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {loading ? <><span className="w-4 h-4 border-[1.5px] border-white/30 border-t-white rounded-full animate-spin" />Signing in…</> : 'Sign in'}
              </button>
            </form>
            <div className="px-8 py-5 border-t border-[var(--grid-line)] bg-cream-warm">
              <p className="text-[13px] text-charcoal-muted text-center">Don&apos;t have an account?{' '}<Link href="/register" className="font-medium text-charcoal hover:text-brand-lavenderDark transition-colors">Create one</Link></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
