'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LogOut, Package, ArrowRight, User } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { PrescriptionStatusBadge } from '@/components/ui/StatusBadge'
import { useAuth } from '@/lib/auth-context'
import { prescriptionsService, type PrescriptionRequest } from '@/lib/api'
import { timeAgo } from '@/lib/utils'

function statusDescription(status: PrescriptionRequest['status']): string {
  const map: Record<typeof status, string> = {
    DRAFT:        'Your consultation has not been submitted yet.',
    SUBMITTED:    'Your consultation has been submitted and is in the queue for prescriber review.',
    UNDER_REVIEW: 'A prescriber is currently reviewing your consultation.',
    APPROVED:     'Your prescription has been approved and is being prepared for dispensing.',
    REJECTED:     'Your prescription was not approved. Check your email for details.',
    DISPENSING:   'Your order is being prepared and packaged by our pharmacy team.',
    FULFILLED:    'Your order has been dispatched. Check your email for tracking information.',
    CANCELLED:    'This order was cancelled.',
    EXPIRED:      'This prescription has expired.',
  }
  return map[status] ?? ''
}

export default function DashboardPage() {
  const router                     = useRouter()
  const { user, logout, getToken } = useAuth()
  const [prescriptions, setPrescriptions] = useState<PrescriptionRequest[]>([])
  const [loading, setLoading]             = useState(true)
  const [error,   setError]               = useState<string | null>(null)

  useEffect(() => { if (!user) router.replace('/login') }, [user, router])

  const loadPrescriptions = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const token = await getToken()
      if (!token) { router.replace('/login'); return }
      const { data } = await prescriptionsService.list(token)
      setPrescriptions(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders.')
    } finally { setLoading(false) }
  }, [getToken, router])

  useEffect(() => { if (user) loadPrescriptions() }, [user, loadPrescriptions])

  async function handleLogout() { await logout(); router.push('/') }

  if (!user) return null

  return (
    <>
      <Header />
      <div className="max-w-[1200px] mx-auto px-8 border-l border-r border-[var(--grid-line)] py-12">
        <div className="flex items-start justify-between mb-10">
          <div>
            <p className="text-[11px] font-medium tracking-[0.1em] uppercase text-charcoal-muted mb-1">My Account</p>
            <h1 className="font-serif text-display-md font-medium text-charcoal">Welcome back, {user.firstName}.</h1>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-1.5 text-[12px] text-charcoal-muted hover:text-charcoal transition-colors px-3 py-2 rounded-lg hover:bg-cream-warm border border-transparent hover:border-[var(--grid-line)]">
            <LogOut size={13} strokeWidth={1.5} />Sign out
          </button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8">
          <aside className="space-y-2">
            <div className="bg-white border border-[var(--grid-line)] rounded-xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-brand-lavenderSoft border border-brand-lavender/30 flex items-center justify-center flex-shrink-0">
                  <User size={16} strokeWidth={1.5} className="text-brand-lavenderDark" />
                </div>
                <div className="min-w-0">
                  <p className="text-[14px] font-medium text-charcoal truncate">{user.firstName} {user.lastName}</p>
                  <p className="text-[11px] text-charcoal-muted truncate">{user.email}</p>
                </div>
              </div>
              <div className="pt-3 border-t border-[var(--grid-line)] space-y-1">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-charcoal-muted">Account type</span>
                  <span className="font-medium text-charcoal capitalize">{user.role.toLowerCase()}</span>
                </div>
                {user.nhsNumber && (
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-charcoal-muted">NHS number</span>
                    <span className="font-mono text-charcoal">{user.nhsNumber}</span>
                  </div>
                )}
              </div>
            </div>
            <Link href="/products" className="flex items-center gap-2 w-full px-4 py-3 rounded-xl bg-charcoal text-white text-[13px] font-medium hover:bg-charcoal-medium transition-all duration-200">
              <ArrowRight size={13} strokeWidth={2} />Start new consultation
            </Link>
          </aside>
          <main>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-serif text-[20px] font-medium text-charcoal flex items-center gap-2"><Package size={18} strokeWidth={1.5} />My Orders</h2>
              <button onClick={loadPrescriptions} className="text-[12px] text-charcoal-muted hover:text-charcoal transition-colors">Refresh</button>
            </div>
            {loading && (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-white border border-[var(--grid-line)] rounded-xl p-5">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2"><div className="skeleton h-4 w-48 rounded" /><div className="skeleton h-3 w-32 rounded" /></div>
                      <div className="skeleton h-6 w-20 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {error && <div className="bg-[#FBF0F0] border border-[#DDABAB] rounded-xl px-5 py-4 text-[13px] text-[#8A4040]">{error}</div>}
            {!loading && !error && prescriptions.length === 0 && (
              <div className="bg-white border border-[var(--grid-line)] rounded-xl py-16 text-center">
                <div className="w-12 h-12 rounded-full bg-cream-warm border border-[var(--grid-line)] flex items-center justify-center mx-auto mb-4">
                  <Package size={20} strokeWidth={1.5} className="text-charcoal-muted" />
                </div>
                <p className="font-serif text-[18px] font-medium text-charcoal mb-1">No orders yet</p>
                <p className="text-[13px] text-charcoal-muted mb-6">Start a consultation to order your first treatment.</p>
                <Link href="/products" className="inline-flex items-center gap-2 px-5 py-2.5 bg-charcoal text-white text-[13px] font-medium rounded-lg hover:bg-charcoal-medium transition-all duration-200">Browse treatments <ArrowRight size={13} strokeWidth={2} /></Link>
              </div>
            )}
            {!loading && prescriptions.length > 0 && (
              <div className="space-y-3">
                {prescriptions.map(rx => (
                  <div key={rx.id} className="bg-white border border-[var(--grid-line)] rounded-xl p-5 hover:border-brand-lavender/50 transition-all duration-200">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <p className="font-mono text-[11px] text-charcoal-muted">#{rx.id.slice(0, 8).toUpperCase()}</p>
                          <PrescriptionStatusBadge status={rx.status} />
                        </div>
                        <p className="text-[12px] text-charcoal-muted">{rx.submittedAt ? `Submitted ${timeAgo(rx.submittedAt)}` : `Created ${timeAgo(rx.createdAt)}`}</p>
                        {rx.eligibilityStatus && <p className="text-[11px] text-charcoal-muted mt-1">Eligibility: <span className="font-medium">{rx.eligibilityStatus}</span></p>}
                      </div>
                      {rx.status === 'DRAFT' && (
                        <Link href={`/consultation/start?prescription=${rx.id}`} className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 bg-cream-warm text-charcoal text-[12px] font-medium rounded-lg border border-[var(--grid-line)] hover:border-brand-lavender hover:bg-brand-lavenderSoft transition-all duration-200 whitespace-nowrap">
                          Continue <ArrowRight size={11} strokeWidth={2} />
                        </Link>
                      )}
                    </div>
                    <div className="mt-3 pt-3 border-t border-[var(--grid-line)]">
                      <p className="text-[12px] text-charcoal-muted leading-relaxed">{statusDescription(rx.status)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  )
}
