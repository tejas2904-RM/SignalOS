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
        'rounded-xl border border-[var(--rule)] bg-[var(--paper)] p-4 shadow-[0_1px_0_rgba(14,14,14,0.04)] transition-colors',
        'hover:-translate-y-px hover:border-[#CFCFCF]',
        glow && 'glow-arrival',
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="line-clamp-2 text-[14px] font-medium leading-snug text-[var(--ink)]">
          {theme.name}
        </h3>
        <PolarityPill polarity={theme.polarity} />
      </div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <SourceDots types={types} />
        <StatusPill status={theme.status} />
      </div>
      <div className="mb-2 flex items-center justify-between gap-2 text-[12px] text-[var(--secondary)]">
        <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
          {theme.count} signals · strength {theme.strength}
        </span>
        <VelocityChip velocity={theme.velocity} />
      </div>
      <div className="mb-2">
        <Sparkline
          values={theme.weeklyCounts}
          color={theme.status === 'emerging' ? STATUS_COLOR.emerging : 'var(--signal)'}
        />
      </div>
      {theme.topQuote && (
        <p className="mb-2 line-clamp-1 text-[12px] text-[var(--secondary)]">{theme.topQuote}</p>
      )}
      {theme.latestVia === 'claude' && <ViaClaudeBadge />}
    </motion.div>
  )

  return (
    <Link
      href={`/themes/${theme.id}`}
      className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--signal)]"
    >
      {body}
    </Link>
  )
}
