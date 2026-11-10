'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

export function Tooltip({
  label,
  children,
  side = 'top',
}: {
  label: string
  children: React.ReactNode
  side?: 'top' | 'bottom'
}) {
  const [open, setOpen] = useState(false)
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open && (
        <span
          role="tooltip"
          className={cn(
            'pointer-events-none absolute left-1/2 z-40 -translate-x-1/2 whitespace-nowrap rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1 text-[11px] text-[var(--text)]',
            side === 'top' ? 'bottom-[calc(100%+6px)]' : 'top-[calc(100%+6px)]',
          )}
        >
          {label}
        </span>
      )}
    </span>
  )
}
