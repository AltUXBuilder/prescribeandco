'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { ArrowRight, X } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface MenuItem {
  icon: string
  name: string
  desc: string
  slug: string
}

interface GenderMenu {
  label:    string
  subtitle: string
  items:    MenuItem[]
}

interface ApiCategory {
  id:        string
  name:      string
  slug:      string
  parentId:  string | null
  sortOrder: number
}

// ── Editorial maps (icons/descriptions keyed by slug) ────────────────────────

const ICONS: Record<string, string> = {
  'weight-loss':           '⚖️',
  'hair-loss':             '🧴',
  'erectile-dysfunction':  '💊',
  'skin-health':           '✨',
  'digestive-health':      '🌿',
  'mental-health':         '🧠',
  'contraception':         '🌸',
  'menopause':             '🦋',
  'testosterone':          '🩺',
  'supplements':           '🌿',
  'sleep':                 '💤',
}

const DESCS: Record<string, string> = {
  'weight-loss':           'Semaglutide, Wegovy, Mounjaro',
  'hair-loss':             'Finasteride, Minoxidil',
  'erectile-dysfunction':  'Sildenafil, Tadalafil & more',
  'skin-health':           'Tretinoin & targeted skincare',
  'digestive-health':      'Gut health & digestive support',
  'mental-health':         'Anxiety & sleep support',
  'contraception':         'Pill, patch & ring options',
  'menopause':             'HRT & symptom relief',
  'testosterone':          'TRT & hormone management',
}

// ── Static fallback (used until API responds) ─────────────────────────────────

const FALLBACK: Record<'men' | 'women', GenderMenu> = {
  men: {
    label:    "Men's Health",
    subtitle: 'Browse conditions & treatments',
    items: [
      { icon: '⚖️', name: 'Weight Loss',         desc: 'Semaglutide, Wegovy, Mounjaro', slug: 'weight-loss'          },
      { icon: '🧴', name: 'Hair Loss',            desc: 'Finasteride, Minoxidil',        slug: 'hair-loss'            },
      { icon: '💊', name: 'Erectile Dysfunction', desc: 'Sildenafil, Tadalafil & more',  slug: 'erectile-dysfunction' },
    ],
  },
  women: {
    label:    "Women's Health",
    subtitle: 'Browse conditions & treatments',
    items: [
      { icon: '⚖️', name: 'Weight Loss',     desc: 'Semaglutide, Wegovy, Mounjaro',  slug: 'weight-loss'     },
      { icon: '🧴', name: 'Hair Loss',       desc: 'Finasteride, Minoxidil',          slug: 'hair-loss'       },
      { icon: '✨', name: 'Skin Health',     desc: 'Tretinoin & targeted skincare',   slug: 'skin-health'     },
      { icon: '🌿', name: 'Digestive Health', desc: 'Gut health & digestive support', slug: 'digestive-health' },
    ],
  },
}

// ── Component ─────────────────────────────────────────────────────────────────

interface SideMenuProps {
  isOpen:  boolean
  gender:  'men' | 'women'
  onClose: () => void
}

export function SideMenu({ isOpen, gender, onClose }: SideMenuProps) {
  const [menuData, setMenuData] = useState<Record<'men' | 'women', GenderMenu>>(FALLBACK)
  const firstRef = useRef<HTMLButtonElement>(null)
  const menuRef  = useRef<HTMLDivElement>(null)

  // Attempt to load categories from API; fall back silently to static data
  useEffect(() => {
    const base = (typeof window !== 'undefined' ? (window as any).__NEXT_PUBLIC_API_URL : undefined)
      ?? process.env.NEXT_PUBLIC_API_URL
      ?? '/api/v1'

    fetch(`${base}/categories`)
      .then(r => r.ok ? (r.json() as Promise<ApiCategory[]>) : Promise.reject())
      .then(cats => {
        const menParent   = cats.find(c =>
          !c.parentId &&
          !c.slug.includes('women') &&
          (c.slug.includes('men') || c.name.toLowerCase().includes("men's")),
        )
        const womenParent = cats.find(c =>
          !c.parentId &&
          (c.slug.includes('women') || c.name.toLowerCase().includes("women's")),
        )

        function buildItems(parentId: string): MenuItem[] {
          return cats
            .filter(c => c.parentId === parentId)
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map(c => ({
              icon: ICONS[c.slug]  ?? '💊',
              name: c.name,
              desc: DESCS[c.slug] ?? c.name,
              slug: c.slug,
            }))
        }

        const updates: Partial<Record<'men' | 'women', GenderMenu>> = {}

        if (menParent) {
          const items = buildItems(menParent.id)
          if (items.length > 0)
            updates.men = { label: menParent.name, subtitle: FALLBACK.men.subtitle, items }
        }
        if (womenParent) {
          const items = buildItems(womenParent.id)
          if (items.length > 0)
            updates.women = { label: womenParent.name, subtitle: FALLBACK.women.subtitle, items }
        }

        if (Object.keys(updates).length > 0)
          setMenuData(prev => ({ ...prev, ...updates }))
      })
      .catch(() => {})
  }, [])

  const data = menuData[gender]

  // Focus first interactive element when menu opens
  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => firstRef.current?.focus(), 50)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  // Focus trap — keep Tab within the panel
  useEffect(() => {
    if (!isOpen || !menuRef.current) return
    const focusable = menuRef.current.querySelectorAll<HTMLElement>(
      'a[href], button, input, [tabindex]:not([tabindex="-1"])',
    )
    const first = focusable[0]
    const last  = focusable[focusable.length - 1]

    const trap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus() }
      } else {
        if (document.activeElement === last)  { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', trap)
    return () => document.removeEventListener('keydown', trap)
  }, [isOpen])

  return (
    <>
      {/* Backdrop */}
      <div
        className={[
          'fixed inset-0 z-[200] transition-opacity duration-300',
          'bg-charcoal/35 backdrop-blur-pharmacy',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        ].join(' ')}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={menuRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${data.label} navigation`}
        className={[
          'fixed left-0 top-0 bottom-0 z-[201] w-[380px] bg-white',
          'border-r border-[var(--grid-line)] overflow-y-auto',
          'shadow-[8px_0_40px_rgba(26,26,27,0.08)]',
          'transition-transform duration-[350ms] ease-[cubic-bezier(0.25,0.1,0.25,1)]',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-8 pt-7 pb-5 border-b border-[var(--grid-line)]">
          <div>
            <h2 className="font-serif text-2xl font-medium text-charcoal leading-tight">
              {data.label}
            </h2>
            <p className="text-[11px] text-charcoal-muted mt-1 tracking-[0.06em] uppercase">
              {data.subtitle}
            </p>
          </div>
          <button
            ref={firstRef}
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full flex-shrink-0 ml-4
                       border border-[var(--grid-line)] text-charcoal-muted
                       hover:border-brand-lavender hover:text-charcoal hover:bg-brand-lavenderSoft
                       transition-all duration-200"
            aria-label="Close menu"
          >
            <X size={14} strokeWidth={1.5} />
          </button>
        </div>

        {/* Conditions */}
        <section className="px-8 py-6">
          <p className="text-[10px] font-medium tracking-[0.1em] uppercase text-charcoal-muted mb-3">
            Conditions &amp; Treatments
          </p>
          <nav className="space-y-1" aria-label="Conditions">
            {data.items.map(item => (
              <Link
                key={item.slug}
                href={`/condition/${item.slug}`}
                onClick={onClose}
                className="group flex items-center justify-between p-3.5 rounded-lg
                           border border-transparent
                           hover:bg-brand-lavenderSoft hover:border-[var(--grid-hover)]
                           transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 flex items-center justify-center rounded-lg text-base flex-shrink-0
                                  bg-cream-warm border border-[var(--grid-line)]
                                  group-hover:border-[var(--grid-hover)] transition-colors duration-200">
                    {item.icon}
                  </div>
                  <div>
                    <div className="text-[14px] font-medium text-charcoal leading-tight">
                      {item.name}
                    </div>
                    <div className="text-[11px] text-charcoal-muted mt-0.5">
                      {item.desc}
                    </div>
                  </div>
                </div>
                <ArrowRight
                  size={14}
                  strokeWidth={1.5}
                  className="text-charcoal-muted flex-shrink-0
                             group-hover:text-brand-lavenderDark group-hover:translate-x-0.5
                             transition-all duration-200"
                />
              </Link>
            ))}
          </nav>
        </section>

        <div className="h-px bg-[var(--grid-line)] mx-8" />

        {/* Browse all link */}
        <section className="px-8 py-6">
          <Link
            href="/products"
            onClick={onClose}
            className="group flex items-center justify-between p-3.5 rounded-lg
                       border border-transparent
                       hover:bg-cream-warm hover:border-[var(--grid-line)]
                       transition-all duration-200"
          >
            <span className="text-[13px] font-medium text-charcoal-muted group-hover:text-charcoal">
              Browse all treatments
            </span>
            <ArrowRight size={14} strokeWidth={1.5} className="text-charcoal-muted" />
          </Link>
        </section>

        <div className="h-px bg-[var(--grid-line)] mx-8" />

        {/* Footer CTA */}
        <div className="px-8 pb-8 pt-6">
          <div className="bg-cream-warm border border-[var(--grid-line)] rounded-xl p-5">
            <p className="font-serif text-[15px] font-medium text-charcoal mb-1">
              Not sure where to start?
            </p>
            <p className="text-[12px] text-charcoal-muted mb-4 leading-relaxed">
              Take our 2-minute health assessment and we'll recommend the right treatment.
            </p>
            <Link
              href="/consultation/start"
              onClick={onClose}
              className="block w-full text-center px-4 py-2.5 bg-charcoal text-white
                         text-[13px] font-medium rounded-lg border border-charcoal
                         hover:bg-charcoal-medium transition-all duration-200"
            >
              Start Free Assessment
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
