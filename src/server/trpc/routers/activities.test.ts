import { describe, it, expect } from 'vitest'
import { activitiesRouter } from './activities'

// Basic smoke tests to verify router structure
describe('activitiesRouter', () => {
  it('should export a tRPC router', () => {
    expect(activitiesRouter).toBeDefined()
    expect(typeof activitiesRouter).toBe('object')
  })

  it('should have all required procedures', () => {
    expect(activitiesRouter.list).toBeDefined()
    expect(activitiesRouter.getById).toBeDefined()
    expect(activitiesRouter.create).toBeDefined()
    expect(activitiesRouter.update).toBeDefined()
    expect(activitiesRouter.delete).toBeDefined()
    expect(activitiesRouter.restore).toBeDefined()
  })

  it('should have proper procedure types', () => {
    // These are basic type checks - the actual functionality is tested via integration tests
    expect(typeof activitiesRouter.list).toBe('function')
    expect(typeof activitiesRouter.getById).toBe('function')
    expect(typeof activitiesRouter.create).toBe('function')
    expect(typeof activitiesRouter.update).toBe('function')
    expect(typeof activitiesRouter.delete).toBe('function')
    expect(typeof activitiesRouter.restore).toBe('function')
  })
})
