'use client'

import { useEffect, useRef, useState } from 'react'

export function Popover({
  trigger,
  children,
}: {
  trigger: React.ReactNode
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  return (
    <div className="relative inline-flex" ref={ref}>
      <button type="button" onClick={() => setOpen((v) => !v)} className="contents">
        {trigger}
      </button>
      {open && (
        <div className="absolute left-0 top-[calc(100%+8px)] z-40 w-72 rounded-xl border border-[var(--rule)] bg-[var(--paper)] p-4 shadow-xl">
          {children}
        </div>
      )}
    </div>
  )
}
