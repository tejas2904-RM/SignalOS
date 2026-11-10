import { describe, expect, it } from 'vitest'
import {
  addSignalsMcpSchema,
  signalCreateSchema,
  themeCreateSchema,
} from './schemas'

describe('schemas', () => {
  it('rejects quote length 2 and accepts 3 and 1000', () => {
    const base = {
      summary: 'Summary text',
      sourceType: 'sales_call' as const,
      sentiment: 'opportunity' as const,
      themeId: 't1',
      observedAt: new Date().toISOString(),
    }
    expect(signalCreateSchema.safeParse({ ...base, quote: 'ab' }).success).toBe(false)
    expect(signalCreateSchema.safeParse({ ...base, quote: 'abc' }).success).toBe(true)
    expect(
      signalCreateSchema.safeParse({ ...base, quote: 'x'.repeat(1000) }).success,
    ).toBe(true)
    expect(
      signalCreateSchema.safeParse({ ...base, quote: 'x'.repeat(1001) }).success,
    ).toBe(false)
  })

  it('rejects summary over 160 and future observedAt', () => {
    const future = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
    const result = signalCreateSchema.safeParse({
      quote: 'Valid quote text',
      summary: 's'.repeat(161),
      sourceType: 'sales_call',
      sentiment: 'opportunity',
      themeId: 't1',
      observedAt: future,
    })
    expect(result.success).toBe(false)
  })

  it('requires exactly one of themeId or newThemeName', () => {
    const base = {
      quote: 'Valid quote text',
      summary: 'Summary',
      sourceType: 'sales_call' as const,
      sentiment: 'opportunity' as const,
    }
    expect(signalCreateSchema.safeParse(base).success).toBe(false)
    expect(
      signalCreateSchema.safeParse({ ...base, themeId: 't1', newThemeName: 'New' }).success,
    ).toBe(false)
    expect(signalCreateSchema.safeParse({ ...base, themeId: 't1' }).success).toBe(true)
  })

  it('validates theme name length', () => {
    expect(themeCreateSchema.safeParse({ name: 'A' }).success).toBe(false)
    expect(themeCreateSchema.safeParse({ name: 'AB' }).success).toBe(true)
    expect(themeCreateSchema.safeParse({ name: 'x'.repeat(81) }).success).toBe(false)
  })

  it('enforces add_signals batch size 1–20', () => {
    const item = {
      quote: 'Valid quote text',
      summary: 'Summary',
      sourceType: 'customer_call' as const,
      sentiment: 'opportunity' as const,
      themeId: 't1',
    }
    expect(addSignalsMcpSchema.safeParse({ signals: [] }).success).toBe(false)
    expect(addSignalsMcpSchema.safeParse({ signals: [item] }).success).toBe(true)
    expect(
      addSignalsMcpSchema.safeParse({ signals: Array.from({ length: 21 }, () => item) }).success,
    ).toBe(false)
  })
})
