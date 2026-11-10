import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SOURCE_META } from '@/lib/source-meta'
import { POLARITY_COLOR, STATUS_COLOR, titleCaseStatus } from '@/lib/utils'
import type { ScoredTheme, Signal } from '@/lib/types'

type Props = { params: Promise<{ slug: string }> }

async function loadShare(slug: string): Promise<{
  theme: ScoredTheme
  signals: Signal[]
} | null> {
  // Prefer in-process store; fall back to HTTP for multi-isolate/dev memory edge cases
  try {
    const { getSharePage } = await import('@/lib/store')
    const { isAppError } = await import('@/lib/errors')
    try {
      return await getSharePage(slug)
    } catch (err) {
      if (isAppError(err) && err.status === 404) {
        // try HTTP fallback below
      } else {
        throw err
      }
    }
  } catch {
    // continue to HTTP
  }

  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  const res = await fetch(`${base}/api/share/${slug}`, { cache: 'no-store' })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Failed to load share (${res.status})`)
  return res.json()
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const page = await loadShare(slug)
  if (!page) {
    return { title: 'Share · SignalOS', robots: { index: false, follow: false } }
  }
  return {
    title: `${page.theme.name} · SignalOS`,
    description: `Evidence for ${page.theme.name}`,
    robots: { index: false, follow: false },
  }
}

export default async function SharePage({ params }: Props) {
  const { slug } = await params
  const page = await loadShare(slug)
  if (!page) notFound()

  const { theme, signals } = page
  const statusColor = STATUS_COLOR[theme.status]

  return (
    <main className="mx-auto min-h-screen max-w-[720px] px-6 py-10">
      <p className="mb-2 text-[11px] uppercase tracking-[0.06em] text-[var(--muted)]">
        Shared evidence
      </p>
      <h1 className="mb-3 text-[24px] font-semibold leading-tight text-[var(--text)]">
        {theme.name}
      </h1>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-medium"
          style={{ background: `${statusColor}1F`, color: statusColor }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: statusColor }} />
          {titleCaseStatus(theme.status)}
        </span>
        <span className="text-[13px] text-[var(--muted)]">{theme.polarity}</span>
        <span className="font-[family-name:var(--font-geist-mono)] text-[12px] text-[var(--muted)]">
          {theme.count} signals · strength {theme.strength}
        </span>
      </div>

      <section className="mb-8 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <h2 className="mb-3 text-[14px] font-medium">Why {titleCaseStatus(theme.status)}?</h2>
        <ul className="space-y-2">
          {theme.reasons.map((r) => (
            <li key={r.label} className="flex items-center gap-2 text-[13px]">
              <span className={r.met ? 'text-emerald-400' : 'text-[var(--muted)]'}>
                {r.met ? '✓' : '○'}
              </span>
              <span className={r.met ? 'text-[var(--text)]' : 'text-[var(--muted)]'}>{r.label}</span>
              <span className="ml-auto font-[family-name:var(--font-geist-mono)] text-[12px] text-[var(--muted)]">
                {r.value}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-10 space-y-3">
        <h2 className="text-[11px] uppercase tracking-[0.06em] text-[var(--muted)]">Quotes</h2>
        {signals.map((signal) => {
          const border =
            signal.sentiment === 'risk'
              ? POLARITY_COLOR.Risk
              : signal.sentiment === 'opportunity'
                ? POLARITY_COLOR.Opportunity
                : POLARITY_COLOR.Neutral
          const meta = SOURCE_META[signal.sourceType]
          return (
            <blockquote
              key={signal.id}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
            >
              <p
                className="mb-2 border-l-2 pl-3 text-[15px] leading-relaxed"
                style={{ borderColor: border }}
              >
                {signal.quote}
              </p>
              <p className="text-[12px] text-[var(--muted)]">
                {meta.label} · {new Date(signal.observedAt).toLocaleDateString()}
                {signal.segment ? ` · ${signal.segment}` : ''}
              </p>
            </blockquote>
          )
        })}
      </section>

      <footer className="border-t border-[var(--border)] pt-6 text-center text-[13px] text-[var(--muted)]">
        Built with{' '}
        <Link href="/" className="text-[var(--accent)] hover:underline">
          SignalOS
        </Link>
        . Claude matches meaning. SignalOS does the maths.
      </footer>
    </main>
  )
}
