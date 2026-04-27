import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Merge class names with Tailwind conflict resolution */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format pence to GBP string: 1999 → "£19.99" */
export function formatPrice(pence: number, period?: string): string {
  const formatted = `£${(pence / 100).toFixed(2)}`
  return period ? `${formatted}/${period}` : formatted
}

/** Truncate string with ellipsis */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength - 1) + '…'
}

/** Relative time formatting */
export function timeAgo(date: string | Date): string {
  const d    = new Date(date)
  const now  = new Date()
  const diff = now.getTime() - d.getTime()
  const secs = Math.floor(diff / 1000)
  if (secs < 60)   return 'just now'
  const mins = Math.floor(secs / 60)
  if (mins < 60)   return `${mins}m ago`
  const hrs  = Math.floor(mins / 60)
  if (hrs  < 24)   return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7)    return `${days}d ago`
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

/** Get initials from a name */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('')
}
