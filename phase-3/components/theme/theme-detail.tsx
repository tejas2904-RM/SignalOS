'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { Check, Circle, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAppState } from '@/lib/hooks/use-app-state'
import { SOURCE_META } from '@/lib/source-meta'
import { POLARITY_COLOR, titleCaseStatus } from '@/lib/utils'
import {
  PolarityPill,
  StatusPill,
  ViaClaudeBadge,
} from '@/components/atoms'
import { SignalSheet } from '@/components/sheets/signal-sheet'
import { ConnectClaudeSheet } from '@/components/sheets/connect-claude-sheet'
import { Dialog } from '@/components/ui/dialog'
import type { Signal } from '@/lib/types'

export function ThemeDetail({ id }: { id: string }) {
  const router = useRouter()
  const state = useAppState()
  const theme = state.data?.themes.find((t) => t.id === id)
  const signals = useMemo(
    () =>
      (state.data?.signals ?? [])
        .filter((s) => s.themeId === id)
        .sort((a, b) => new Date(b.observedAt).getTime() - new Date(a.observedAt).getTime()),
    [state.data?.signals, id],
  )

  const [editingName, setEditingName] = useState(false)
  const [name, setName] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [mergeOpen, setMergeOpen] = useState(false)
  const [targetId, setTargetId] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)

  if (state.isLoading && !state.data) {
    return (
      <div className="mx-auto max-w-[960px] space-y-4 px-8 py-8">
        <div className="h-6 w-40 animate-pulse rounded bg-[var(--surface-2)]" />
        <div className="h-40 animate-pulse rounded-xl bg-[var(--surface-2)]" />
      </div>
    )
  }

  if (state.data && !theme) {
    return (
      <div className="mx-auto max-w-[960px] px-8 py-16 text-center">
        <h1 className="mb-2 text-[20px] font-semibold">Theme not found</h1>
        <p className="mb-4 text-[14px] text-[var(--muted)]">
          This theme may have been merged or deleted.
        </p>
        <Link href="/" className="text-[var(--accent)] hover:underline">
          Back to board
        </Link>
      </div>
    )
  }

  if (!theme) return null

  async function saveName() {
    const next = name.trim()
    if (next.length < 2) return
    await state.apiMutate(`/api/themes/${theme!.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: next }),
    })
    setEditingName(false)
    toast.success('Theme renamed')
  }

  return (
    <div className="mx-auto min-h-screen max-w-[960px] px-8 py-8">
      <div className="mb-4 text-[13px] text-[var(--muted)]">
        <Link href="/" className="hover:text-[var(--text)]">
          Themes
        </Link>
        <span className="mx-2">/</span>
        <span className="text-[var(--text)]">{theme.name}</span>
      </div>

      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {editingName ? (
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void saveName()
                if (e.key === 'Escape') setEditingName(false)
              }}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-[20px] font-semibold outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setName(theme.name)
                setEditingName(true)
              }}
              className="text-left text-[20px] font-semibold hover:opacity-90"
            >
              {theme.name}
            </button>
          )}
          {theme.description && (
            <p className="mt-2 text-[14px] text-[var(--muted)]">{theme.description}</p>
          )}
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded-lg border border-[var(--border)] p-2 text-[var(--muted)] hover:text-[var(--text)]"
            aria-label="Theme actions"
          >
            <MoreHorizontal size={16} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1 shadow-xl">
              <button
                type="button"
                className="block w-full rounded-lg px-3 py-2 text-left text-[13px] hover:bg-[var(--surface-2)]"
                onClick={() => {
                  setMenuOpen(false)
                  setName(theme.name)
                  setEditingName(true)
                }}
              >
                Rename
              </button>
              <button
                type="button"
                className="block w-full rounded-lg px-3 py-2 text-left text-[13px] hover:bg-[var(--surface-2)]"
                onClick={() => {
                  setMenuOpen(false)
                  setMergeOpen(true)
                }}
              >
                Merge into another theme…
              </button>
              <button
                type="button"
                disabled={signals.length > 0}
                className="block w-full rounded-lg px-3 py-2 text-left text-[13px] text-rose-400 hover:bg-[var(--surface-2)] disabled:opacity-40"
                onClick={() => {
                  setMenuOpen(false)
                  setDeleteOpen(true)
                }}
              >
                Delete theme
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <StatusPill status={theme.status} large />
        <PolarityPill polarity={theme.polarity} />
        <Chip label={`${theme.count} signals`} />
        <Chip label={`${theme.sources} sources`} />
        <Chip label={`strength ${theme.strength}`} mono />
        <Chip label={`velocity ${theme.velocity >= 0 ? '+' : ''}${theme.velocity}`} mono />
      </div>

      <section className="mb-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <h2 className="mb-3 text-[14px] font-medium">Why {titleCaseStatus(theme.status)}?</h2>
        <ul className="mb-3 space-y-2">
          {theme.reasons.map((r) => (
            <li key={r.label} className="flex items-center gap-2 text-[13px]">
              {r.met ? (
                <Check size={14} className="text-emerald-400" />
              ) : (
                <Circle size={14} className="text-[var(--muted)]" />
              )}
              <span className={r.met ? 'text-[var(--text)]' : 'text-[var(--muted)]'}>
                {r.label}
              </span>
              <span className="ml-auto font-[family-name:var(--font-geist-mono)] text-[12px] text-[var(--muted)]">
                {r.value}
              </span>
            </li>
          ))}
        </ul>
        <p className="text-[13px] text-[var(--muted)]">{theme.nextStatusHint}</p>
      </section>

      <section className="mb-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <h2 className="mb-3 text-[11px] uppercase tracking-[0.06em] text-[var(--muted)]">
          Last 8 weeks
        </h2>
        <div className="flex h-24 items-end gap-2">
          {theme.weeklyCounts.map((v, i) => {
            const max = Math.max(1, ...theme.weeklyCounts)
            const h = Math.max(4, (v / max) * 100)
            return (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-sm bg-[var(--accent)]/70"
                  style={{ height: `${h}%` }}
                  title={`${v}`}
                />
                <span className="font-[family-name:var(--font-geist-mono)] text-[10px] text-[var(--muted)]">
                  {v}
                </span>
              </div>
            )
          })}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[11px] uppercase tracking-[0.06em] text-[var(--muted)]">Signals</h2>
          <button
            type="button"
            onClick={() => state.openNewSignal(theme.id)}
            className="text-[13px] text-[var(--accent)] hover:underline"
          >
            + Add signal
          </button>
        </div>
        <div className="space-y-3">
          {signals.map((signal) => (
            <SignalRow
              key={signal.id}
              signal={signal}
              onEdit={() => state.openEditSignal(signal)}
              onDelete={async () => {
                await state.apiMutate(`/api/signals/${signal.id}`, { method: 'DELETE' })
                toast.success('Signal deleted')
              }}
            />
          ))}
          {signals.length === 0 && (
            <p className="rounded-xl border border-dashed border-[var(--border)] px-4 py-8 text-center text-[13px] text-[var(--muted)]">
              No signals on this theme yet.
            </p>
          )}
        </div>
      </section>

      <Dialog open={mergeOpen} onClose={() => setMergeOpen(false)} title="Merge into another theme">
        <p className="mb-3 text-[13px] text-[var(--muted)]">
          All signals move to the target theme. This theme is then deleted.
        </p>
        <select
          value={targetId}
          onChange={(e) => setTargetId(e.target.value)}
          className="mb-4 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-[14px]"
        >
          <option value="">Select theme…</option>
          {(state.data?.themes ?? [])
            .filter((t) => t.id !== theme.id)
            .map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
        </select>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setMergeOpen(false)}
            className="rounded-lg border border-[var(--border)] px-3 py-2 text-[13px]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!targetId}
            onClick={async () => {
              await state.apiMutate('/api/themes/merge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sourceId: theme.id, targetId }),
              })
              setMergeOpen(false)
              toast.success('Themes merged')
              router.push(`/themes/${targetId}`)
            }}
            className="rounded-lg bg-[var(--accent)] px-3 py-2 text-[13px] text-white disabled:opacity-50"
          >
            Merge
          </button>
        </div>
      </Dialog>

      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete theme?">
        <p className="mb-4 text-[13px] text-[var(--muted)]">This cannot be undone.</p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setDeleteOpen(false)}
            className="rounded-lg border border-[var(--border)] px-3 py-2 text-[13px]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={async () => {
              await state.apiMutate(`/api/themes/${theme.id}`, { method: 'DELETE' })
              toast.success('Theme deleted')
              router.push('/')
            }}
            className="rounded-lg bg-rose-500 px-3 py-2 text-[13px] text-white"
          >
            Delete
          </button>
        </div>
      </Dialog>

      <SignalSheet state={state} />
      <ConnectClaudeSheet state={state} />
    </div>
  )
}

function Chip({ label, mono }: { label: string; mono?: boolean }) {
  return (
    <span
      className={`rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[12px] text-[var(--muted)] ${
        mono ? 'font-[family-name:var(--font-geist-mono)] tabular-nums' : ''
      }`}
    >
      {label}
    </span>
  )
}

function SignalRow({
  signal,
  onEdit,
  onDelete,
}: {
  signal: Signal
  onEdit: () => void
  onDelete: () => Promise<void>
}) {
  const meta = SOURCE_META[signal.sourceType]
  const border =
    signal.sentiment === 'risk'
      ? POLARITY_COLOR.Risk
      : signal.sentiment === 'opportunity'
        ? POLARITY_COLOR.Opportunity
        : POLARITY_COLOR.Neutral

  return (
    <article className="group rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <p
        className="mb-2 border-l-2 pl-3 text-[15px] leading-relaxed text-[var(--text)]"
        style={{ borderColor: border }}
      >
        {signal.quote}
      </p>
      <p className="mb-3 text-[13px] text-[var(--muted)]">{signal.summary}</p>
      <div className="flex flex-wrap items-center gap-2 text-[12px] text-[var(--muted)]">
        <span>{meta.label}</span>
        {signal.sourceDetail && <span>· {signal.sourceDetail}</span>}
        {signal.segment && <span>· {signal.segment}</span>}
        <span>· {new Date(signal.observedAt).toLocaleDateString()}</span>
        {signal.via === 'claude' && <ViaClaudeBadge />}
        <span className="ml-auto hidden gap-1 group-hover:inline-flex">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-md p-1.5 hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
            aria-label="Edit"
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            onClick={() => void onDelete()}
            className="rounded-md p-1.5 hover:bg-[var(--surface-2)] hover:text-rose-400"
            aria-label="Delete"
          >
            <Trash2 size={14} />
          </button>
        </span>
      </div>
    </article>
  )
}
