'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Sheet } from '@/components/ui/sheet'
import { SOURCE_OPTIONS } from '@/lib/source-meta'
import type { AppStateApi } from '@/lib/hooks/use-app-state'
import { notifyStatusChanges } from '@/lib/hooks/use-app-state'
import type { Sentiment, SourceType, StatusChange } from '@/lib/types'

type FormState = {
  quote: string
  summary: string
  themeMode: 'existing' | 'new'
  themeId: string
  newThemeName: string
  sourceType: SourceType
  sourceDetail: string
  segment: string
  sentiment: Sentiment
  observedAt: string
}

function todayInput(): string {
  return new Date().toISOString().slice(0, 10)
}

export function SignalSheet({ state }: { state: AppStateApi }) {
  const open = state.sheets.signalOpen
  const editing = state.sheets.editingSignal
  const themes = state.data?.themes ?? []

  const initial: FormState = useMemo(() => {
    if (editing) {
      return {
        quote: editing.quote,
        summary: editing.summary,
        themeMode: 'existing',
        themeId: editing.themeId,
        newThemeName: '',
        sourceType: editing.sourceType,
        sourceDetail: editing.sourceDetail ?? '',
        segment: editing.segment ?? '',
        sentiment: editing.sentiment,
        observedAt: editing.observedAt.slice(0, 10),
      }
    }
    return {
      quote: '',
      summary: '',
      themeMode: 'existing',
      themeId: state.sheets.defaultThemeId || themes[0]?.id || '',
      newThemeName: '',
      sourceType: 'customer_call',
      sourceDetail: '',
      segment: '',
      sentiment: 'opportunity',
      observedAt: todayInput(),
    }
  }, [editing, state.sheets.defaultThemeId, themes])

  const [form, setForm] = useState<FormState>(initial)
  const [themeQuery, setThemeQuery] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(initial)
      setThemeQuery('')
    }
  }, [open, initial])

  const filteredThemes = themes.filter((t) =>
    t.name.toLowerCase().includes(themeQuery.trim().toLowerCase()),
  )

  async function save() {
    if (form.quote.trim().length < 3) {
      toast.error('Quote must be at least 3 characters')
      return
    }
    if (!form.summary.trim()) {
      toast.error('Summary is required')
      return
    }
    setSaving(true)
    try {
      if (editing) {
        const body = {
          quote: form.quote.trim(),
          summary: form.summary.trim(),
          themeId: form.themeId,
          sourceType: form.sourceType,
          sourceDetail: form.sourceDetail.trim() || null,
          segment: form.segment.trim() || null,
          sentiment: form.sentiment,
          observedAt: new Date(form.observedAt).toISOString(),
        }
        const res = await state.apiMutate<{ statusChanges?: StatusChange[] }>(
          `/api/signals/${editing.id}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          },
        )
        toast.success('Signal updated')
        notifyStatusChanges(res.statusChanges ?? [])
      } else {
        const body =
          form.themeMode === 'new'
            ? {
                quote: form.quote.trim(),
                summary: form.summary.trim(),
                newThemeName: form.newThemeName.trim() || themeQuery.trim(),
                sourceType: form.sourceType,
                sourceDetail: form.sourceDetail.trim() || undefined,
                segment: form.segment.trim() || undefined,
                sentiment: form.sentiment,
                observedAt: new Date(form.observedAt).toISOString(),
              }
            : {
                quote: form.quote.trim(),
                summary: form.summary.trim(),
                themeId: form.themeId,
                sourceType: form.sourceType,
                sourceDetail: form.sourceDetail.trim() || undefined,
                segment: form.segment.trim() || undefined,
                sentiment: form.sentiment,
                observedAt: new Date(form.observedAt).toISOString(),
              }
        const res = await state.apiMutate<{ statusChanges?: StatusChange[] }>(
          '/api/signals',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          },
        )
        toast.success('Signal saved')
        notifyStatusChanges(res.statusChanges ?? [])
      }
      state.closeSheets()
    } catch {
      // toast handled in apiMutate
    } finally {
      setSaving(false)
    }
  }

  function onKey(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      void save()
    }
  }

  return (
    <Sheet
      open={open}
      onClose={state.closeSheets}
      title={editing ? 'Edit signal' : 'New signal'}
      wide
    >
      <div className="flex flex-col gap-4" onKeyDown={onKey}>
        <label className="block">
          <span className="mb-1.5 block text-[11px] uppercase tracking-[0.06em] text-[var(--muted)]">
            Quote
          </span>
          <textarea
            value={form.quote}
            onChange={(e) => setForm((f) => ({ ...f, quote: e.target.value }))}
            rows={4}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-[14px] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[11px] uppercase tracking-[0.06em] text-[var(--muted)]">
            Summary
          </span>
          <input
            value={form.summary}
            onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
            maxLength={160}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-[14px] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
          />
        </label>

        <div>
          <span className="mb-1.5 block text-[11px] uppercase tracking-[0.06em] text-[var(--muted)]">
            Theme
          </span>
          <input
            value={themeQuery}
            onChange={(e) => setThemeQuery(e.target.value)}
            placeholder="Search themes…"
            className="mb-2 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-[14px] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
          />
          <div className="max-h-36 space-y-1 overflow-y-auto rounded-lg border border-[var(--border)] p-1">
            {filteredThemes.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    themeMode: 'existing',
                    themeId: t.id,
                    newThemeName: '',
                  }))
                }
                className={`block w-full rounded-md px-2 py-1.5 text-left text-[13px] ${
                  form.themeMode === 'existing' && form.themeId === t.id
                    ? 'bg-[var(--accent)]/20 text-[var(--text)]'
                    : 'text-[var(--muted)] hover:bg-[var(--surface-2)]'
                }`}
              >
                {t.name}
              </button>
            ))}
            {themeQuery.trim().length >= 2 && (
              <button
                type="button"
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    themeMode: 'new',
                    newThemeName: themeQuery.trim(),
                    themeId: '',
                  }))
                }
                className={`block w-full rounded-md px-2 py-1.5 text-left text-[13px] ${
                  form.themeMode === 'new'
                    ? 'bg-[var(--accent)]/20 text-[var(--text)]'
                    : 'text-[var(--muted)] hover:bg-[var(--surface-2)]'
                }`}
              >
                Create new theme: &apos;{themeQuery.trim()}&apos;
              </button>
            )}
          </div>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-[11px] uppercase tracking-[0.06em] text-[var(--muted)]">
            Source type
          </span>
          <select
            value={form.sourceType}
            onChange={(e) =>
              setForm((f) => ({ ...f, sourceType: e.target.value as SourceType }))
            }
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-[14px] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
          >
            {SOURCE_OPTIONS.map((s) => (
              <option key={s.type} value={s.type}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1.5 block text-[11px] uppercase tracking-[0.06em] text-[var(--muted)]">
              Source detail
            </span>
            <input
              value={form.sourceDetail}
              onChange={(e) => setForm((f) => ({ ...f, sourceDetail: e.target.value }))}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-[14px] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11px] uppercase tracking-[0.06em] text-[var(--muted)]">
              Segment
            </span>
            <input
              value={form.segment}
              onChange={(e) => setForm((f) => ({ ...f, segment: e.target.value }))}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-[14px] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
            />
          </label>
        </div>

        <div>
          <span className="mb-1.5 block text-[11px] uppercase tracking-[0.06em] text-[var(--muted)]">
            Sentiment
          </span>
          <div className="grid grid-cols-3 gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-1">
            {(['risk', 'neutral', 'opportunity'] as Sentiment[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setForm((f) => ({ ...f, sentiment: s }))}
                className={`rounded-md px-2 py-1.5 text-[12px] capitalize ${
                  form.sentiment === s
                    ? 'bg-[var(--accent)] text-white'
                    : 'text-[var(--muted)] hover:text-[var(--text)]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-[11px] uppercase tracking-[0.06em] text-[var(--muted)]">
            Observed date
          </span>
          <input
            type="date"
            value={form.observedAt}
            max={todayInput()}
            onChange={(e) => setForm((f) => ({ ...f, observedAt: e.target.value }))}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-[14px] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
          />
        </label>

        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="mt-2 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-[14px] font-medium text-white hover:opacity-90 disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        >
          {saving ? 'Saving…' : 'Save signal'}
          <span className="ml-2 text-[11px] opacity-80">⌘/Ctrl+Enter</span>
        </button>
      </div>
    </Sheet>
  )
}
