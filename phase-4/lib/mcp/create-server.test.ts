import { describe, expect, it } from 'vitest'
import { createSignalOsMcpServer } from './create-server'

describe('createSignalOsMcpServer', () => {
  it('constructs without throwing', () => {
    expect(() => createSignalOsMcpServer()).not.toThrow()
  })
})
