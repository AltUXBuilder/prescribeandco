/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ── Brand ─────────────────────────────────────────────────────────────
        brand: {
          lavender:  '#C4B5D5', // logo colour — primary brand
          lavenderDark: '#A99BBE',
          lavenderLight: '#E8E1F0',
          lavenderSoft: '#F4F0F8',
        },
        // ── Sophisticated Neutrals ─────────────────────────────────────────────
        charcoal: {
          DEFAULT: '#1A1A1B',
          medium:  '#2C2C2D',
          soft:    '#3E3E40',
          muted:   '#6B6B6E',
        },
        cream: {
          DEFAULT: '#F9F8F6',
          warm:    '#F5F3EF',
          deep:    '#EDE9E3',
        },
        // ── Sage accent ──────────────────────────────────────────────────────
        sage: {
          DEFAULT: '#8EA898',
          light:   '#B8CCBf',
          soft:    '#E8F0EC',
          deep:    '#5C7A69',
        },
        // ── Slate accent ─────────────────────────────────────────────────────
        slate: {
          pharmacy: '#7B8FA6',
          light:    '#B4C3D1',
          soft:     '#E6ECF2',
        },
        // ── Status colours (muted, pharmaceutical) ────────────────────────────
        status: {
          approved:  '#7A9E7E',  // muted sage green
          pending:   '#B8A86E',  // warm amber
          rejected:  '#B07070',  // muted rose
          dispensing:'#7B8FA6',  // slate blue
          draft:     '#A0A0A3',  // neutral grey
        },
      },
      fontFamily: {
        // Editorial serif for headings
        serif:  ['var(--font-playfair)', 'Georgia', 'serif'],
        // Clean sans for UI
        sans:   ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
        // Mono for reference numbers
        mono:   ['var(--font-dm-mono)', 'monospace'],
      },
      fontSize: {
        'display-2xl': ['clamp(2.5rem, 5vw, 4.5rem)', { lineHeight: '1.05', letterSpacing: '-0.025em' }],
        'display-xl':  ['clamp(2rem, 4vw, 3.5rem)',   { lineHeight: '1.08', letterSpacing: '-0.02em'  }],
        'display-lg':  ['clamp(1.75rem, 3vw, 2.75rem)',{ lineHeight: '1.1',  letterSpacing: '-0.015em' }],
        'display-md':  ['clamp(1.5rem, 2.5vw, 2rem)',  { lineHeight: '1.15', letterSpacing: '-0.01em'  }],
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '26': '6.5rem',
        '30': '7.5rem',
      },
      borderRadius: {
        'pill': '999px',
        '4xl':  '2rem',
      },
      boxShadow: {
        'soft':       '0 2px 12px 0 rgba(26,26,27,0.06)',
        'card':       '0 4px 24px 0 rgba(26,26,27,0.08)',
        'elevated':   '0 8px 40px 0 rgba(26,26,27,0.12)',
        'brand-glow': '0 0 0 3px rgba(196,181,213,0.35)',
        'inset-soft': 'inset 0 1px 3px 0 rgba(26,26,27,0.08)',
      },
      transitionTimingFunction: {
        'elegant': 'cubic-bezier(0.25, 0.1, 0.25, 1)',
        'spring':  'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      keyframes: {
        'slide-in-left': {
          '0%':   { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)',     opacity: '1' },
        },
        'slide-out-left': {
          '0%':   { transform: 'translateX(0)',     opacity: '1' },
          '100%': { transform: 'translateX(-100%)', opacity: '0' },
        },
        'fade-up': {
          '0%':   { transform: 'translateY(16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',    opacity: '1' },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'shimmer': {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition:  '200% 0' },
        },
      },
      animation: {
        'slide-in-left':  'slide-in-left 0.35s cubic-bezier(0.25, 0.1, 0.25, 1) forwards',
        'slide-out-left': 'slide-out-left 0.3s cubic-bezier(0.25, 0.1, 0.25, 1) forwards',
        'fade-up':        'fade-up 0.4s cubic-bezier(0.25, 0.1, 0.25, 1) forwards',
        'fade-in':        'fade-in 0.25s ease-out forwards',
        'shimmer':        'shimmer 1.8s linear infinite',
      },
    },
  },
  plugins: [],
}
