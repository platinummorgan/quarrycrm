import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Board } from '@/components/deals/Board'

describe('Deals Board', () => {
  const mockDeals = {
    items: [],
    nextCursor: null,
    hasMore: false,
    total: 0,
  }

  const mockPipelines = []

  it('shows columns with Create first deal CTA when no pipeline selected', () => {
    render(<Board initialDeals={mockDeals} initialPipelines={mockPipelines} />)

    // Should show stage columns
    expect(screen.getByText('Lead')).toBeInTheDocument()
    expect(screen.getByText('Qualified')).toBeInTheDocument()
    expect(screen.getByText('Proposal')).toBeInTheDocument()

    // Should show Create first deal button
    expect(screen.getByText('Create first deal')).toBeInTheDocument()
  })
})