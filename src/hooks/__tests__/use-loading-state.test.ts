import { describe, it, expect } from 'vitest'
import { DEFAULT_LOADING_TIMEOUT } from '../use-loading-state'

describe('use-loading-state defaults', () => {
  it('exports DEFAULT_LOADING_TIMEOUT of 2000ms', () => {
    expect(DEFAULT_LOADING_TIMEOUT).toBe(2000)
  })
})
