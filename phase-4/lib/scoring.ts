import { getSourceMeta } from './source-meta'
import type {
  Polarity,
  ScoredTheme,
  Sentiment,
  Signal,
  Status,
  StatusChange,
  StatusReason,
  Theme,
} from './types'

const DAY_MS = 24 * 60 * 60 * 1000

export function round1(n: number): number {
  return Math.round(n * 10) / 10
}

export function ageDays(observedAt: string, now: Date): number {
  return Math.max(0, (now.getTime() - new Date(observedAt).getTime()) / DAY_MS)
}

function majorityPolarity(sentiments: Sentiment[]): Polarity {
  const counts: Record<Sentiment, number> = { risk: 0, opportunity: 0, neutral: 0 }
  for (const s of sentiments) counts[s] += 1
  const risk = counts.risk
  const opportunity = counts.opportunity
  const neutral = counts.neutral
  const max = Math.max(risk, opportunity, neutral)
  const winners = (['risk', 'opportunity', 'neutral'] as Sentiment[]).filter(
    (k) => counts[k] === max,
  )
  if (winners.length !== 1) return 'Neutral'
  if (winners[0] === 'risk') return 'Risk'
  if (winners[0] === 'opportunity') return 'Opportunity'
  return 'Neutral'
}

function weeklyCountsFor(signals: Signal[], now: Date): number[] {
  const buckets = Array.from({ length: 8 }, () => 0)
  const nowStart = new Date(now)
  nowStart.setHours(0, 0, 0, 0)
  // Week 7 = current week (Mon-aligned relative to now), week 0 = 7 weeks ago
  for (const signal of signals) {
    const age = ageDays(signal.observedAt, now)
    if (age < 0 || age >= 56) continue
    const weekIndexFromNow = Math.floor(age / 7) // 0 = this week
    const bucket = 7 - weekIndexFromNow
    if (bucket >= 0 && bucket < 8) buckets[bucket] += 1
  }
  return buckets
}

function buildReasons(input: {
  status: Status
  count: number
  sources: number
  last14: number
  prev14: number
  hasRecent30: boolean
}): StatusReason[] {
  const { status, count, sources, last14, prev14, hasRecent30 } = input

  if (status === 'fading') {
    return [
      {
        label: 'No signal in last 30 days',
        met: !hasRecent30,
        value: hasRecent30 ? 'recent activity' : 'none',
      },
    ]
  }

  if (status === 'strong') {
    return [
      { label: '8+ signals', met: count >= 8, value: String(count) },
      { label: '3+ source types', met: sources >= 3, value: String(sources) },
      { label: 'Activity in last 30 days', met: hasRecent30, value: hasRecent30 ? 'yes' : 'no' },
    ]
  }

  // Emerging + Weak share the Emerging checklist so "Why Weak?" / "Why Emerging?" is tangible
  return [
    { label: '3+ signals', met: count >= 3, value: String(count) },
    { label: '2+ source types', met: sources >= 2, value: String(sources) },
    {
      label: 'Rising (last 14d ≥ prior 14d)',
      met: last14 >= 1 && last14 >= prev14,
      value: `${last14} vs ${prev14}`,
    },
  ]
}

function nextStatusHint(input: {
  status: Status
  count: number
  sources: number
  last14: number
  prev14: number
  hasRecent30: boolean
}): string {
  const { status, count, sources, last14, prev14, hasRecent30 } = input

  if (status === 'strong') return 'Holding Strong — keep diverse recent signals coming.'
  if (status === 'fading') return 'Add a signal observed within the last 30 days to leave Fading.'

  if (status === 'emerging') {
    const needCount = Math.max(0, 8 - count)
    const needSources = Math.max(0, 3 - sources)
    if (needCount === 0 && needSources === 0) {
      return 'Already meets Strong volume — ensure recent activity stays within 30 days.'
    }
    const parts: string[] = []
    if (needCount > 0) parts.push(`${needCount} more signal${needCount === 1 ? '' : 's'}`)
    if (needSources > 0) {
      parts.push(`${needSources} new source type${needSources === 1 ? '' : 's'}`)
    }
    return `${parts.join(' and ')} → Strong`
  }

  // Weak
  if (!hasRecent30) return 'Add a recent signal (≤30 days) — currently at risk of Fading.'
  const needCount = Math.max(0, 3 - count)
  const needSources = Math.max(0, 2 - sources)
  const risingOk = last14 >= 1 && last14 >= prev14
  if (needCount === 0 && needSources === 0 && risingOk) {
    return 'Meets Emerging gates — status should flip on next recompute.'
  }
  const parts: string[] = []
  if (needCount > 0) parts.push(`${needCount} more signal${needCount === 1 ? '' : 's'}`)
  if (needSources > 0) {
    parts.push(`${needSources === 1 ? 'a new source type' : `${needSources} new source types`}`)
  }
  if (!risingOk) {
    if (last14 < 1) parts.push('at least 1 signal in the last 14 days')
    else parts.push('enough recent signals so last 14d ≥ prior 14d')
  }
  if (parts.length === 0) return 'Add more recent, diverse signals → Emerging'
  if (parts.length === 1) return `${parts[0].charAt(0).toUpperCase()}${parts[0].slice(1)} → Emerging`
  return `${parts[0].charAt(0).toUpperCase()}${parts[0].slice(1)}` +
    (parts.length === 2 ? ` from ${parts[1]}` : ` · ${parts.slice(1).join(' · ')}`) +
    ' → Emerging'
}

export function computeStatus(input: {
  count: number
  sources: number
  last14: number
  prev14: number
  hasRecent30: boolean
}): Status {
  const { count, sources, last14, prev14, hasRecent30 } = input
  if (!hasRecent30) return 'fading'
  if (count >= 8 && sources >= 3) return 'strong'
  if (count >= 3 && sources >= 2 && last14 >= 1 && last14 >= prev14) return 'emerging'
  return 'weak'
}

export function scoreTheme(theme: Theme, allSignals: Signal[], now: Date = new Date()): ScoredTheme {
  const signals = allSignals.filter((s) => s.themeId === theme.id)
  const ages = signals.map((s) => ageDays(s.observedAt, now))

  let strengthRaw = 0
  const sourceTypes = new Set<string>()
  let last14 = 0
  let prev14 = 0
  let hasRecent30 = false

  signals.forEach((signal, i) => {
    const age = ages[i]
    const weight = getSourceMeta(signal.sourceType).weight
    const recency = 0.5 ** (age / 30)
    strengthRaw += weight * recency
    sourceTypes.add(signal.sourceType)
    if (age <= 14) last14 += 1
    else if (age <= 28) prev14 += 1
    if (age <= 30) hasRecent30 = true
  })

  const count = signals.length
  const sources = sourceTypes.size
  const velocity = last14 - prev14
  const status = computeStatus({ count, sources, last14, prev14, hasRecent30 })
  const polarity = majorityPolarity(signals.map((s) => s.sentiment))

  const sortedByObserved = [...signals].sort(
    (a, b) => new Date(b.observedAt).getTime() - new Date(a.observedAt).getTime(),
  )
  const latest = sortedByObserved[0]

  return {
    ...theme,
    status,
    polarity,
    strength: round1(strengthRaw),
    count,
    sources,
    velocity,
    last14,
    prev14,
    weeklyCounts: weeklyCountsFor(signals, now),
    reasons: buildReasons({ status, count, sources, last14, prev14, hasRecent30 }),
    nextStatusHint: nextStatusHint({ status, count, sources, last14, prev14, hasRecent30 }),
    topQuote: latest?.quote,
    latestVia: latest?.via,
  }
}

export function scoreAllThemes(
  themes: Theme[],
  signals: Signal[],
  now: Date = new Date(),
): ScoredTheme[] {
  return themes.map((t) => scoreTheme(t, signals, now))
}

export function detectStatusChanges(
  before: ScoredTheme[],
  after: ScoredTheme[],
): StatusChange[] {
  const beforeMap = new Map(before.map((t) => [t.id, t]))
  const changes: StatusChange[] = []
  for (const theme of after) {
    const prev = beforeMap.get(theme.id)
    if (prev && prev.status !== theme.status) {
      changes.push({
        themeId: theme.id,
        name: theme.name,
        from: prev.status,
        to: theme.status,
      })
    }
  }
  return changes
}
