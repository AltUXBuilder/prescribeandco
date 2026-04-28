'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

export default function RegisterPage() {
  const router       = useRouter()
  const { register } = useAuth()
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', dateOfBirth: '', nhsNumber: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await register({ firstName: form.firstName, lastName: form.lastName, email: form.email, password: form.password, dateOfBirth: form.dateOfBirth || undefined, nhsNumber: form.nhsNumber || undefined })
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.')
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
              <h1 className="font-serif text-[26px] font-medium text-charcoal mb-1">Create account</h1>
              <p className="text-[13px] text-charcoal-muted">Start your consultation journey with P&amp;Co.</p>
            </div>
            <form onSubmit={handleSubmit} className="px-8 py-7 space-y-5">
              {error && <div className="px-4 py-3 rounded-lg bg-[#FBF0F0] border border-[#DDABAB] text-[13px] text-[#8A4040]">{error}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-[12px] font-medium text-charcoal mb-2 tracking-[0.04em] uppercase">First name</label>
                  <input id="firstName" type="text" autoComplete="given-name" required value={form.firstName} onChange={update('firstName')} placeholder="Jane" className="input-medical" />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-[12px] font-medium text-charcoal mb-2 tracking-[0.04em] uppercase">Last name</label>
                  <input id="lastName" type="text" autoComplete="family-name" required value={form.lastName} onChange={update('lastName')} placeholder="Smith" className="input-medical" />
                </div>
              </div>
              <div>
                <label htmlFor="email" className="block text-[12px] font-medium text-charcoal mb-2 tracking-[0.04em] uppercase">Email address</label>
                <input id="email" type="email" autoComplete="email" required value={form.email} onChange={update('email')} placeholder="you@example.com" className="input-medical" />
              </div>
              <div>
                <label htmlFor="password" className="block text-[12px] font-medium text-charcoal mb-2 tracking-[0.04em] uppercase">Password</label>
                <div className="relative">
                  <input id="password" type={showPass ? 'text' : 'password'} autoComplete="new-password" required minLength={10} value={form.password} onChange={update('password')} placeholder="Min. 10 characters" className="input-medical pr-12" />
                  <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-charcoal-muted hover:text-charcoal transition-colors" aria-label={showPass ? 'Hide password' : 'Show password'}>
                    {showPass ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
                  </button>
                </div>
                <p className="mt-1.5 text-[11px] text-charcoal-muted">Must contain uppercase, lowercase, number and special character.</p>
              </div>
              <div>
                <label htmlFor="dob" className="block text-[12px] font-medium text-charcoal mb-2 tracking-[0.04em] uppercase">Date of birth <span className="normal-case text-charcoal-muted font-normal">(optional)</span></label>
                <input id="dob" type="date" autoComplete="bday" value={form.dateOfBirth} onChange={update('dateOfBirth')} className="input-medical" />
              </div>
              <div>
                <label htmlFor="nhs" className="block text-[12px] font-medium text-charcoal mb-2 tracking-[0.04em] uppercase">NHS number <span className="normal-case text-charcoal-muted font-normal">(optional)</span></label>
                <input id="nhs" type="text" inputMode="numeric" pattern="\d{10}" maxLength={10} value={form.nhsNumber} onChange={update('nhsNumber')} placeholder="10-digit NHS number" className="input-medical font-mono" />
              </div>
              <p className="text-[11px] text-charcoal-muted leading-relaxed">By creating an account you agree to our <Link href="/terms" className="underline hover:text-charcoal">Terms of Service</Link> and <Link href="/privacy" className="underline hover:text-charcoal">Privacy Policy</Link>.</p>
              <button type="submit" disabled={loading} className="w-full py-3.5 bg-charcoal text-white text-[14px] font-medium rounded-xl border border-charcoal hover:bg-charcoal-medium transition-all duration-200 disabled:bg-cream-deep disabled:text-charcoal-muted disabled:border-[var(--grid-line)] disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {loading ? <><span className="w-4 h-4 border-[1.5px] border-white/30 border-t-white rounded-full animate-spin" />Creating account…</> : 'Create account'}
              </button>
            </form>
            <div className="px-8 py-5 border-t border-[var(--grid-line)] bg-cream-warm">
              <p className="text-[13px] text-charcoal-muted text-center">Already have an account?{' '}<Link href="/login" className="font-medium text-charcoal hover:text-brand-lavenderDark transition-colors">Sign in</Link></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
