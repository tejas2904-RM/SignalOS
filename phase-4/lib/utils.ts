import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Polarity, Status } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Exact Design system board tokens */
export const STATUS_COLOR: Record<Status, string> = {
  strong: '#0E0E0E',
  emerging: '#2FD27A',
  weak: '#9A9A99',
  fading: '#CFCFCF',
}

export const STATUS_PILL_BG: Record<Status, string> = {
  strong: '#0E0E0E',
  emerging: 'rgba(47, 210, 122, 0.14)',
  weak: '#F1F1F0',
  fading: '#F6F6F6',
}

export const STATUS_PILL_FG: Record<Status, string> = {
  strong: '#FFFFFF',
  emerging: '#0E7A41',
  weak: '#666666',
  fading: '#9A9A99',
}

export const POLARITY_COLOR: Record<Polarity, string> = {
  Risk: '#D2410E',
  Opportunity: '#13463E',
  Neutral: '#444444',
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
