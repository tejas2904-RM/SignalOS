'use client'

import Link from 'next/link'
import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import type { ScoredTheme, Signal, SourceType } from '@/lib/types'
import {
  PolarityPill,
  SourceDots,
  Sparkline,
  StatusPill,
  VelocityChip,
  ViaClaudeBadge,
} from '@/components/atoms'
import { STATUS_COLOR, cn } from '@/lib/utils'
import { usePrefersReducedMotion } from '@/lib/hooks/use-prefers-reduced-motion'

export function ThemeCard({
  theme,
  signals,
  glowToken,
}: {
  theme: ScoredTheme
  signals: Signal[]
  glowToken?: string
}) {
  const reduced = usePrefersReducedMotion()
  const [glow, setGlow] = useState(false)
  const themeSignals = signals.filter((s) => s.themeId === theme.id)
  const types = themeSignals.map((s) => s.sourceType) as SourceType[]

  useEffect(() => {
    if (!glowToken || reduced) return
    setGlow(true)
    const t = window.setTimeout(() => setGlow(false), 2500)
    return () => window.clearTimeout(t)
  }, [glowToken, reduced])

  const body = (
    <motion.div
      layoutId={reduced ? undefined : theme.id}
      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
      className={cn(
        'rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 transition-colors',
        'hover:-translate-y-px hover:border-[rgba(255,255,255,0.12)]',
        glow && 'glow-arrival',
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="line-clamp-2 text-[14px] font-medium leading-snug text-[var(--text)]">
          {theme.name}
        </h3>
        <PolarityPill polarity={theme.polarity} />
      </div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <SourceDots types={types} />
        <StatusPill status={theme.status} />
      </div>
      <div className="mb-2 flex items-center justify-between gap-2 text-[12px] text-[var(--muted)]">
        <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
          {theme.count} signals · strength {theme.strength}
        </span>
        <VelocityChip velocity={theme.velocity} />
      </div>
      <div className="mb-2">
        <Sparkline values={theme.weeklyCounts} color={STATUS_COLOR[theme.status]} />
      </div>
      {theme.topQuote && (
        <p className="mb-2 line-clamp-1 text-[12px] text-[var(--muted)]">{theme.topQuote}</p>
      )}
      {theme.latestVia === 'claude' && <ViaClaudeBadge />}
    </motion.div>
  )

  return (
    <Link href={`/themes/${theme.id}`} className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]">
      {body}
    </Link>
  )
}
