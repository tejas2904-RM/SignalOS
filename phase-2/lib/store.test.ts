import { beforeEach, describe, expect, it } from 'vitest'
import { THEME_NAMES } from './seed'
import {
  __resetMemoryStore,
  addSignalsBatch,
  getComputedState,
  resetDemo,
} from './store'

describe('store (memory)', () => {
  beforeEach(() => {
    __resetMemoryStore()
  })

  it('auto-seeds and reports GST as weak', async () => {
    const state = await getComputedState()
    const gst = state.themes.find((t) => t.name === THEME_NAMES.gst)
    expect(gst?.status).toBe('weak')
    expect(state.themes).toHaveLength(5)
  })

  it('flips GST weak → emerging after two customer_call signals', async () => {
    await resetDemo()
    const state = await getComputedState()
    const gst = state.themes.find((t) => t.name === THEME_NAMES.gst)!
    expect(gst.status).toBe('weak')

    const result = await addSignalsBatch(
      [
        {
          themeId: gst.id,
          quote: 'We lose GST input credit when vendor invoices go missing.',
          summary: 'Lost ITC from missing invoices',
          sourceType: 'customer_call',
          sentiment: 'opportunity',
          observedAt: new Date().toISOString(),
        },
        {
          themeId: gst.id,
          quote: 'Finance managers chase vendors every month for GST invoices.',
          summary: 'Manual invoice chase',
          sourceType: 'customer_call',
          sentiment: 'opportunity',
          observedAt: new Date().toISOString(),
        },
      ],
      'claude',
    )

    const updated = result.state.themes.find((t) => t.id === gst.id)!
    expect(updated.status).toBe('emerging')
    expect(result.statusChanges.some((c) => c.from === 'weak' && c.to === 'emerging')).toBe(
      true,
    )
  })
})
