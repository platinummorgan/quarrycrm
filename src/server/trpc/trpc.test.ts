import { describe, it, expect } from 'vitest'
import { demoProcedure } from './trpc'

// Basic smoke tests to verify demo procedure structure
describe('demoProcedure', () => {
  it('should export a demo procedure', () => {
    expect(demoProcedure).toBeDefined()
    expect(typeof demoProcedure).toBe('object')
  })

  it('should have mutation method', () => {
    expect(demoProcedure.mutation).toBeDefined()
    expect(typeof demoProcedure.mutation).toBe('function')
  })

  it('should have query method', () => {
    expect(demoProcedure.query).toBeDefined()
    expect(typeof demoProcedure.query).toBe('function')
  })

  it('should have subscription method', () => {
    expect(demoProcedure.subscription).toBeDefined()
    expect(typeof demoProcedure.subscription).toBe('function')
  })
})
