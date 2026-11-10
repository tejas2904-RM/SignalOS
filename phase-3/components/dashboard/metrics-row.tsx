'use client'

import type { ComputedMetrics } from '@/lib/types'
import { AnimatedNumber } from '@/components/atoms'

const ITEMS: Array<{ key: keyof ComputedMetrics; label: string; suffix?: string }> = [
  { key: 'signalsThisWeek', label: 'Signals this week' },
  { key: 'emergingThemes', label: 'Emerging themes' },
  { key: 'avgSourcesPerEmerging', label: 'Avg sources / emerging' },
  { key: 'pctViaClaude', label: 'Via Claude', suffix: '%' },
]

export function MetricsRow({ metrics }: { metrics: ComputedMetrics }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {ITEMS.map((item) => (
        <div
          key={item.key}
          className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
        >
          <div className="mb-2 text-[11px] uppercase tracking-[0.06em] text-[var(--muted)]">
            {item.label}
          </div>
          <div className="text-[22px] font-medium text-[var(--text)]">
            <AnimatedNumber value={metrics[item.key]} />
            {item.suffix ?? ''}
          </div>
        </div>
      ))}
    </div>
  )
}
