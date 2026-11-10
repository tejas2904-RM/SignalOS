'use client'

import { Sparkles } from 'lucide-react'
import { motion, useSpring, useTransform } from 'motion/react'
import { useEffect, useState } from 'react'
import type { Polarity, SourceType, Status } from '@/lib/types'
import { SOURCE_META } from '@/lib/source-meta'
import {
  POLARITY_COLOR,
  STATUS_COLOR,
  STATUS_PILL_BG,
  STATUS_PILL_FG,
  cn,
  titleCaseStatus,
} from '@/lib/utils'
import { Tooltip } from '@/components/ui/tooltip'
import { usePrefersReducedMotion } from '@/lib/hooks/use-prefers-reduced-motion'

export function StatusPill({
  status,
  large,
}: {
  status: Status
  large?: boolean
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        large ? 'px-3 py-1 text-[13px]' : 'px-2 py-0.5 text-[11px]',
      )}
      style={{ background: STATUS_PILL_BG[status], color: STATUS_PILL_FG[status] }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{
          background: status === 'strong' ? '#FFFFFF' : STATUS_COLOR[status],
          border: status === 'fading' ? '1px dashed #9A9A99' : undefined,
        }}
      />
      {titleCaseStatus(status)}
    </span>
  )
}

export function PolarityPill({ polarity }: { polarity: Polarity }) {
  const color = POLARITY_COLOR[polarity]
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{ background: `${color}14`, color }}
    >
      {polarity}
    </span>
  )
}

export function ViaClaudeBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[var(--rule)] bg-[var(--surface-2)] px-2 py-0.5 text-[11px] text-[var(--secondary)]">
      <Sparkles size={11} />
      via Claude
    </span>
  )
}

export function SourceDots({ types }: { types: SourceType[] }) {
  const unique = [...new Set(types)]
  return (
    <div className="flex items-center gap-1">
      {unique.map((type) => {
        const meta = SOURCE_META[type]
        return (
          <Tooltip key={type} label={meta.label}>
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: meta.color }}
              aria-label={meta.label}
            />
          </Tooltip>
        )
      })}
    </div>
  )
}

export function LiveIndicator({
  lastSyncedAt,
}: {
  lastSyncedAt: number | null
}) {
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 1000)
    return () => window.clearInterval(id)
  }, [])

  const seconds = lastSyncedAt
    ? Math.max(0, Math.floor((Date.now() - lastSyncedAt) / 1000))
    : null

  return (
    <div className="inline-flex items-center gap-2 text-[12px] text-[var(--secondary)]">
      <span className="relative flex h-2 w-2">
        <span
          className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
          style={{ background: 'var(--signal)' }}
        />
        <span
          className="relative inline-flex h-2 w-2 rounded-full"
          style={{ background: 'var(--signal)' }}
        />
      </span>
      <span>
        Live ·{' '}
        {seconds == null
          ? 'syncing…'
          : seconds <= 1
            ? 'synced just now'
            : `synced ${seconds}s ago`}
      </span>
    </div>
  )
}

export function AnimatedNumber({ value }: { value: number }) {
  const reduced = usePrefersReducedMotion()
  const spring = useSpring(value, { stiffness: 180, damping: 24 })
  const display = useTransform(spring, (v) =>
    Number.isInteger(value) ? Math.round(v).toString() : v.toFixed(1),
  )
  useEffect(() => {
    spring.set(value)
  }, [spring, value])

  if (reduced) {
    return (
      <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[var(--ink)]">
        {Number.isInteger(value) ? value : value.toFixed(1)}
      </span>
    )
  }
  return (
    <motion.span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[var(--ink)]">
      {display}
    </motion.span>
  )
}

export function VelocityChip({ velocity }: { velocity: number }) {
  if (velocity > 0) {
    return (
      <span className="text-[12px] font-medium" style={{ color: 'var(--signal-text)' }}>
        ↑ {velocity}
      </span>
    )
  }
  if (velocity < 0) {
    return (
      <span className="text-[12px] font-medium" style={{ color: 'var(--polarity-risk)' }}>
        ↓ {Math.abs(velocity)}
      </span>
    )
  }
  return <span className="text-[12px] text-[var(--secondary)]">→</span>
}

export function Sparkline({
  values,
  color,
}: {
  values: number[]
  color: string
}) {
  const w = 80
  const h = 24
  const max = Math.max(1, ...values)
  const pts = values
    .map((v, i) => {
      const x = values.length <= 1 ? 0 : (i / (values.length - 1)) * (w - 2) + 1
      const y = h - 2 - (v / max) * (h - 4)
      return `${x},${y}`
    })
    .join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
      <polyline
        fill="none"
        stroke={color === '#0E0E0E' || color === '#CFCFCF' ? 'var(--signal)' : color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={pts}
      />
    </svg>
  )
}

export function Wordmark() {
  return (
    <div className="flex items-center gap-2">
      <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden>
        <rect width="22" height="22" rx="5" fill="var(--ink)" />
        <path
          d="M4 12 C6 8, 8 16, 10 11 C12 6, 14 14, 18 10"
          fill="none"
          stroke="white"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
      <span className="text-[18px] font-semibold tracking-tight text-[var(--ink)]">SignalOS</span>
    </div>
  )
}
