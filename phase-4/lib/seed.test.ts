import { describe, expect, it } from 'vitest'
import { assertSeedStatuses, buildSeedData, THEME_NAMES } from './seed'
import { scoreAllThemes } from './scoring'

describe('seed', () => {
  it('builds ~18 signals across 5 themes with target statuses', () => {
    const now = new Date('2026-11-10T12:00:00.000Z')
    const doc = buildSeedData(now)
    expect(doc.themes).toHaveLength(5)
    expect(doc.signals.length).toBeGreaterThanOrEqual(16)
    expect(doc.signals.length).toBeLessThanOrEqual(20)
    assertSeedStatuses(doc, now)

    const scored = scoreAllThemes(doc.themes, doc.signals, now)
    const byName = Object.fromEntries(scored.map((t) => [t.name, t.status]))
    expect(byName[THEME_NAMES.reimbursements]).toBe('strong')
    expect(byName[THEME_NAMES.multiCurrency]).toBe('emerging')
    expect(byName[THEME_NAMES.accountingSync]).toBe('emerging')
    expect(byName[THEME_NAMES.gst]).toBe('weak')
    expect(byName[THEME_NAMES.upi]).toBe('fading')
  })

  it('keeps target statuses a week later (relative dates)', () => {
    const now = new Date('2026-11-17T12:00:00.000Z')
    const doc = buildSeedData(now)
    expect(() => assertSeedStatuses(doc, now)).not.toThrow()
  })

  it('seeds roughly half via Claude', () => {
    const doc = buildSeedData()
    const viaClaude = doc.signals.filter((s) => s.via === 'claude').length
    expect(viaClaude).toBeGreaterThanOrEqual(7)
    expect(viaClaude).toBeLessThanOrEqual(11)
  })

  it('seeds one GST-related hypothesis with a supporting link', () => {
    const doc = buildSeedData()
    expect(doc.hypotheses).toHaveLength(1)
    expect(doc.hypotheses[0].statement).toMatch(/GST invoice capture/i)
    expect(doc.hypotheses[0].links).toHaveLength(1)
    expect(doc.hypotheses[0].links[0].stance).toBe('supports')
    expect(doc.shares).toEqual([])
  })
})
