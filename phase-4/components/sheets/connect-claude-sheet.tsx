'use client'

import { useMemo, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Sheet } from '@/components/ui/sheet'
import type { AppStateApi } from '@/lib/hooks/use-app-state'

const PROMPTS = [
  'I spoke to two finance managers at small manufacturing firms. Both lose GST input credit every month because vendor invoices go missing. Save these as signals.',
  'What are our emerging risks right now? Quote the evidence.',
  'Search our signals about reimbursements and summarise what customers are saying.',
]

export function ConnectClaudeSheet({ state }: { state: AppStateApi }) {
  const mcp = useMemo(() => {
    if (typeof window === 'undefined') return '/api/mcp'
    return `${window.location.origin}/api/mcp`
  }, [state.sheets.connectOpen])
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [copiedPrompt, setCopiedPrompt] = useState<number | null>(null)

  async function copy(text: string, kind: 'url' | number) {
    await navigator.clipboard.writeText(text)
    if (kind === 'url') {
      setCopiedUrl(true)
      window.setTimeout(() => setCopiedUrl(false), 1500)
    } else {
      setCopiedPrompt(kind)
      window.setTimeout(() => setCopiedPrompt(null), 1500)
    }
  }

  return (
    <Sheet open={state.sheets.connectOpen} onClose={state.closeSheets} title="Connect your Claude" wide>
      <div className="flex flex-col gap-5">
        <div>
          <span className="mb-1.5 block text-[11px] uppercase tracking-[0.06em] text-[var(--muted)]">
            MCP URL
          </span>
          <div className="flex gap-2">
            <input
              readOnly
              value={mcp}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 font-[family-name:var(--font-geist-mono)] text-[12px] text-[var(--text)]"
            />
            <button
              type="button"
              onClick={() => void copy(mcp, 'url')}
              className="inline-flex items-center gap-1.5 rounded-lg border px-3 text-[12px]"
              style={
                copiedUrl
                  ? {
                      background: 'rgba(47, 210, 122, 0.14)',
                      borderColor: 'var(--signal)',
                      color: 'var(--signal-text)',
                    }
                  : {
                      background: 'var(--surface-2)',
                      borderColor: 'var(--rule)',
                      color: 'var(--ink)',
                    }
              }
            >
              {copiedUrl ? <Check size={14} /> : <Copy size={14} />}
              {copiedUrl ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>

        <ol className="space-y-3 text-[14px] text-[var(--text)]">
          <li className="flex gap-3">
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-medium text-white"
              style={{ background: 'var(--signal)' }}
            >
              1
            </span>
            <span>
              In Claude, open <strong>Settings / Customize → Connectors → Add custom connector</strong>.
            </span>
          </li>
          <li className="flex gap-3">
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-medium text-white"
              style={{ background: 'var(--signal)' }}
            >
              2
            </span>
            <span>
              Paste the URL, name it <strong>SignalOS</strong>, and add it.
            </span>
          </li>
          <li className="flex gap-3">
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-medium text-white"
              style={{ background: 'var(--signal)' }}
            >
              3
            </span>
            <span>
              In a chat, click <strong>+ → Connectors</strong> and switch on <strong>SignalOS</strong>.
            </span>
          </li>
        </ol>

        <p className="text-[13px] text-[var(--muted)]">
          Custom connectors may require a paid Claude plan.
        </p>

        <div>
          <h3 className="mb-2 text-[11px] uppercase tracking-[0.06em] text-[var(--muted)]">
            Example prompts
          </h3>
          <div className="space-y-2">
            {PROMPTS.map((prompt, i) => (
              <div
                key={prompt}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3"
              >
                <p className="mb-2 text-[13px] leading-relaxed text-[var(--text)]">{prompt}</p>
                <button
                  type="button"
                  onClick={() => void copy(prompt, i)}
                  className="inline-flex items-center gap-1.5 text-[12px] text-[var(--muted)] hover:text-[var(--text)]"
                >
                  {copiedPrompt === i ? <Check size={12} /> : <Copy size={12} />}
                  {copiedPrompt === i ? 'Copied ✓' : 'Copy prompt'}
                </button>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[13px] text-[var(--muted)]">
          No AI runs inside SignalOS. Your own Claude does the thinking.
        </p>
      </div>
    </Sheet>
  )
}
