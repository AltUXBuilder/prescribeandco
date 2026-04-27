# P&Co. Frontend — Architecture Reference

## Stack
- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS v4 + CSS custom properties
- **Fonts**: Playfair Display (serif headlines) + DM Sans (UI) + DM Mono (refs)
- **Icons**: Lucide React
- **State**: React hooks (no global store needed — colocated state)
- **HTTP**: Native fetch via centralised service layer

---

## Folder Structure

```
src/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout — fonts, metadata, body classes
│   ├── globals.css               # Tailwind base + CSS custom properties
│   ├── page.tsx                  # Home page (Server Component)
│   │
│   ├── (marketing)/              # Route group — no shared layout chrome
│   │   ├── men/page.tsx          # Men's category landing
│   │   └── women/page.tsx        # Women's category landing
│   │
│   ├── condition/
│   │   └── [slug]/page.tsx       # Dynamic condition/product grid page
│   │
│   ├── consultation/
│   │   ├── start/page.tsx        # Product selection → questionnaire entry
│   │   └── [prescriptionId]/
│   │       ├── questionnaire/page.tsx   # Multi-step questionnaire
│   │       ├── review/page.tsx          # Summary before payment
│   │       └── payment/page.tsx         # Payment capture
│   │
│   ├── account/
│   │   ├── layout.tsx            # Shared dashboard shell
│   │   ├── page.tsx              # Customer dashboard
│   │   ├── prescriptions/
│   │   │   ├── page.tsx          # Prescription list
│   │   │   └── [id]/page.tsx     # Single prescription detail
│   │   └── settings/page.tsx
│   │
│   ├── prescriber/               # Role-gated: PRESCRIBER only
│   │   ├── layout.tsx
│   │   ├── queue/page.tsx        # Review queue
│   │   └── prescriptions/[id]/page.tsx
│   │
│   ├── dispenser/                # Role-gated: DISPENSER only
│   │   ├── layout.tsx
│   │   ├── queue/page.tsx        # Dispensing queue
│   │   └── prescriptions/[id]/page.tsx
│   │
│   └── admin/                    # Role-gated: ADMIN only
│       ├── layout.tsx
│       ├── page.tsx              # Admin overview
│       ├── users/page.tsx
│       ├── audit/page.tsx        # Audit log viewer
│       ├── products/
│       │   ├── page.tsx
│       │   └── [id]/edit/page.tsx
│       └── questionnaires/
│           ├── page.tsx
│           └── [id]/edit/page.tsx
│
├── components/
│   ├── layout/
│   │   ├── Header.tsx            # ✅ Sticky nav with grid lines + side menu trigger
│   │   ├── SideMenu.tsx          # ✅ Animated slide-in panel, data-driven categories
│   │   ├── Footer.tsx            # GPhC badge, links
│   │   └── DashboardShell.tsx    # Unified command centre for all role dashboards
│   │
│   ├── product/
│   │   ├── ProductCard.tsx       # ✅ Rx vs OTC visual distinction
│   │   ├── ProductGrid.tsx       # Responsive grid with loading states
│   │   └── ProductFilter.tsx     # Category/type filter bar
│   │
│   ├── consultation/
│   │   ├── ConsultationFlow.tsx  # ✅ Multi-step form engine
│   │   ├── QuestionRenderer.tsx  # Individual question type components
│   │   └── EligibilityResult.tsx # PASS/FLAG/FAIL outcome screen
│   │
│   ├── prescription/
│   │   ├── PrescriptionCard.tsx  # Customer-facing prescription summary
│   │   ├── PrescriberReview.tsx  # Clinical detail view for prescribers
│   │   ├── DispenserCard.tsx     # Dispensing queue card
│   │   └── DocumentUpload.tsx    # Drag-and-drop document upload
│   │
│   ├── dashboard/
│   │   ├── StatsRow.tsx          # 4-column metric cards
│   │   ├── PrescriptionTable.tsx # Sortable/filterable data table
│   │   └── AuditLogTable.tsx     # Audit event table with action badges
│   │
│   └── ui/                       # Primitive components
│       ├── StatusBadge.tsx       # ✅ Muted pharmaceutical status badges
│       ├── Button.tsx            # Variants: primary, ghost, outline, danger
│       ├── Input.tsx             # Medical-grade form inputs
│       ├── Modal.tsx             # Accessible modal with focus trap
│       ├── Toast.tsx             # Notification toasts
│       └── Skeleton.tsx          # Loading skeletons matching card shapes
│
└── lib/
    ├── api.ts                    # ✅ Typed service layer — all HTTP calls
    ├── utils.ts                  # ✅ cn(), formatPrice(), timeAgo(), getInitials()
    └── auth.ts                   # Token management, session helpers
```

---

## Design Tokens (tailwind.config.js)

| Token              | Value           | Usage                          |
|--------------------|-----------------|--------------------------------|
| `brand-lavender`   | `#C4B5D5`       | Logo, primary accent           |
| `charcoal`         | `#1A1A1B`       | Body text, primary buttons     |
| `cream`            | `#F9F8F6`       | Page background                |
| `sage`             | `#8EA898`       | OTC badges, positive states    |
| `--grid-line`      | `rgba(26,26,27,0.08)` | All structural borders    |

---

## Role-Based Access Pattern

```tsx
// app/prescriber/layout.tsx
import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth'

export default async function PrescriberLayout({ children }) {
  const session = await getServerSession()
  if (!session || session.user.role !== 'PRESCRIBER') {
    redirect('/account')
  }
  return <DashboardShell role="PRESCRIBER">{children}</DashboardShell>
}
```

---

## Key Design Decisions

### Typography hierarchy
- H1–H4: `font-serif` (Playfair Display) — editorial authority
- Body, UI, labels: `font-sans` (DM Sans) — clean readability
- Ref codes, prices: `font-mono` (DM Mono) — clinical precision

### The Grid Line System
All structural borders use `var(--grid-line)` = `rgba(26,26,27,0.08)`.
This creates a subtle architectural framework (Voy-inspired) without heaviness.
On hover, borders upgrade to `var(--grid-hover)` = `rgba(196,181,213,0.4)` — the lavender bleeds in.

### Rx vs OTC Product Cards
This is a regulatory requirement, not just design:
- **Rx**: Charcoal CTA ("Start Consultation") + lavender prescription badge + stethoscope icon
- **OTC**: Sage green CTA ("Add to Cart") + sage OTC badge + shopping cart icon

### Status Badges
All status colours are deliberately muted to avoid alarming patients:
- APPROVED: soft sage green — reassuring
- PENDING/SUBMITTED: warm amber — neutral, not urgent
- REJECTED: muted rose — matter-of-fact, not alarming
- DISPENSING: slate blue — in progress
Never use saturated red/green — these suggest medical emergency, not workflow state.
