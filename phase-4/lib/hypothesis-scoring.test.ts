import { describe, expect, it } from 'vitest'
import { scoreHypothesis } from './hypothesis-scoring'
import type { Hypothesis, Signal } from './types'

function signal(
  id: string,
  sourceType: Signal['sourceType'],
  daysAgo: number,
  now: Date,
): Signal {
  const observedAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000).toISOString()
  return {
    id,
    themeId: 't1',
    quote: 'Quote text for hypothesis link',
    summary: 'Summary',
    sourceType,
    sentiment: 'opportunity',
    observedAt,
    via: 'web',
    createdAt: observedAt,
    updatedAt: observedAt,
  }
}

describe('hypothesis scoring', () => {
  const now = new Date('2026-11-10T12:00:00.000Z')

  it('is inconclusive with fewer than 3 links even at high support', () => {
    const h: Hypothesis = {
      id: 'h1',
      statement: 'Test',
      status: 'open',
      links: [
        { signalId: '1', stance: 'supports' },
        { signalId: '2', stance: 'supports' },
      ],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    }
    const signals = [
      signal('1', 'customer_call', 1, now),
      signal('2', 'sales_call', 2, now),
    ]
    const scored = scoreHypothesis(h, signals, now)
    expect(scored.supportPct).toBeGreaterThanOrEqual(70)
    expect(scored.verdict).toBe('Inconclusive')
  })

  it('leans true at >=70% with 3+ supporting links', () => {
    const h: Hypothesis = {
      id: 'h1',
      statement: 'Test',
      status: 'open',
      links: [
        { signalId: '1', stance: 'supports' },
        { signalId: '2', stance: 'supports' },
        { signalId: '3', stance: 'supports' },
      ],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    }
    const signals = [
      signal('1', 'customer_call', 1, now),
      signal('2', 'sales_call', 2, now),
      signal('3', 'churn_feedback', 3, now),
    ]
    expect(scoreHypothesis(h, signals, now).verdict).toBe('Leaning true')
  })

  it('leans false at <=30% support', () => {
    const h: Hypothesis = {
      id: 'h1',
      statement: 'Test',
      status: 'open',
      links: [
        { signalId: '1', stance: 'supports' },
        { signalId: '2', stance: 'contradicts' },
        { signalId: '3', stance: 'contradicts' },
        { signalId: '4', stance: 'contradicts' },
      ],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    }
    const signals = [
      signal('1', 'news', 1, now),
      signal('2', 'customer_call', 1, now),
      signal('3', 'sales_call', 1, now),
      signal('4', 'churn_feedback', 1, now),
    ]
    const scored = scoreHypothesis(h, signals, now)
    expect(scored.supportPct).toBeLessThanOrEqual(30)
    expect(scored.verdict).toBe('Leaning false')
  })
})
