import { describe, expect, it } from 'vitest'
import { detectStatusChanges, round1, scoreTheme } from './scoring'
import { THEME_NAMES, buildSeedData } from './seed'
import type { Signal, Theme } from './types'

const baseTheme: Theme = {
  id: 't1',
  name: 'Test theme',
  createdAt: new Date().toISOString(),
  createdVia: 'web',
}

function sig(
  partial: Partial<Signal> & Pick<Signal, 'id' | 'sourceType' | 'observedAt' | 'sentiment'>,
): Signal {
  const now = new Date().toISOString()
  return {
    themeId: 't1',
    quote: 'Sample quote text here',
    summary: 'Summary',
    via: 'web',
    createdAt: now,
    updatedAt: now,
    ...partial,
  }
}

function daysAgoIso(now: Date, days: number): string {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString()
}

describe('scoring', () => {
  const now = new Date('2026-11-10T12:00:00.000Z')

  it('marks fading when all signals are older than 30 days', () => {
    const signals = [
      sig({
        id: '1',
        sourceType: 'customer_call',
        sentiment: 'opportunity',
        observedAt: daysAgoIso(now, 45),
      }),
      sig({
        id: '2',
        sourceType: 'sales_call',
        sentiment: 'opportunity',
        observedAt: daysAgoIso(now, 40),
      }),
    ]
    expect(scoreTheme(baseTheme, signals, now).status).toBe('fading')
  })

  it('marks strong when count >= 8 and sources >= 3 with recent activity', () => {
    const types = [
      'customer_call',
      'sales_call',
      'support_ticket',
      'customer_call',
      'sales_call',
      'community',
      'customer_call',
      'churn_feedback',
    ] as const
    const signals = types.map((sourceType, i) =>
      sig({
        id: String(i),
        sourceType,
        sentiment: 'opportunity',
        observedAt: daysAgoIso(now, i + 1),
      }),
    )
    expect(scoreTheme(baseTheme, signals, now).status).toBe('strong')
  })

  it('does not mark strong with 8 signals but only 2 sources', () => {
    const signals = Array.from({ length: 8 }, (_, i) =>
      sig({
        id: String(i),
        sourceType: i % 2 === 0 ? 'customer_call' : 'sales_call',
        sentiment: 'opportunity',
        observedAt: daysAgoIso(now, i + 1),
      }),
    )
    expect(scoreTheme(baseTheme, signals, now).status).not.toBe('strong')
  })

  it('marks emerging when gates are met', () => {
    const signals = [
      sig({
        id: '1',
        sourceType: 'customer_call',
        sentiment: 'opportunity',
        observedAt: daysAgoIso(now, 3),
      }),
      sig({
        id: '2',
        sourceType: 'sales_call',
        sentiment: 'opportunity',
        observedAt: daysAgoIso(now, 5),
      }),
      sig({
        id: '3',
        sourceType: 'customer_call',
        sentiment: 'risk',
        observedAt: daysAgoIso(now, 8),
      }),
    ]
    const scored = scoreTheme(baseTheme, signals, now)
    expect(scored.status).toBe('emerging')
    expect(scored.last14).toBeGreaterThanOrEqual(1)
  })

  it('does not mark emerging when velocity is down', () => {
    const signals = [
      sig({
        id: '1',
        sourceType: 'customer_call',
        sentiment: 'opportunity',
        observedAt: daysAgoIso(now, 2),
      }),
      sig({
        id: '2',
        sourceType: 'sales_call',
        sentiment: 'opportunity',
        observedAt: daysAgoIso(now, 16),
      }),
      sig({
        id: '3',
        sourceType: 'customer_call',
        sentiment: 'opportunity',
        observedAt: daysAgoIso(now, 20),
      }),
      sig({
        id: '4',
        sourceType: 'sales_call',
        sentiment: 'opportunity',
        observedAt: daysAgoIso(now, 22),
      }),
    ]
    // last14=1, prev14=3 → not emerging
    expect(scoreTheme(baseTheme, signals, now).status).toBe('weak')
  })

  it('does not mark emerging when last14 is zero', () => {
    const signals = [
      sig({
        id: '1',
        sourceType: 'customer_call',
        sentiment: 'risk',
        observedAt: daysAgoIso(now, 16),
      }),
      sig({
        id: '2',
        sourceType: 'sales_call',
        sentiment: 'risk',
        observedAt: daysAgoIso(now, 18),
      }),
      sig({
        id: '3',
        sourceType: 'support_ticket',
        sentiment: 'risk',
        observedAt: daysAgoIso(now, 20),
      }),
    ]
    expect(scoreTheme(baseTheme, signals, now).status).toBe('weak')
  })

  it('uses weak as catch-all for thin recent themes', () => {
    const signals = [
      sig({
        id: '1',
        sourceType: 'sales_call',
        sentiment: 'opportunity',
        observedAt: daysAgoIso(now, 4),
      }),
      sig({
        id: '2',
        sourceType: 'sales_call',
        sentiment: 'opportunity',
        observedAt: daysAgoIso(now, 7),
      }),
    ]
    expect(scoreTheme(baseTheme, signals, now).status).toBe('weak')
  })

  it('prefers fading over strong when nothing is recent', () => {
    const types = [
      'customer_call',
      'sales_call',
      'support_ticket',
      'community',
      'news',
      'competitor',
      'churn_feedback',
      'other',
    ] as const
    const signals = types.map((sourceType, i) =>
      sig({
        id: String(i),
        sourceType,
        sentiment: 'opportunity',
        observedAt: daysAgoIso(now, 40 + i),
      }),
    )
    expect(scoreTheme(baseTheme, signals, now).status).toBe('fading')
  })

  it('computes polarity by majority and neutral on tie', () => {
    const majority = [
      sig({
        id: '1',
        sourceType: 'customer_call',
        sentiment: 'risk',
        observedAt: daysAgoIso(now, 1),
      }),
      sig({
        id: '2',
        sourceType: 'sales_call',
        sentiment: 'risk',
        observedAt: daysAgoIso(now, 2),
      }),
      sig({
        id: '3',
        sourceType: 'community',
        sentiment: 'opportunity',
        observedAt: daysAgoIso(now, 3),
      }),
    ]
    expect(scoreTheme(baseTheme, majority, now).polarity).toBe('Risk')

    const tie = [
      sig({
        id: '1',
        sourceType: 'customer_call',
        sentiment: 'risk',
        observedAt: daysAgoIso(now, 1),
      }),
      sig({
        id: '2',
        sourceType: 'sales_call',
        sentiment: 'opportunity',
        observedAt: daysAgoIso(now, 2),
      }),
    ]
    expect(scoreTheme(baseTheme, tie, now).polarity).toBe('Neutral')
  })

  it('rounds strength to 1 decimal', () => {
    expect(round1(1.24)).toBe(1.2)
    expect(round1(1.25)).toBe(1.3)
    const signals = [
      sig({
        id: '1',
        sourceType: 'news',
        sentiment: 'neutral',
        observedAt: daysAgoIso(now, 0),
      }),
    ]
    const strength = scoreTheme(baseTheme, signals, now).strength
    expect(Number.isInteger(strength * 10)).toBe(true)
  })

  it('counts day 14 in last14 and day 15 in prev14', () => {
    const signals = [
      sig({
        id: '1',
        sourceType: 'customer_call',
        sentiment: 'opportunity',
        observedAt: daysAgoIso(now, 14),
      }),
      sig({
        id: '2',
        sourceType: 'sales_call',
        sentiment: 'opportunity',
        observedAt: daysAgoIso(now, 15),
      }),
      sig({
        id: '3',
        sourceType: 'customer_call',
        sentiment: 'opportunity',
        observedAt: daysAgoIso(now, 2),
      }),
    ]
    const scored = scoreTheme(baseTheme, signals, now)
    expect(scored.last14).toBe(2)
    expect(scored.prev14).toBe(1)
  })

  it('returns 8 weekly buckets', () => {
    const signals = [
      sig({
        id: '1',
        sourceType: 'customer_call',
        sentiment: 'opportunity',
        observedAt: daysAgoIso(now, 3),
      }),
    ]
    expect(scoreTheme(baseTheme, signals, now).weeklyCounts).toHaveLength(8)
  })

  it('GST seed is Weak then Emerging after two customer_call signals', () => {
    const seed = buildSeedData(now)
    const gst = seed.themes.find((t) => t.name === THEME_NAMES.gst)!
    const before = scoreTheme(gst, seed.signals, now)
    expect(before.status).toBe('weak')

    const extra: Signal[] = [
      sig({
        id: 'gst-new-1',
        themeId: gst.id,
        sourceType: 'customer_call',
        sentiment: 'opportunity',
        observedAt: daysAgoIso(now, 1),
        via: 'claude',
        quote: 'We lose GST credit when vendor invoices go missing.',
      }),
      sig({
        id: 'gst-new-2',
        themeId: gst.id,
        sourceType: 'customer_call',
        sentiment: 'opportunity',
        observedAt: daysAgoIso(now, 2),
        via: 'claude',
        quote: 'Finance managers chase invoices every month for ITC.',
      }),
    ]
    const after = scoreTheme(gst, [...seed.signals, ...extra], now)
    expect(after.status).toBe('emerging')
    const changes = detectStatusChanges([before], [after])
    expect(changes).toEqual([
      { themeId: gst.id, name: gst.name, from: 'weak', to: 'emerging' },
    ])
  })

  it('includes reasons and nextStatusHint', () => {
    const seed = buildSeedData(now)
    const gst = seed.themes.find((t) => t.name === THEME_NAMES.gst)!
    const scored = scoreTheme(gst, seed.signals, now)
    expect(scored.reasons.length).toBeGreaterThan(0)
    expect(scored.nextStatusHint.toLowerCase()).toContain('emerging')
  })
})
