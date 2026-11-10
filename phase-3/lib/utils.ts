import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Polarity, Status } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const STATUS_COLOR: Record<Status, string> = {
  strong: '#10B981',
  emerging: '#F59E0B',
  weak: '#71717A',
  fading: '#64748B',
}

export const POLARITY_COLOR: Record<Polarity, string> = {
  Risk: '#F43F5E',
  Opportunity: '#10B981',
  Neutral: '#8A8F98',
}

export function titleCaseStatus(status: Status): string {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

export function relativeTime(iso: string, now = Date.now()): string {
  const diff = Math.max(0, now - new Date(iso).getTime())
  const s = Math.floor(diff / 1000)
  if (s < 5) return 'just now'
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 48) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

export function formatSyncedAgo(lastSyncedAt: number | null, now = Date.now()): string {
  if (!lastSyncedAt) return 'syncing…'
  const s = Math.max(0, Math.floor((now - lastSyncedAt) / 1000))
  if (s < 1) return 'synced just now'
  return `synced ${s}s ago`
}
