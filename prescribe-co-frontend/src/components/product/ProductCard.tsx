import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, ShoppingCart, Stethoscope } from 'lucide-react'
import type { Product } from '@/lib/api'
import { cn } from '@/lib/utils'

interface ProductCardProps {
  product:   Product
  className?: string
  /** 'grid' = standard product page card; 'featured' = larger hero variant */
  variant?:  'grid' | 'featured'
}

/**
 * ProductCard
 * ───────────
 * Visual distinction between Rx and OTC is critical for regulatory compliance:
 *
 *   Rx (requiresPrescription) → 'Start Consultation' CTA
 *     - Darker border treatment, lavender badge
 *     - Stethoscope icon signals clinical journey
 *
 *   OTC (over the counter) → 'Add to Cart' CTA
 *     - Sage green badge, shopping cart icon
 *     - Lighter visual weight — frictionless purchase
 */
export function ProductCard({ product, className, variant = 'grid' }: ProductCardProps) {
  const isRx       = product.requiresPrescription
  const isFeatured = variant === 'featured'

  return (
    <article
      className={cn(
        'group bg-white border border-[var(--grid-line)] card-hover',
        'flex flex-col overflow-hidden',
        isFeatured ? 'rounded-2xl' : 'rounded-xl',
        className,
      )}
      aria-label={`${product.name} — ${isRx ? 'Prescription required' : 'Available over the counter'}`}
    >
      {/* Product image */}
      <div
        className={cn(
          'relative overflow-hidden bg-cream-warm border-b border-[var(--grid-line)]',
          isFeatured ? 'h-56' : 'h-44',
        )}
      >
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            sizes={isFeatured ? '(max-width: 768px) 100vw, 50vw' : '(max-width: 768px) 100vw, 33vw'}
          />
        ) : (
          // Placeholder with medicine-type-specific gradient
          <div
            className={cn(
              'absolute inset-0 flex items-center justify-center',
              isRx
                ? 'bg-gradient-to-br from-brand-lavenderSoft via-cream-warm to-sage-soft'
                : 'bg-gradient-to-br from-sage-soft via-cream-warm to-brand-lavenderSoft',
            )}
          >
            <span className="font-serif text-charcoal-muted/40 text-sm italic">
              {product.name}
            </span>
          </div>
        )}

        {/* Classification badge — top left */}
        <div className="absolute top-3 left-3">
          {isRx ? (
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1
                         bg-brand-lavenderSoft/90 text-brand-lavenderDark
                         border border-brand-lavender/30
                         text-[10px] font-medium tracking-wide uppercase rounded-full
                         backdrop-blur-sm"
            >
              <Stethoscope size={10} strokeWidth={2} />
              Prescription
            </span>
          ) : (
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1
                         bg-sage-soft/90 text-sage-deep
                         border border-sage/30
                         text-[10px] font-medium tracking-wide uppercase rounded-full
                         backdrop-blur-sm"
            >
              Over the Counter
            </span>
          )}
        </div>

        {/* Medicine type — top right */}
        <div className="absolute top-3 right-3">
          <span
            className="text-[9px] font-mono font-medium tracking-[0.1em] uppercase
                       px-2 py-1 rounded bg-white/80 border border-[var(--grid-line)]
                       text-charcoal-muted backdrop-blur-sm"
          >
            {product.medicineType}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 p-5">
        {/* Category */}
        {product.categoryId && (
          <p className="text-[10px] font-medium tracking-[0.1em] uppercase text-charcoal-muted mb-1.5">
            {/* In production, resolve categoryId to category name */}
            Treatment
          </p>
        )}

        {/* Product name */}
        <h3
          className={cn(
            'font-serif font-medium text-charcoal leading-tight mb-2',
            isFeatured ? 'text-xl' : 'text-[17px]',
          )}
        >
          {product.name}
        </h3>

        {/* Description */}
        {product.description && (
          <p className="text-[12px] text-charcoal-muted leading-relaxed flex-1 mb-4 line-clamp-2">
            {product.description}
          </p>
        )}

        {/* BNF code — clinical reference */}
        {product.bnfCode && (
          <p className="text-[10px] font-mono text-charcoal-muted/60 mb-3">
            BNF: {product.bnfCode}
          </p>
        )}
      </div>

      {/* Footer — price + CTA */}
      <div className="px-5 py-4 border-t border-[var(--grid-line)] flex items-center justify-between gap-3">
        <div>
          <p className="text-[15px] font-semibold text-charcoal">{product.formattedPrice}</p>
          <p className="text-[10px] text-charcoal-muted mt-0.5 tracking-wide">
            {isRx ? 'After consultation' : 'Free delivery over £25'}
          </p>
        </div>

        {isRx ? (
          /* Prescription CTA — heavier visual weight */
          <Link
            href={`/consultation/start?product=${product.id}`}
            className="flex items-center gap-2 px-4 py-2.5
                       bg-charcoal text-white text-[12px] font-medium
                       rounded-lg border border-charcoal
                       hover:bg-charcoal-medium
                       transition-all duration-200
                       whitespace-nowrap group/cta"
            aria-label={`Start consultation for ${product.name}`}
          >
            Start Consultation
            <ArrowRight
              size={12}
              className="transition-transform duration-200 group-hover/cta:translate-x-0.5"
              strokeWidth={2}
            />
          </Link>
        ) : (
          /* OTC CTA — lighter, sage green */
          <button
            className="flex items-center gap-2 px-4 py-2.5
                       bg-sage-soft text-sage-deep text-[12px] font-medium
                       rounded-lg border border-sage/30
                       hover:bg-sage hover:text-white hover:border-sage
                       transition-all duration-200
                       whitespace-nowrap"
            aria-label={`Add ${product.name} to cart`}
          >
            <ShoppingCart size={12} strokeWidth={2} />
            Add to Cart
          </button>
        )}
      </div>
    </article>
  )
}

/* Loading skeleton — matches card dimensions */
export function ProductCardSkeleton({ variant = 'grid' }: { variant?: 'grid' | 'featured' }) {
  return (
    <div className="bg-white border border-[var(--grid-line)] rounded-xl overflow-hidden animate-pulse">
      <div className={cn('skeleton', variant === 'featured' ? 'h-56' : 'h-44')} />
      <div className="p-5 space-y-3">
        <div className="skeleton h-3 w-16 rounded" />
        <div className="skeleton h-5 w-3/4 rounded" />
        <div className="skeleton h-3 w-full rounded" />
        <div className="skeleton h-3 w-5/6 rounded" />
      </div>
      <div className="px-5 py-4 border-t border-[var(--grid-line)] flex justify-between items-center">
        <div className="space-y-1.5">
          <div className="skeleton h-4 w-16 rounded" />
          <div className="skeleton h-3 w-24 rounded" />
        </div>
        <div className="skeleton h-9 w-32 rounded-lg" />
      </div>
    </div>
  )
}
