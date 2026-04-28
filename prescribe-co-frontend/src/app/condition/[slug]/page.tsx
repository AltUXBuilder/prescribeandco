import { Suspense } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Stethoscope, ShieldCheck, Clock, Package } from 'lucide-react'
import { notFound } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { ProductCard, ProductCardSkeleton } from '@/components/product/ProductCard'
import { categoriesService, productsService } from '@/lib/api'

// ── Condition content (editorial) ─────────────────────────────────────────────

const CONDITIONS: Record<string, {
  headline: string
  intro:    string
  icon:     string
  genders:  ('men' | 'women')[]
}> = {
  'weight-loss': {
    headline: 'Weight Loss',
    icon:     '⚖️',
    genders:  ['men', 'women'],
    intro:
      'Clinically proven GLP-1 medications including Semaglutide (Wegovy / Ozempic) and ' +
      'Tirzepatide (Mounjaro), prescribed after a consultation with a UK-registered prescriber.',
  },
  'hair-loss': {
    headline: 'Hair Loss',
    icon:     '🧴',
    genders:  ['men', 'women'],
    intro:
      'Evidence-based treatments including Finasteride and Minoxidil to slow hair loss and ' +
      'support regrowth, reviewed and prescribed by our clinical team.',
  },
  'erectile-dysfunction': {
    headline: 'Erectile Dysfunction',
    icon:     '💊',
    genders:  ['men'],
    intro:
      'Discreet, effective treatments including Sildenafil (Viagra) and Tadalafil (Cialis), ' +
      'prescribed following a confidential online consultation.',
  },
  'skin-health': {
    headline: 'Skin Health',
    icon:     '✨',
    genders:  ['women'],
    intro:
      'Prescription-strength skincare including Tretinoin for acne and anti-ageing, reviewed ' +
      'and prescribed by a UK-registered prescriber.',
  },
  'digestive-health': {
    headline: 'Digestive Health',
    icon:     '🌿',
    genders:  ['women'],
    intro:
      'Targeted treatments for digestive conditions, recommended after a thorough online ' +
      'consultation with a qualified prescriber.',
  },
}

const TRUST_ITEMS = [
  {
    Icon:  ShieldCheck,
    label: 'GPhC Registered Pharmacy',
    desc:  'All prescriptions verified by UK-registered clinicians',
  },
  {
    Icon:  Clock,
    label: 'Same-Day Review',
    desc:  'Most consultations reviewed within 24 hours',
  },
  {
    Icon:  Package,
    label: 'Discreet Delivery',
    desc:  'Plain packaging, free tracked delivery',
  },
]

// ── Product grid (async server component) ────────────────────────────────────

async function ConditionProducts({ slug }: { slug: string }) {
  let categoryId: string | undefined

  try {
    const cat = await categoriesService.bySlug(slug)
    categoryId = cat.id
  } catch {
    // Category not yet seeded in DB — show all products as broad fallback
  }

  const { data: products } = await productsService.list({ categoryId, limit: 12 }).catch(
    () => ({ data: [], total: 0, page: 1, limit: 12, totalPages: 0 }),
  )

  if (products.length === 0) {
    return (
      <div className="py-20 text-center bg-white border border-[var(--grid-line)] rounded-2xl">
        <div className="w-12 h-12 rounded-full bg-cream-warm border border-[var(--grid-line)]
                        flex items-center justify-center mx-auto mb-4">
          <Stethoscope size={20} strokeWidth={1.5} className="text-charcoal-muted" />
        </div>
        <p className="font-serif text-[18px] font-medium text-charcoal mb-2">
          Treatments coming soon
        </p>
        <p className="text-[13px] text-charcoal-muted mb-6 max-w-xs mx-auto leading-relaxed">
          We&apos;re adding products to this category. Check back shortly.
        </p>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 px-5 py-2.5
                     bg-charcoal text-white text-[13px] font-medium
                     rounded-lg hover:bg-charcoal-medium transition-all duration-200"
        >
          Browse all treatments
          <ArrowRight size={13} strokeWidth={2} />
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {products.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  const cond = CONDITIONS[slug]
  if (!cond) return { title: 'Not found' }
  return {
    title:       `${cond.headline} Treatments | P&Co.`,
    description: cond.intro,
  }
}

export default async function ConditionPage({ params }: PageProps) {
  const { slug } = await params
  const cond = CONDITIONS[slug]
  if (!cond) notFound()

  const genderLabels = cond.genders.map(g => (g === 'men' ? "Men's Health" : "Women's Health"))

  return (
    <>
      <Header />

      <div className="max-w-[1200px] mx-auto px-8 border-l border-r border-[var(--grid-line)] py-12">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 mb-8 text-[12px] text-charcoal-muted" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-charcoal transition-colors">Home</Link>
          <span>/</span>
          <Link href="/products" className="hover:text-charcoal transition-colors">Treatments</Link>
          <span>/</span>
          <span className="text-charcoal">{cond.headline}</span>
        </nav>

        {/* Hero card */}
        <div className="bg-white border border-[var(--grid-line)] rounded-2xl p-8 lg:p-10 mb-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">

            <div className="w-16 h-16 rounded-2xl bg-brand-lavenderSoft border border-brand-lavender/20
                            flex items-center justify-center text-3xl flex-shrink-0 select-none">
              {cond.icon}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {genderLabels.map(label => (
                  <span
                    key={label}
                    className="text-[10px] font-medium tracking-[0.08em] uppercase
                               px-2.5 py-1 rounded-full bg-cream-warm
                               border border-[var(--grid-line)] text-charcoal-muted"
                  >
                    {label}
                  </span>
                ))}
                <span
                  className="inline-flex items-center gap-1.5
                             text-[10px] font-medium tracking-[0.08em] uppercase
                             px-2.5 py-1 rounded-full
                             bg-brand-lavenderSoft border border-brand-lavender/30
                             text-brand-lavenderDark"
                >
                  <Stethoscope size={10} strokeWidth={2} />
                  Prescription Required
                </span>
              </div>

              <h1 className="font-serif text-display-md font-medium text-charcoal mb-2">
                {cond.headline}
              </h1>

              <p className="text-[14px] text-charcoal-muted leading-relaxed max-w-2xl">
                {cond.intro}
              </p>
            </div>

            <Link
              href="/consultation/start"
              className="flex-shrink-0 flex items-center gap-2 px-5 py-3
                         bg-charcoal text-white text-[13px] font-medium
                         rounded-xl border border-charcoal
                         hover:bg-charcoal-medium transition-all duration-200 whitespace-nowrap"
            >
              Start Consultation
              <ArrowRight size={13} strokeWidth={2} />
            </Link>
          </div>
        </div>

        {/* Trust bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {TRUST_ITEMS.map(({ Icon, label, desc }) => (
            <div
              key={label}
              className="bg-white border border-[var(--grid-line)] rounded-xl p-5
                         flex items-start gap-3"
            >
              <div className="w-8 h-8 rounded-lg bg-brand-lavenderSoft border border-brand-lavender/20
                              flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon size={15} strokeWidth={1.5} className="text-brand-lavenderDark" />
              </div>
              <div>
                <p className="font-medium text-[13px] text-charcoal mb-0.5">{label}</p>
                <p className="text-[12px] text-charcoal-muted leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Product grid */}
        <div>
          <h2 className="font-serif text-[20px] font-medium text-charcoal mb-6">
            Available Treatments
          </h2>

          <Suspense
            fallback={
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            }
          >
            <ConditionProducts slug={slug} />
          </Suspense>
        </div>

        {/* Back link */}
        <div className="mt-12 pt-8 border-t border-[var(--grid-line)]">
          <Link
            href="/products"
            className="inline-flex items-center gap-1.5 text-[12px] text-charcoal-muted
                       hover:text-charcoal transition-colors"
          >
            <ArrowLeft size={13} strokeWidth={1.5} />
            Browse all treatments
          </Link>
        </div>

      </div>
    </>
  )
}
