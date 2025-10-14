import { describe, it, expect } from 'vitest'
import { contactsRouter } from './contacts'

// Basic smoke tests to verify router structure
describe('contactsRouter', () => {
  it('should export a tRPC router', () => {
    expect(contactsRouter).toBeDefined()
    expect(typeof contactsRouter).toBe('object')
  })

  it('should have all required procedures', () => {
    expect(contactsRouter.list).toBeDefined()
    expect(contactsRouter.getById).toBeDefined()
    expect(contactsRouter.create).toBeDefined()
    expect(contactsRouter.update).toBeDefined()
    expect(contactsRouter.delete).toBeDefined()
    expect(contactsRouter.restore).toBeDefined()
  })

  it('should have proper procedure types', () => {
    // These are basic type checks - the actual functionality is tested via integration tests
    expect(typeof contactsRouter.list).toBe('function')
    expect(typeof contactsRouter.getById).toBe('function')
    expect(typeof contactsRouter.create).toBe('function')
    expect(typeof contactsRouter.update).toBe('function')
    expect(typeof contactsRouter.delete).toBe('function')
    expect(typeof contactsRouter.restore).toBe('function')
  })
})
