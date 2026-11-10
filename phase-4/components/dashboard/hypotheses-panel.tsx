'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import type { AppStateApi } from '@/lib/hooks/use-app-state'
import type { HypothesisStatus, ScoredHypothesis } from '@/lib/types'

export function HypothesesPanel({ state }: { state: AppStateApi }) {
  const hypotheses = state.data?.hypotheses ?? []
  const [statement, setStatement] = useState('')
  const [saving, setSaving] = useState(false)

  async function create() {
    if (statement.trim().length < 8) {
      toast.error('Statement must be at least 8 characters')
      return
    }
    setSaving(true)
    try {
      await state.apiMutate('/api/hypotheses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statement: statement.trim() }),
      })
      setStatement('')
      toast.success('Hypothesis created')
    } catch {
      // toasted
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--muted)]">
            Hypotheses
          </h2>
          <p className="mt-1 text-[13px] text-[var(--muted)]">
            Score support from linked signals. Claude can attach links via MCP.
          </p>
        </div>
        <div className="flex min-w-[280px] flex-1 gap-2">
          <input
            value={statement}
            onChange={(e) => setStatement(e.target.value)}
            placeholder="New hypothesis statement…"
            className="h-9 flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 text-[13px] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
          />
          <button
            type="button"
            disabled={saving}
            onClick={() => void create()}
            className="h-9 rounded-lg bg-[var(--accent)] px-3 text-[13px] font-medium text-white disabled:opacity-60"
          >
            Add
          </button>
        </div>
      </div>

      {hypotheses.length === 0 ? (
        <p className="text-[13px] text-[var(--muted)]">No hypotheses yet.</p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {hypotheses.map((h) => (
            <HypothesisCard key={h.id} hypothesis={h} state={state} />
          ))}
        </div>
      )}
    </section>
  )
}

function HypothesisCard({
  hypothesis,
  state,
}: {
  hypothesis: ScoredHypothesis
  state: AppStateApi
}) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(hypothesis.statement)
  const supportShare =
    hypothesis.supportWeight + hypothesis.contradictWeight === 0
      ? 50
      : (hypothesis.supportWeight /
          (hypothesis.supportWeight + hypothesis.contradictWeight)) *
        100

  async function saveStatement() {
    await state.apiMutate(`/api/hypotheses/${hypothesis.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statement: text.trim() }),
    })
    setEditing(false)
    toast.success('Hypothesis updated')
  }

  async function setStatus(status: HypothesisStatus) {
    await state.apiMutate(`/api/hypotheses/${hypothesis.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
  }

  return (
    <article className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
      {editing ? (
        <div className="mb-3 flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="h-9 flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px]"
          />
          <button
            type="button"
            onClick={() => void saveStatement()}
            className="rounded-lg bg-[var(--accent)] px-3 text-[12px] text-white"
          >
            Save
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setText(hypothesis.statement)
            setEditing(true)
          }}
          className="mb-3 text-left text-[14px] font-medium leading-snug text-[var(--text)] hover:opacity-90"
        >
          {hypothesis.statement}
        </button>
      )}

      <div className="mb-2 flex items-center justify-between gap-2 text-[12px]">
        <span className="rounded-full border border-[var(--border)] px-2 py-0.5 capitalize text-[var(--muted)]">
          {hypothesis.status}
        </span>
        <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[var(--text)]">
          {hypothesis.supportPct}% support · {hypothesis.verdict}
        </span>
      </div>

      <div className="mb-3 flex h-2 overflow-hidden rounded-full bg-[var(--surface)]">
        <div className="bg-emerald-500" style={{ width: `${supportShare}%` }} />
        <div className="bg-rose-500" style={{ width: `${100 - supportShare}%` }} />
      </div>

      <div className="flex flex-wrap gap-1">
        {(['open', 'validated', 'invalidated'] as HypothesisStatus[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => void setStatus(s)}
            className={`rounded-md px-2 py-1 text-[11px] capitalize ${
              hypothesis.status === s
                ? 'bg-[var(--accent)]/20 text-[var(--text)]'
                : 'text-[var(--muted)] hover:bg-[var(--surface)]'
            }`}
          >
            {s}
          </button>
        ))}
        <span className="ml-auto text-[11px] text-[var(--muted)]">
          {hypothesis.linkCount} link{hypothesis.linkCount === 1 ? '' : 's'}
        </span>
      </div>
    </article>
  )
}
