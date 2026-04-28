import Link from 'next/link'
import { ArrowLeft, ArrowRight, Stethoscope, ShoppingCart, Info } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { productsService } from '@/lib/api'
import { notFound } from 'next/navigation'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  try {
    const product = await productsService.bySlug(slug)
    return { title: product.name, description: product.description ?? `Order ${product.name} online from P&Co. pharmacy.` }
  } catch {
    return { title: 'Product not found' }
  }
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params
  let product
  try { product = await productsService.bySlug(slug) } catch { notFound() }
  const isRx = product.requiresPrescription

  return (
    <>
      <Header />
      <div className="max-w-[1200px] mx-auto px-8 border-l border-r border-[var(--grid-line)] py-12">
        <nav className="flex items-center gap-2 mb-8 text-[12px] text-charcoal-muted" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-charcoal transition-colors">Home</Link>
          <span>/</span>
          <Link href="/products" className="hover:text-charcoal transition-colors">Treatments</Link>
          <span>/</span>
          <span className="text-charcoal">{product.name}</span>
        </nav>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
          <div className="aspect-square rounded-2xl bg-cream-warm border border-[var(--grid-line)] flex items-center justify-center overflow-hidden">
            {product.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-3 text-charcoal-muted/40">
                <div className="w-16 h-16 rounded-full bg-brand-lavenderSoft border border-brand-lavender/20 flex items-center justify-center">
                  <Stethoscope size={28} strokeWidth={1} className="text-brand-lavender" />
                </div>
                <span className="font-serif text-[15px] italic">{product.name}</span>
              </div>
            )}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              {isRx ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-brand-lavenderSoft text-brand-lavenderDark border border-brand-lavender/30 text-[10px] font-medium tracking-wide uppercase rounded-full">
                  <Stethoscope size={10} strokeWidth={2} />Prescription Required
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-sage-soft text-sage-deep border border-sage/30 text-[10px] font-medium tracking-wide uppercase rounded-full">Over the Counter</span>
              )}
              <span className="text-[10px] font-mono font-medium tracking-[0.1em] uppercase px-2 py-1 rounded bg-white border border-[var(--grid-line)] text-charcoal-muted">{product.medicineType}</span>
            </div>
            <h1 className="font-serif text-display-md font-medium text-charcoal mb-3">{product.name}</h1>
            {product.bnfCode && <p className="text-[11px] font-mono text-charcoal-muted/60 mb-4">BNF: {product.bnfCode}</p>}
            {product.description && <p className="text-[15px] text-charcoal-muted leading-relaxed mb-6">{product.description}</p>}
            <div className="py-5 border-t border-b border-[var(--grid-line)] mb-6">
              <p className="text-[28px] font-semibold text-charcoal">{product.formattedPrice}</p>
              <p className="text-[12px] text-charcoal-muted mt-1">{isRx ? 'Price shown after consultation and prescriber approval' : 'Free delivery on orders over £25'}</p>
            </div>
            <div className="flex items-center gap-2 mb-6">
              <div className={`w-2 h-2 rounded-full ${product.isAvailable ? 'bg-sage' : 'bg-status-rejected'}`} />
              <span className="text-[12px] text-charcoal-muted">{product.isAvailable ? 'In stock' : 'Currently unavailable'}</span>
            </div>
            {product.isAvailable ? (
              isRx ? (
                <div className="space-y-3">
                  <Link href={`/consultation/start?product=${product.id}`} className="flex items-center justify-center gap-2 w-full py-4 bg-charcoal text-white text-[14px] font-medium rounded-xl border border-charcoal hover:bg-charcoal-medium transition-all duration-200">
                    Start Consultation <ArrowRight size={14} strokeWidth={2} />
                  </Link>
                  <div className="flex items-start gap-2 px-4 py-3 bg-brand-lavenderSoft rounded-xl border border-brand-lavender/20">
                    <Info size={14} strokeWidth={1.5} className="text-brand-lavenderDark mt-0.5 flex-shrink-0" />
                    <p className="text-[12px] text-brand-lavenderDark leading-relaxed">This treatment requires a consultation with a UK-registered prescriber. Your answers are reviewed before any prescription is issued.</p>
                  </div>
                </div>
              ) : (
                <button className="flex items-center justify-center gap-2 w-full py-4 bg-sage-soft text-sage-deep text-[14px] font-medium rounded-xl border border-sage/30 hover:bg-sage hover:text-white hover:border-sage transition-all duration-200">
                  <ShoppingCart size={16} strokeWidth={1.5} />Add to Cart
                </button>
              )
            ) : (
              <button disabled className="w-full py-4 bg-cream-deep text-charcoal-muted text-[14px] font-medium rounded-xl border border-[var(--grid-line)] cursor-not-allowed">Currently Unavailable</button>
            )}
            <Link href="/products" className="inline-flex items-center gap-1.5 mt-8 text-[12px] text-charcoal-muted hover:text-charcoal transition-colors">
              <ArrowLeft size={13} strokeWidth={1.5} />Back to all treatments
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
