import { cn } from '@/lib/utils'
import type { PrescriptionStatus, EligibilityStatus } from '@/lib/api'

// ── Status configs ─────────────────────────────────────────────────────────

const PRESCRIPTION_CONFIGS: Record<PrescriptionStatus, {
  label:   string
  classes: string
  pulse?:  boolean
}> = {
  DRAFT:        { label: 'Draft',        classes: 'bg-cream-warm text-charcoal-muted border-[var(--grid-line)]'              },
  SUBMITTED:    { label: 'Submitted',    classes: 'bg-[#FBF7EE] text-[#8A6E2F] border-[#DDD0A4]',          pulse: true  },
  UNDER_REVIEW: { label: 'Under Review', classes: 'bg-[#EEF1F6] text-[#3A5278] border-[#A8BAD4]',          pulse: true  },
  APPROVED:     { label: 'Approved',     classes: 'bg-[#F0F6F1] text-[#4A7A52] border-[#B8D4BD]'                           },
  REJECTED:     { label: 'Rejected',     classes: 'bg-[#FBF0F0] text-[#8A4040] border-[#DDABAB]'                           },
  DISPENSING:   { label: 'Dispensing',   classes: 'bg-[#EEF1F6] text-[#3A5278] border-[#A8BAD4]',          pulse: true  },
  FULFILLED:    { label: 'Fulfilled',    classes: 'bg-[#EDF5EF] text-[#2D6B38] border-[#9ECFA8]'                           },
  CANCELLED:    { label: 'Cancelled',    classes: 'bg-cream-warm text-charcoal-muted border-[var(--grid-line)]'              },
  EXPIRED:      { label: 'Expired',      classes: 'bg-cream-warm text-charcoal-muted border-[var(--grid-line)]'              },
}

const ELIGIBILITY_CONFIGS: Record<EligibilityStatus, {
  label: string; classes: string
}> = {
  PASS: { label: 'Pass', classes: 'bg-[#F0F6F1] text-[#4A7A52] border-[#B8D4BD]' },
  FLAG: { label: 'Flag', classes: 'bg-[#FBF7EE] text-[#8A6E2F] border-[#DDD0A4]' },
  FAIL: { label: 'Fail', classes: 'bg-[#FBF0F0] text-[#8A4040] border-[#DDABAB]' },
}

// ── Components ─────────────────────────────────────────────────────────────

interface PrescriptionStatusBadgeProps {
  status: PrescriptionStatus
  className?: string
}

export function PrescriptionStatusBadge({ status, className }: PrescriptionStatusBadgeProps) {
  const config = PRESCRIPTION_CONFIGS[status]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1',
        'text-[11px] font-medium rounded-full border',
        'tracking-[0.02em]',
        config.classes,
        className,
      )}
      role="status"
      aria-label={`Status: ${config.label}`}
    >
      {config.pulse && (
        <span
          className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"
          aria-hidden="true"
        />
      )}
      {config.label}
    </span>
  )
}

interface EligibilityBadgeProps {
  status: EligibilityStatus
  showLabel?: boolean
  className?: string
}

export function EligibilityBadge({ status, showLabel = true, className }: EligibilityBadgeProps) {
  const config = ELIGIBILITY_CONFIGS[status]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1',
        'text-[11px] font-medium rounded-full border',
        config.classes,
        className,
      )}
      role="status"
    >
      {showLabel && config.label}
    </span>
  )
}

/* Generic badge for audit log action types */
export function ActionBadge({
  action,
  className,
}: {
  action: string
  className?: string
}) {
  const domain = action.split('_')[0]

  const domainClass: Record<string, string> = {
    PRESCRIPTION: 'bg-brand-lavenderSoft text-brand-lavenderDark border-brand-lavender/30',
    PAYMENT:      'bg-sage-soft text-sage-deep border-sage/30',
    USER:         'bg-[#FBF7EE] text-[#8A6E2F] border-[#DDD0A4]',
    DOCUMENT:     'bg-slate-soft text-slate-pharmacy border-slate-light',
    PRODUCT:      'bg-cream-deep text-charcoal-muted border-[var(--grid-line)]',
    QUESTIONNAIRE:'bg-cream-deep text-charcoal-muted border-[var(--grid-line)]',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5',
        'text-[10px] font-medium tracking-[0.04em] uppercase rounded',
        'border whitespace-nowrap',
        domainClass[domain] ?? 'bg-cream-warm text-charcoal-muted border-[var(--grid-line)]',
        className,
      )}
    >
      {action.replace(/_/g, ' ')}
    </span>
  )
}
