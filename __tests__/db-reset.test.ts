import { it, expect } from 'vitest'

it('db reset helper exists', async () => {
  // @ts-ignore
  expect(typeof globalThis.__dbReset).toBe('function')
  // @ts-ignore
  await globalThis.__dbReset()
})
