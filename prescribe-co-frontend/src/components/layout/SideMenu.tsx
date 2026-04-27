'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { ArrowRight, X } from 'lucide-react'

// ── Static menu data (replace with API call for truly data-driven) ────────────
const MENU_DATA = {
  men: {
    label: "Men's Health",
    subtitle: 'Browse conditions & treatments',
    prescription: [
      { icon: '💊', name: 'Erectile Dysfunction', desc: 'Sildenafil, Tadalafil & more', slug: 'erectile-dysfunction' },
      { icon: '🧴', name: 'Hair Loss',            desc: 'Finasteride, Minoxidil',       slug: 'hair-loss'           },
      { icon: '⚖️', name: 'Weight Loss',          desc: 'Semaglutide, Wegovy, Mounjaro',slug: 'weight-loss'         },
      { icon: '🧠', name: 'Mental Health',         desc: 'Anxiety & sleep support',      slug: 'mental-health'       },
      { icon: '🩺', name: 'Testosterone',          desc: 'TRT & hormone management',     slug: 'testosterone'        },
    ],
    otc: [
      { icon: '🌿', name: 'Supplements',   desc: 'Vitamins & wellness essentials', slug: 'supplements'   },
      { icon: '🧴', name: 'Skincare',      desc: 'Targeted topical treatments',    slug: 'skincare'      },
    ],
  },
  women: {
    label: "Women's Health",
    subtitle: 'Browse conditions & treatments',
    prescription: [
      { icon: '⚖️', name: 'Weight Loss',    desc: 'Semaglutide, Wegovy, Mounjaro', slug: 'weight-loss'   },
      { icon: '🌸', name: 'Contraception',  desc: 'Pill, patch & ring options',    slug: 'contraception' },
      { icon: '🦋', name: 'Menopause',      desc: 'HRT & symptom relief',          slug: 'menopause'     },
      { icon: '🧴', name: 'Skincare',       desc: 'Tretinoin & acne solutions',    slug: 'skincare'      },
      { icon: '🧠', name: 'Mental Health',  desc: 'Anxiety & sleep support',       slug: 'mental-health' },
    ],
    otc: [
      { icon: '🌿', name: 'Supplements',   desc: 'Vitamins & wellness essentials', slug: 'supplements'   },
      { icon: '💤', name: 'Sleep',         desc: 'Sleep support & relaxation',     slug: 'sleep'         },
    ],
  },
}

interface SideMenuProps {
  isOpen:  boolean
  gender:  'men' | 'women'
  onClose: () => void
}

export function SideMenu({ isOpen, gender, onClose }: SideMenuProps) {
  const data       = MENU_DATA[gender]
  const firstRef   = useRef<HTMLButtonElement>(null)
  const menuRef    = useRef<HTMLDivElement>(null)

  // Focus trap — move focus into menu when it opens
  useEffect(() => {
    if (isOpen) {
      // Small delay so CSS transition completes before focus
      const t = setTimeout(() => firstRef.current?.focus(), 50)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  // Focus trap — keep Tab within the menu
  useEffect(() => {
    if (!isOpen || !menuRef.current) return
    const focusable = menuRef.current.querySelectorAll<HTMLElement>(
      'a[href], button, input, [tabindex]:not([tabindex="-1"])',
    )
    const first = focusable[0]
    const last  = focusable[focusable.length - 1]

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus() }
      } else {
        if (document.activeElement === last)  { e.preventDefault(); first.focus() }
      }
    }

    document.addEventListener('keydown', handleTab)
    return () => document.removeEventListener('keydown', handleTab)
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
          'transition-transform duration-[350ms] cubic-bezier(0.25,0.1,0.25,1)',
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
            className="w-8 h-8 flex items-center justify-center rounded-full
                       border border-[var(--grid-line)] text-charcoal-muted
                       hover:border-brand-lavender hover:text-charcoal hover:bg-brand-lavenderSoft
                       transition-all duration-200 flex-shrink-0 ml-4"
            aria-label="Close menu"
          >
            <X size={14} strokeWidth={1.5} />
          </button>
        </div>

        {/* Prescription treatments */}
        <section className="px-8 py-6">
          <p className="text-[10px] font-medium tracking-[0.1em] uppercase text-charcoal-muted mb-3">
            Prescription Treatments
          </p>
          <nav className="space-y-1" aria-label="Prescription treatments">
            {data.prescription.map(item => (
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
                  <div className="w-9 h-9 flex items-center justify-center rounded-lg
                                  bg-cream-warm border border-[var(--grid-line)]
                                  text-base flex-shrink-0 transition-colors duration-200
                                  group-hover:border-[var(--grid-hover)]">
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
                  className="text-charcoal-muted group-hover:text-brand-lavenderDark
                             transition-all duration-200 group-hover:translate-x-0.5
                             flex-shrink-0"
                  strokeWidth={1.5}
                />
              </Link>
            ))}
          </nav>
        </section>

        {/* Divider */}
        <div className="h-px bg-[var(--grid-line)] mx-8" />

        {/* OTC section */}
        <section className="px-8 py-6">
          <p className="text-[10px] font-medium tracking-[0.1em] uppercase text-charcoal-muted mb-3">
            Over the Counter
          </p>
          <nav className="space-y-1" aria-label="Over the counter products">
            {data.otc.map(item => (
              <Link
                key={item.slug}
                href={`/shop/${item.slug}`}
                onClick={onClose}
                className="group flex items-center justify-between p-3.5 rounded-lg
                           border border-transparent
                           hover:bg-brand-lavenderSoft hover:border-[var(--grid-hover)]
                           transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 flex items-center justify-center rounded-lg
                                  bg-cream-warm border border-[var(--grid-line)]
                                  text-base flex-shrink-0">
                    {item.icon}
                  </div>
                  <div>
                    <div className="text-[14px] font-medium text-charcoal">{item.name}</div>
                    <div className="text-[11px] text-charcoal-muted mt-0.5">{item.desc}</div>
                  </div>
                </div>
                <ArrowRight size={14} className="text-charcoal-muted group-hover:text-brand-lavenderDark transition-all duration-200" strokeWidth={1.5} />
              </Link>
            ))}
          </nav>
        </section>

        {/* Footer CTA */}
        <div className="px-8 pb-8">
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
