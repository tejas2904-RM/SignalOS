'use client'

import useSWR from 'swr'
import type { ComputedState, Status } from '@/lib/types'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const COLUMNS: Status[] = ['strong', 'emerging', 'weak', 'fading']

function title(status: Status) {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

export function PlainBoard() {
  const { data, error, isLoading, mutate } = useSWR<ComputedState>('/api/state', fetcher, {
    refreshInterval: 3000,
  })

  async function onReset() {
    await fetch('/api/reset', { method: 'POST' })
    await mutate()
  }

  if (error) {
    return <p style={{ color: '#F43F5E' }}>Failed to load /api/state</p>
  }

  if (isLoading || !data) {
    return <p style={{ color: 'var(--muted)' }}>Loading state…</p>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>SignalOS</h1>
          <p style={{ color: 'var(--muted)', margin: '8px 0 0', fontSize: 14 }}>
            Phase 2 · MCP live · Claude matches meaning. SignalOS does the maths.
          </p>
          <p
            style={{
              color: 'var(--muted)',
              margin: '8px 0 0',
              fontSize: 12,
              fontFamily: 'var(--font-geist-mono)',
            }}
          >
            MCP endpoint: /api/mcp
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: 13 }}>
          <span style={{ color: 'var(--muted)', fontFamily: 'var(--font-geist-mono)' }}>
            v{data.version} · {data.signals.length} signals
          </span>
          <button
            type="button"
            onClick={onReset}
            style={{
              background: 'var(--surface-2)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '8px 12px',
              cursor: 'pointer',
            }}
          >
            Reset demo data
          </button>
        </div>
      </header>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: 16,
        }}
      >
        {COLUMNS.map((status) => {
          const themes = data.themes.filter((t) => t.status === status)
          return (
            <section
              key={status}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: 16,
                minHeight: 240,
              }}
            >
              <h2
                style={{
                  margin: '0 0 12px',
                  fontSize: 11,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                }}
              >
                {title(status)} · {themes.length}
              </h2>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
                {themes.map((theme) => (
                  <li
                    key={theme.id}
                    style={{
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 14,
                    }}
                  >
                    <div style={{ fontWeight: 500 }}>{theme.name}</div>
                    <div
                      style={{
                        marginTop: 6,
                        color: 'var(--muted)',
                        fontFamily: 'var(--font-geist-mono)',
                        fontSize: 12,
                      }}
                    >
                      {theme.count} signals · strength {theme.strength} · {theme.polarity}
                    </div>
                  </li>
                ))}
                {themes.length === 0 && (
                  <li style={{ color: 'var(--muted)', fontSize: 13 }}>No themes</li>
                )}
              </ul>
            </section>
          )
        })}
      </div>
    </div>
  )
}
