import { Suspense } from 'react'
import { Header } from '@/components/layout/Header'
import { ProductCard, ProductCardSkeleton } from '@/components/product/ProductCard'
import { productsService, type MedicineType } from '@/lib/api'

interface PageProps {
  searchParams: Promise<{ type?: string; search?: string; page?: string }>
}

async function ProductGrid({ medicineType, search, page }: { medicineType?: MedicineType; search?: string; page: number }) {
  const { data: products, total, totalPages } = await productsService.list({ medicineType, search, page, limit: 12 })

  if (products.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="font-serif text-[20px] font-medium text-charcoal mb-2">No treatments found</p>
        <p className="text-[13px] text-charcoal-muted">Try a different search or filter.</p>
      </div>
    )
  }

  return (
    <>
      <p className="text-[12px] text-charcoal-muted mb-6">{total} treatment{total !== 1 ? 's' : ''}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map(product => <ProductCard key={product.id} product={product} />)}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-12">
          {Array.from({ length: totalPages }).map((_, i) => (
            <a key={i} href={`/products?page=${i + 1}${medicineType ? `&type=${medicineType}` : ''}${search ? `&search=${search}` : ''}`}
              className={['w-8 h-8 flex items-center justify-center rounded-lg border text-[13px] font-medium transition-all duration-200', i + 1 === page ? 'bg-charcoal text-white border-charcoal' : 'bg-white text-charcoal-muted border-[var(--grid-line)] hover:border-brand-lavender hover:text-charcoal'].join(' ')}>
              {i + 1}
            </a>
          ))}
        </div>
      )}
    </>
  )
}

const FILTER_TABS = [
  { label: 'All',          value: undefined             },
  { label: 'Prescription', value: 'POM' as MedicineType },
  { label: 'Pharmacy',     value: 'P'   as MedicineType },
  { label: 'Over Counter', value: 'GSL' as MedicineType },
]

export default async function ProductsPage({ searchParams }: PageProps) {
  const params     = await searchParams
  const activeType = params.type as MedicineType | undefined
  const search     = params.search
  const page       = parseInt(params.page ?? '1', 10)

  return (
    <>
      <Header />
      <div className="max-w-[1200px] mx-auto px-8 border-l border-r border-[var(--grid-line)] py-12">
        <div className="mb-10">
          <p className="text-[11px] font-medium tracking-[0.1em] uppercase text-charcoal-muted mb-2">Treatments</p>
          <h1 className="font-serif text-display-md font-medium text-charcoal">All treatments</h1>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-1 p-1 bg-cream-warm rounded-xl border border-[var(--grid-line)]">
            {FILTER_TABS.map(tab => (
              <a key={tab.label} href={tab.value ? `/products?type=${tab.value}` : '/products'}
                className={['px-4 py-2 rounded-lg text-[12px] font-medium tracking-[0.02em] transition-all duration-200 whitespace-nowrap', activeType === tab.value ? 'bg-white text-charcoal shadow-soft border border-[var(--grid-line)]' : 'text-charcoal-muted hover:text-charcoal'].join(' ')}>
                {tab.label}
              </a>
            ))}
          </div>
          <form action="/products" method="GET" className="relative w-full sm:w-64">
            {activeType && <input type="hidden" name="type" value={activeType} />}
            <input type="search" name="search" defaultValue={search} placeholder="Search treatments…" className="input-medical py-2.5 text-[13px]" />
          </form>
        </div>
        <Suspense fallback={<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">{Array.from({ length: 12 }).map((_, i) => <ProductCardSkeleton key={i} />)}</div>}>
          <ProductGrid medicineType={activeType} search={search} page={page} />
        </Suspense>
      </div>
    </>
  )
}
