'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Menu, Search, ShoppingBag, User, X } from 'lucide-react'
import { SideMenu } from './SideMenu'

const NAV_LINKS = [
  { label: 'Home',        href: '/'              },
  { label: 'Men',         href: '/men',   side: 'men'   },
  { label: 'Women',       href: '/women', side: 'women' },
  { label: 'Weight Loss', href: '/condition/weight-loss' },
  { label: 'Contact',     href: '/contact'       },
]

export function Header() {
  const [scrolled,   setScrolled]   = useState(false)
  const [sideOpen,   setSideOpen]   = useState(false)
  const [sideGender, setSideGender] = useState<'men' | 'women'>('men')
  const [searchOpen, setSearchOpen] = useState(false)

  // Scroll detection for nav elevation
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close side menu on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSideOpen(false)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  const openSide = useCallback((gender: 'men' | 'women') => {
    setSideGender(gender)
    setSideOpen(true)
  }, [])

  return (
    <>
      {/* ── Navigation ──────────────────────────────────────────────────────── */}
      <header
        className={[
          'sticky top-0 z-50 transition-all duration-300',
          scrolled
            ? 'bg-cream/95 backdrop-blur-md border-b border-[var(--grid-line)] shadow-soft'
            : 'bg-cream/90 backdrop-blur-sm border-b border-[var(--grid-line)]',
        ].join(' ')}
        style={{ '--nav-height': '72px' } as React.CSSProperties}
      >
        <div className="max-w-[1200px] mx-auto px-8 border-l border-r border-[var(--grid-line)]">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center h-[72px]">

            {/* Left nav links */}
            <nav className="flex items-center gap-0" aria-label="Primary navigation left">
              {NAV_LINKS.slice(0, 2).map(link => (
                link.side ? (
                  <button
                    key={link.label}
                    onClick={() => openSide(link.side as 'men' | 'women')}
                    className="nav-link"
                    aria-haspopup="dialog"
                    aria-expanded={sideOpen && sideGender === link.side}
                  >
                    {link.label}
                  </button>
                ) : (
                  <Link key={link.label} href={link.href} className="nav-link">
                    {link.label}
                  </Link>
                )
              ))}
            </nav>

            {/* Logo — centred with generous padding */}
            <div className="px-8 flex items-center justify-center">
              <Link
                href="/"
                className="font-serif text-[28px] font-medium text-brand-lavender tracking-tight
                           hover:text-brand-lavenderDark transition-colors duration-200
                           focus-visible:outline-2 focus-visible:outline-brand-lavender focus-visible:outline-offset-4"
                aria-label="P&Co. — Go to homepage"
              >
                P&amp;Co.
              </Link>
            </div>

            {/* Right nav links + utility icons */}
            <div className="flex items-center justify-end gap-0">
              {NAV_LINKS.slice(2).map(link => (
                link.side ? (
                  <button
                    key={link.label}
                    onClick={() => openSide(link.side as 'men' | 'women')}
                    className="nav-link"
                  >
                    {link.label}
                  </button>
                ) : (
                  <Link key={link.label} href={link.href} className="nav-link">
                    {link.label}
                  </Link>
                )
              ))}

              {/* Utility icons */}
              <div className="flex items-center gap-1 ml-3 pl-3 border-l border-[var(--grid-line)]">
                <button
                  className="w-9 h-9 flex items-center justify-center rounded-md
                             text-charcoal-muted hover:text-charcoal hover:bg-brand-lavenderSoft
                             border border-transparent hover:border-[var(--grid-hover)]
                             transition-all duration-200"
                  aria-label="Search"
                  onClick={() => setSearchOpen(v => !v)}
                >
                  <Search size={16} strokeWidth={1.5} />
                </button>

                <Link
                  href="/account"
                  className="w-9 h-9 flex items-center justify-center rounded-md
                             text-charcoal-muted hover:text-charcoal hover:bg-brand-lavenderSoft
                             border border-transparent hover:border-[var(--grid-hover)]
                             transition-all duration-200"
                  aria-label="Account"
                >
                  <User size={16} strokeWidth={1.5} />
                </Link>

                <Link
                  href="/cart"
                  className="w-9 h-9 flex items-center justify-center rounded-md
                             text-charcoal-muted hover:text-charcoal hover:bg-brand-lavenderSoft
                             border border-transparent hover:border-[var(--grid-hover)]
                             transition-all duration-200 relative"
                  aria-label="Cart"
                >
                  <ShoppingBag size={16} strokeWidth={1.5} />
                  {/* Cart badge */}
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full
                                   bg-brand-lavender text-white text-[9px] font-medium
                                   flex items-center justify-center leading-none">
                    2
                  </span>
                </Link>

                <Link
                  href="/consultation/start"
                  className="ml-2 px-4 py-2 bg-charcoal text-white text-[13px] font-medium
                             rounded-md tracking-wide border border-charcoal
                             hover:bg-charcoal-medium transition-all duration-200
                             whitespace-nowrap"
                >
                  Start Consultation
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Search bar — slides down under nav */}
        <div
          className={[
            'overflow-hidden transition-all duration-300 border-t border-[var(--grid-line)]',
            searchOpen ? 'max-h-16' : 'max-h-0',
          ].join(' ')}
        >
          <div className="max-w-[1200px] mx-auto px-8 py-3">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-charcoal-muted"
                strokeWidth={1.5}
              />
              <input
                type="search"
                placeholder="Search treatments, conditions…"
                autoFocus={searchOpen}
                className="input-medical pl-10 pr-10 py-3 text-sm"
                aria-label="Search"
              />
              {searchOpen && (
                <button
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-charcoal-muted
                             hover:text-charcoal transition-colors"
                  onClick={() => setSearchOpen(false)}
                  aria-label="Close search"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── Side Menu ──────────────────────────────────────────────────────── */}
      <SideMenu
        isOpen={sideOpen}
        gender={sideGender}
        onClose={() => setSideOpen(false)}
      />
    </>
  )
}
