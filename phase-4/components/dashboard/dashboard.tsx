'use client'

import { useMemo, useState } from 'react'
import { LayoutGroup } from 'motion/react'
import { Plus } from 'lucide-react'
import { useAppState, filterThemes } from '@/lib/hooks/use-app-state'
import type { Status } from '@/lib/types'
import {
  AnimatedNumber,
  LiveIndicator,
  StatusPill,
  Wordmark,
} from '@/components/atoms'
import { MetricsRow } from '@/components/dashboard/metrics-row'
import { ThemeCard } from '@/components/dashboard/theme-card'
import { ActivityRail } from '@/components/dashboard/activity-rail'
import { HypothesesPanel } from '@/components/dashboard/hypotheses-panel'
import { SignalCore } from '@/components/signal-core'
import { SignalSheet } from '@/components/sheets/signal-sheet'
import { ConnectClaudeSheet } from '@/components/sheets/connect-claude-sheet'
import { Dialog } from '@/components/ui/dialog'
import { Popover } from '@/components/ui/popover'
import { Tooltip } from '@/components/ui/tooltip'

const COLUMNS: Status[] = ['strong', 'emerging', 'weak', 'fading']

export function Dashboard() {
  const state = useAppState()
  const [resetOpen, setResetOpen] = useState(false)
  const themes = filterThemes(state.data, state.search)
  const glowMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const t of state.data?.themes ?? []) {
      map.set(t.id, `${t.status}:${t.count}:${t.strength}`)
    }
    return map
  }, [state.data?.themes])

  if (state.isLoading && !state.data) {
    return <DashboardSkeleton />
  }

  if (state.error && !state.data) {
    return (
      <div className="mx-auto max-w-[1440px] p-8">
        <p style={{ color: 'var(--polarity-risk)' }}>Failed to load state. Check /api/state.</p>
      </div>
    )
  }

  const metrics = state.data!.metrics

  return (
    <div className="mx-auto min-h-screen w-full max-w-[1440px] px-8 py-8">
      <header className="mb-6 flex flex-wrap items-center gap-4">
        <Wordmark />
        <LiveIndicator lastSyncedAt={state.lastSyncedAt} />
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Tooltip label="Shortcut /">
            <input
              ref={state.searchRef}
              value={state.search}
              onChange={(e) => state.setSearch(e.target.value)}
              placeholder="Search themes or quotes…"
              className="h-9 w-56 rounded-lg border border-[var(--rule)] bg-[var(--paper)] px-3 text-[13px] text-[var(--ink)] outline-none placeholder:text-[var(--muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--signal)]"
            />
          </Tooltip>
          <Tooltip label="Shortcut N">
            <button
              type="button"
              onClick={() => state.openNewSignal()}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--rule)] bg-[var(--paper)] px-3 text-[13px] text-[var(--ink)] hover:bg-[var(--surface-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--signal)]"
            >
              <Plus size={14} />
              New signal
            </button>
          </Tooltip>
          <Tooltip label="Shortcut C">
            <button
              type="button"
              onClick={state.openConnect}
              className="inline-flex h-9 items-center rounded-lg bg-[var(--ink)] px-3 text-[13px] font-medium text-white hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--signal)]"
            >
              Connect Claude
            </button>
          </Tooltip>
        </div>
      </header>

      <section className="mb-8 flex flex-wrap items-start justify-between gap-6">
        <div className="max-w-xl">
          <h1 className="font-display mb-3 text-[40px] leading-[1.05] tracking-[-0.02em] text-[var(--ink)]">
            Signals board
          </h1>
          <p className="mb-3 text-[14px] text-[var(--secondary)]">
            Claude matches meaning. SignalOS does the maths.
          </p>
          <Popover
            trigger={
              <span
                className="cursor-pointer text-[13px] underline-offset-2 hover:underline"
                style={{ color: 'var(--signal-text)' }}
              >
                How scoring works
              </span>
            }
          >
            <p className="mb-2 text-[12px] font-medium text-[var(--ink)]">Status rules (in order)</p>
            <ol className="list-decimal space-y-1.5 pl-4 text-[12px] text-[var(--secondary)]">
              <li>Fading — no signal in the last 30 days</li>
              <li>Strong — ≥8 signals and ≥3 source types</li>
              <li>Emerging — ≥3 signals, ≥2 sources, rising last 14d</li>
              <li>Weak — everything else</li>
            </ol>
          </Popover>
        </div>
        <SignalCore />
      </section>

      <div className="mb-6">
        <MetricsRow metrics={metrics} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_280px]">
        <LayoutGroup>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {COLUMNS.map((status) => {
              const col = themes.filter((t) => t.status === status)
              return (
                <section key={status} className="min-h-[280px]">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <StatusPill status={status} />
                    <span className="font-[family-name:var(--font-geist-mono)] text-[12px] tabular-nums text-[var(--secondary)]">
                      <AnimatedNumber value={col.length} />
                    </span>
                  </div>
                  <div className="flex flex-col gap-3">
                    {col.map((theme) => (
                      <ThemeCard
                        key={theme.id}
                        theme={theme}
                        signals={state.data!.signals}
                        glowToken={glowMap.get(theme.id)}
                      />
                    ))}
                    {col.length === 0 && (
                      <div className="rounded-xl border border-dashed border-[var(--rule)] bg-[var(--paper)] px-4 py-8 text-center text-[13px] text-[var(--secondary)]">
                        No {status} themes
                        {status === 'weak' && (
                          <div className="mt-2">
                            <button
                              type="button"
                              onClick={() => state.openNewSignal()}
                              className="hover:underline"
                              style={{ color: 'var(--signal-text)' }}
                            >
                              Add a signal
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </section>
              )
            })}
          </div>
        </LayoutGroup>
        <ActivityRail items={state.data!.activity} />
      </div>

      <HypothesesPanel state={state} />

      <footer className="mt-10 flex flex-col items-center gap-2 text-center">
        <p className="text-[12px] text-[var(--secondary)]">
          No AI runs inside SignalOS. Your own Claude does the thinking.
        </p>
        <button
          type="button"
          onClick={() => setResetOpen(true)}
          className="text-[12px] text-[var(--muted)] hover:text-[var(--ink)]"
        >
          Reset demo data
        </button>
      </footer>

      <Dialog open={resetOpen} onClose={() => setResetOpen(false)} title="Reset demo data?">
        <p className="mb-4 text-[14px] text-[var(--secondary)]">
          This reseeds the Indian SMB spend demo and clears edits.
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setResetOpen(false)}
            className="rounded-lg border border-[var(--rule)] bg-[var(--paper)] px-3 py-2 text-[13px]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={async () => {
              setResetOpen(false)
              await state.resetDemo()
            }}
            className="rounded-lg bg-[var(--ink)] px-3 py-2 text-[13px] text-white"
          >
            Reset
          </button>
        </div>
      </Dialog>

      <SignalSheet state={state} />
      <ConnectClaudeSheet state={state} />
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-[1440px] space-y-6 px-8 py-8">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-[var(--surface-2)]" />
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-[var(--surface-2)]" />
        ))}
      </div>
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-64 animate-pulse rounded-xl bg-[var(--surface-2)]" />
        ))}
      </div>
    </div>
  )
}
