import { describe, test, expect } from 'vitest'
import { prisma } from '@/lib/prisma'

describe('Database Reset - Smoke Test', () => {
  test('reset clears rows', async () => {
    await __dbReset()
    await prisma.organization.create({ data: { id: 'org1', name: 'O1' } })
    let count = await prisma.organization.count()
    expect(count).toBe(1)
    await __dbReset()
    count = await prisma.organization.count()
    expect(count).toBe(0)
  })
})
