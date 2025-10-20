// @vitest-environment jsdom
import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Board } from '@/components/deals/Board'
import type { DealsListResponse, PipelinesListResponse } from '@/lib/zod/deals'

// Mock next-auth session so components using useSession don't throw
vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      user: { id: 'u1', name: 'Test' },
      expires: new Date(Date.now() + 3600e3).toISOString(),
    },
    status: 'authenticated',
  }),
}))

describe('Deals Board', () => {
  const mockDeals: DealsListResponse = {
    items: [],
    nextCursor: null,
    hasMore: false,
    total: 0,
  }

  const mockPipelines: PipelinesListResponse = []
  // Provide a minimal pipeline with stages so the board shows expected columns
  mockPipelines.push({
    id: 'p1',
    name: 'Default',
    description: null,
    isDefault: true,
    stages: [
      { id: 's1', name: 'Lead', order: 1, color: null, _count: { deals: 0 } },
      {
        id: 's2',
        name: 'Qualified',
        order: 2,
        color: null,
        _count: { deals: 0 },
      },
      {
        id: 's3',
        name: 'Proposal',
        order: 3,
        color: null,
        _count: { deals: 0 },
      },
    ],
  })

  it('shows columns with Create first deal CTA when no pipeline selected', () => {
    render(<Board initialDeals={mockDeals} initialPipelines={mockPipelines} />)

    // Current UI shows an empty-board state when there are no deals
    expect(screen.getByText('No deals yet')).toBeInTheDocument()
    // Should show Create first deal button
    expect(screen.getByText('Create first deal')).toBeInTheDocument()
  })
})
