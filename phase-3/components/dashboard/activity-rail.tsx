'use client'

import { Pencil, Sparkles } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import type { Activity } from '@/lib/types'
import { StatusPill } from '@/components/atoms'
import { relativeTime } from '@/lib/utils'
import { usePrefersReducedMotion } from '@/lib/hooks/use-prefers-reduced-motion'

export function ActivityRail({ items }: { items: Activity[] }) {
  const reduced = usePrefersReducedMotion()
  const list = items.slice(0, 12)

  return (
    <aside className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <h2 className="mb-3 text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--muted)]">
        Activity
      </h2>
      {list.length === 0 ? (
        <p className="text-[13px] text-[var(--muted)]">No activity yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          <AnimatePresence initial={false}>
            {list.map((item) => (
              <motion.li
                key={item.id}
                initial={reduced ? false : { opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="flex gap-2"
              >
                <span className="mt-0.5 text-[var(--muted)]">
                  {item.via === 'claude' ? <Sparkles size={14} /> : <Pencil size={14} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] leading-snug text-[var(--text)]">{item.text}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {item.statusChange && (
                      <>
                        <StatusPill status={item.statusChange.from} />
                        <span className="text-[11px] text-[var(--muted)]">→</span>
                        <StatusPill status={item.statusChange.to} />
                      </>
                    )}
                    <span className="text-[11px] text-[var(--muted)]">{relativeTime(item.at)}</span>
                  </div>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </aside>
  )
}
