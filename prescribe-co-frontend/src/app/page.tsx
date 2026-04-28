import Link from 'next/link'
import { ArrowRight, Shield, Clock, Star } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { ProductCard, ProductCardSkeleton } from '@/components/product/ProductCard'
import { productsService } from '@/lib/api'

async function FeaturedProducts() {
  try {
    const { data: products } = await productsService.list({ limit: 6, page: 1 })
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map(product => <ProductCard key={product.id} product={product} />)}
      </div>
    )
  } catch {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => <ProductCardSkeleton key={i} />)}
      </div>
    )
  }
}

const TRUST_ITEMS = [
  { icon: Shield, label: 'GPhC Registered',  desc: 'Fully regulated UK pharmacy'      },
  { icon: Clock,  label: 'Same-Day Review',   desc: 'Prescriber response within hours' },
  { icon: Star,   label: 'Discreet Delivery', desc: 'Plain packaging, tracked post'    },
]

export default function HomePage() {
  return (
    <>
      <Header />

      <section className="relative overflow-hidden border-b border-[var(--grid-line)]">
        <div className="max-w-[1200px] mx-auto px-8 border-l border-r border-[var(--grid-line)]">
          <div className="py-24 lg:py-32 max-w-2xl">
            <p className="text-[11px] font-medium tracking-[0.12em] uppercase text-charcoal-muted mb-6">UK Regulated Online Pharmacy</p>
            <h1 className="font-serif text-display-xl font-medium text-charcoal mb-6 text-balance">
              Healthcare designed <em className="text-brand-lavender not-italic">for you.</em>
            </h1>
            <p className="text-[16px] text-charcoal-muted leading-relaxed mb-10 max-w-lg">
              Confidential consultations with UK-registered prescribers. Prescription treatments delivered discreetly to your door.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/consultation/start" className="flex items-center gap-2 px-6 py-3.5 bg-charcoal text-white text-[14px] font-medium rounded-xl border border-charcoal hover:bg-charcoal-medium transition-all duration-200">
                Start Free Consultation <ArrowRight size={14} strokeWidth={2} />
              </Link>
              <Link href="/products" className="flex items-center gap-2 px-6 py-3.5 bg-white text-charcoal text-[14px] font-medium rounded-xl border border-[var(--grid-line)] hover:border-brand-lavender hover:bg-brand-lavenderSoft transition-all duration-200">
                Browse Treatments
              </Link>
            </div>
          </div>
        </div>
        <div className="absolute inset-0 -z-10 opacity-30" style={{ backgroundImage: `linear-gradient(var(--grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--grid-line) 1px, transparent 1px)`, backgroundSize: '80px 80px' }} />
      </section>

      <section className="border-b border-[var(--grid-line)] bg-white">
        <div className="max-w-[1200px] mx-auto px-8 border-l border-r border-[var(--grid-line)]">
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[var(--grid-line)]">
            {TRUST_ITEMS.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-center gap-4 px-6 py-5">
                <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-brand-lavenderSoft border border-brand-lavender/30 flex-shrink-0">
                  <Icon size={16} strokeWidth={1.5} className="text-brand-lavenderDark" />
                </div>
                <div>
                  <p className="text-[13px] font-medium text-charcoal">{label}</p>
                  <p className="text-[11px] text-charcoal-muted">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-[1200px] mx-auto px-8 border-l border-r border-[var(--grid-line)]">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-[11px] font-medium tracking-[0.1em] uppercase text-charcoal-muted mb-2">Our Treatments</p>
              <h2 className="font-serif text-display-md font-medium text-charcoal">Popular treatments</h2>
            </div>
            <Link href="/products" className="flex items-center gap-1.5 text-[13px] font-medium text-charcoal-muted hover:text-charcoal transition-colors group">
              View all <ArrowRight size={13} className="transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={1.5} />
            </Link>
          </div>
          <FeaturedProducts />
        </div>
      </section>

      <section className="py-20 bg-white border-t border-[var(--grid-line)]">
        <div className="max-w-[1200px] mx-auto px-8 border-l border-r border-[var(--grid-line)]">
          <div className="text-center mb-14">
            <p className="text-[11px] font-medium tracking-[0.1em] uppercase text-charcoal-muted mb-2">The Process</p>
            <h2 className="font-serif text-display-md font-medium text-charcoal">How it works</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Choose a treatment',    desc: 'Browse our range of prescription and OTC treatments.' },
              { step: '02', title: 'Complete consultation', desc: 'Answer a short health questionnaire. A UK prescriber reviews your answers.' },
              { step: '03', title: 'Receive your order',    desc: 'Approved prescriptions are dispensed and delivered discreetly to your door.' },
            ].map(({ step, title, desc }) => (
              <div key={step}>
                <p className="font-mono text-[11px] font-medium tracking-[0.1em] uppercase text-brand-lavender mb-3">{step}</p>
                <h3 className="font-serif text-[18px] font-medium text-charcoal mb-2">{title}</h3>
                <p className="text-[13px] text-charcoal-muted leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--grid-line)] py-10">
        <div className="max-w-[1200px] mx-auto px-8 border-l border-r border-[var(--grid-line)] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="font-serif text-[20px] font-medium text-brand-lavender">P&amp;Co.</p>
          <p className="text-[12px] text-charcoal-muted">© {new Date().getFullYear()} Prescribe &amp; Co. GPhC registered UK pharmacy.</p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="text-[12px] text-charcoal-muted hover:text-charcoal transition-colors">Privacy</Link>
            <Link href="/terms" className="text-[12px] text-charcoal-muted hover:text-charcoal transition-colors">Terms</Link>
            <Link href="/contact" className="text-[12px] text-charcoal-muted hover:text-charcoal transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </>
  )
}
