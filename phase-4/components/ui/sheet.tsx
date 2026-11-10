'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Sheet({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  wide?: boolean
}) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close overlay"
        className="absolute inset-0 bg-[var(--ink)]/25"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative z-10 flex h-full w-full flex-col border-l border-[var(--rule)] bg-[var(--paper)] shadow-2xl',
          'animate-in slide-in-from-right duration-200',
          wide ? 'max-w-xl' : 'max-w-md',
        )}
        style={{ animation: 'sheetIn 200ms ease-out' }}
      >
        <div className="flex items-center justify-between border-b border-[var(--rule)] px-5 py-4">
          <h2 className="font-display text-[22px] text-[var(--ink)]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[var(--secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--signal)]"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </aside>
      <style jsx global>{`
        @keyframes sheetIn {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  )
}
