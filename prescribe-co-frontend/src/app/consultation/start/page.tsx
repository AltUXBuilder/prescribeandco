'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react'
import { ConsultationFlow } from '@/components/consultation/ConsultationFlow'
import { useAuth } from '@/lib/auth-context'
import { productsService, prescriptionsService, type Product, type Questionnaire } from '@/lib/api'

type Stage = 'loading' | 'login-required' | 'ready' | 'complete' | 'ineligible' | 'error'

function ConsultationStartInner() {
  const searchParams       = useSearchParams()
  const router             = useRouter()
  const { user, getToken } = useAuth()
  const productId          = searchParams.get('product')

  const [stage,          setStage]          = useState<Stage>('loading')
  const [product,        setProduct]        = useState<Product | null>(null)
  const [questionnaire,  setQuestionnaire]  = useState<Questionnaire | null>(null)
  const [prescriptionId, setPrescriptionId] = useState<string | null>(null)
  const [errorMsg,       setErrorMsg]       = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!productId) { setErrorMsg('No product selected. Please go back and choose a treatment.'); setStage('error'); return }
    if (!user) { setStage('login-required'); return }
    try {
      const [productData, questionnaireData] = await Promise.all([
        productsService.byId(productId),
        productsService.getQuestionnaire(productId),
      ])
      setProduct(productData)
      if (!productData.requiresPrescription || !questionnaireData.requiresQuestionnaire) {
        setErrorMsg('This product does not require a consultation.'); setStage('error'); return
      }
      setQuestionnaire(questionnaireData.questionnaire)
      const token = await getToken()
      if (!token) { setStage('login-required'); return }
      const prescription = await prescriptionsService.create(productId, token)
      setPrescriptionId(prescription.id)
      setStage('ready')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load consultation.')
      setStage('error')
    }
  }, [productId, user, getToken])

  useEffect(() => { load() }, [load])

  const handleComplete = useCallback(async (responseId: string, isEligible: boolean) => {
    if (!prescriptionId) return
    const token = await getToken()
    if (!token) { setStage('login-required'); return }
    try {
      await prescriptionsService.attachQuestionnaire(prescriptionId, responseId, token)
      setStage(isEligible ? 'complete' : 'ineligible')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save consultation.')
      setStage('error')
    }
  }, [prescriptionId, getToken])

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl">
        {stage === 'loading' && (
          <div className="bg-white border border-[var(--grid-line)] rounded-xl p-12 text-center">
            <div className="w-8 h-8 border-2 border-brand-lavender/30 border-t-brand-lavender rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[13px] text-charcoal-muted">Loading your consultation…</p>
          </div>
        )}
        {stage === 'login-required' && (
          <div className="bg-white border border-[var(--grid-line)] rounded-xl p-10 text-center">
            <h2 className="font-serif text-[22px] font-medium text-charcoal mb-3">Sign in to continue</h2>
            <p className="text-[13px] text-charcoal-muted mb-7 max-w-sm mx-auto leading-relaxed">You need an account to start a consultation. It only takes a minute to set up.</p>
            <div className="flex flex-col gap-3 max-w-xs mx-auto">
              <Link href={`/login?redirect=/consultation/start${productId ? `?product=${productId}` : ''}`} className="w-full py-3.5 bg-charcoal text-white text-[14px] font-medium rounded-xl border border-charcoal hover:bg-charcoal-medium transition-all duration-200 text-center">Sign in</Link>
              <Link href={`/register?redirect=/consultation/start${productId ? `?product=${productId}` : ''}`} className="w-full py-3.5 bg-white text-charcoal text-[14px] font-medium rounded-xl border border-[var(--grid-line)] hover:border-brand-lavender hover:bg-brand-lavenderSoft transition-all duration-200 text-center">Create account</Link>
            </div>
          </div>
        )}
        {stage === 'ready' && questionnaire && (
          <div>
            {product && (
              <div className="mb-5 text-center">
                <p className="text-[11px] font-medium tracking-[0.1em] uppercase text-charcoal-muted mb-1">Consultation for</p>
                <h1 className="font-serif text-[22px] font-medium text-charcoal">{product.name}</h1>
              </div>
            )}
            <ConsultationFlow productId={productId!} schema={questionnaire.schema} questionnaireId={questionnaire.id} token="" onComplete={handleComplete} />
          </div>
        )}
        {stage === 'complete' && (
          <div className="bg-white border border-[var(--grid-line)] rounded-xl p-10 text-center">
            <div className="w-14 h-14 rounded-full bg-[#F0F6F1] border border-[#B8D4BD] flex items-center justify-center mx-auto mb-5">
              <CheckCircle size={26} strokeWidth={1.5} className="text-sage-deep" />
            </div>
            <h2 className="font-serif text-[22px] font-medium text-charcoal mb-2">Consultation complete</h2>
            <p className="text-[13px] text-charcoal-muted mb-7 leading-relaxed max-w-sm mx-auto">Your answers have been saved. A UK-registered prescriber will review your consultation and we&apos;ll notify you once a decision has been made.</p>
            <Link href="/dashboard" className="inline-flex items-center gap-2 px-6 py-3.5 bg-charcoal text-white text-[14px] font-medium rounded-xl border border-charcoal hover:bg-charcoal-medium transition-all duration-200">View my orders</Link>
          </div>
        )}
        {stage === 'ineligible' && (
          <div className="bg-white border border-[var(--grid-line)] rounded-xl p-10 text-center">
            <div className="w-14 h-14 rounded-full bg-[#FBF0F0] border border-[#DDABAB] flex items-center justify-center mx-auto mb-5">
              <XCircle size={26} strokeWidth={1.5} className="text-[#8A4040]" />
            </div>
            <h2 className="font-serif text-[22px] font-medium text-charcoal mb-2">Not currently eligible</h2>
            <p className="text-[13px] text-charcoal-muted mb-7 leading-relaxed max-w-sm mx-auto">Based on your answers, this treatment may not be suitable for you at this time. A prescriber will still review your consultation and you will be contacted with advice.</p>
            <Link href="/products" className="inline-flex items-center gap-2 px-6 py-3.5 bg-white text-charcoal text-[14px] font-medium rounded-xl border border-[var(--grid-line)] hover:border-brand-lavender hover:bg-brand-lavenderSoft transition-all duration-200">Browse other treatments</Link>
          </div>
        )}
        {stage === 'error' && (
          <div className="bg-white border border-[var(--grid-line)] rounded-xl p-10 text-center">
            <p className="text-[13px] text-[#8A4040] mb-5">{errorMsg}</p>
            <Link href="/products" className="inline-flex items-center gap-2 text-[13px] text-charcoal-muted hover:text-charcoal transition-colors"><ArrowLeft size={13} strokeWidth={1.5} />Back to treatments</Link>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ConsultationStartPage() {
  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <div className="border-b border-[var(--grid-line)] px-8 py-5 flex items-center justify-between">
        <Link href="/" className="font-serif text-[24px] font-medium text-brand-lavender">P&amp;Co.</Link>
        <Link href="/products" className="flex items-center gap-1.5 text-[12px] text-charcoal-muted hover:text-charcoal transition-colors">
          <ArrowLeft size={13} strokeWidth={1.5} />Back to treatments
        </Link>
      </div>
      <Suspense fallback={
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-brand-lavender/30 border-t-brand-lavender rounded-full animate-spin" />
        </div>
      }>
        <ConsultationStartInner />
      </Suspense>
    </div>
  )
}
