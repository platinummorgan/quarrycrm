/**
 * @vitest-environment jsdom
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { ContactQueryHandler } from '@/components/contacts/ContactQueryHandler'
import { DealsQueryHandler } from '@/components/deals/DealsQueryHandler'

// Mock next/navigation
let mockUseSearchParams: ReturnType<typeof vi.fn>

vi.mock('next/navigation', () => ({
  useSearchParams: () => mockUseSearchParams(),
}))

describe('Query Parameter Routing', () => {
  beforeEach(() => {
    mockUseSearchParams = vi.fn()

    // Mock custom events
    vi.spyOn(window, 'dispatchEvent')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('ContactQueryHandler', () => {
    it('should dispatch contact:select event when open param is present', async () => {
      const mockContactId = 'contact-123'
      mockUseSearchParams.mockReturnValue({
        get: (key: string) => (key === 'open' ? mockContactId : null),
      })

      render(<ContactQueryHandler />)

      await waitFor(
        () => {
          expect(window.dispatchEvent).toHaveBeenCalled()
        },
        { timeout: 200 }
      )

      const dispatchCalls = (window.dispatchEvent as any).mock.calls
      const contactSelectEvent = dispatchCalls.find(
        (call: any) => call[0].type === 'contact:select'
      )

      expect(contactSelectEvent).toBeDefined()
      expect(contactSelectEvent[0].detail.contactId).toBe(mockContactId)
    })

    it('should not dispatch event when open param is missing', async () => {
      mockUseSearchParams.mockReturnValue({
        get: () => null,
      })

      render(<ContactQueryHandler />)

      await new Promise((resolve) => setTimeout(resolve, 150))

      const dispatchCalls = (window.dispatchEvent as any).mock.calls
      const contactSelectEvents = dispatchCalls.filter(
        (call: any) => call[0].type === 'contact:select'
      )

      expect(contactSelectEvents.length).toBe(0)
    })

    it('should handle null searchParams gracefully', () => {
      mockUseSearchParams.mockReturnValue(null)

      expect(() => {
        render(<ContactQueryHandler />)
      }).not.toThrow()
    })

    it('should re-trigger on searchParams change', async () => {
      const firstContactId = 'contact-1'
      const secondContactId = 'contact-2'

      mockUseSearchParams.mockReturnValue({
        get: (key: string) => (key === 'open' ? firstContactId : null),
      })

      const { rerender } = render(<ContactQueryHandler />)

      await waitFor(
        () => {
          expect(window.dispatchEvent).toHaveBeenCalled()
        },
        { timeout: 200 }
      )

      const firstCallCount = (window.dispatchEvent as any).mock.calls.length

      // Change searchParams
      mockUseSearchParams.mockReturnValue({
        get: (key: string) => (key === 'open' ? secondContactId : null),
      })

      rerender(<ContactQueryHandler />)

      await waitFor(
        () => {
          const newCallCount = (window.dispatchEvent as any).mock.calls.length
          expect(newCallCount).toBeGreaterThan(firstCallCount)
        },
        { timeout: 200 }
      )
    })
  })

  describe('DealsQueryHandler', () => {
    it('should call onPipelineChange when pipeline param is present', async () => {
      const mockPipelineId = 'pipeline-123'
      const mockOnPipelineChange = vi.fn()

      mockUseSearchParams.mockReturnValue({
        get: (key: string) => (key === 'pipeline' ? mockPipelineId : null),
      })

      render(<DealsQueryHandler onPipelineChange={mockOnPipelineChange} />)

      await waitFor(
        () => {
          expect(mockOnPipelineChange).toHaveBeenCalledWith(mockPipelineId)
        },
        { timeout: 300 }
      )
    })

    it('should call onDealFocus when focus param is present', async () => {
      const mockDealId = 'deal-456'
      const mockOnDealFocus = vi.fn()

      mockUseSearchParams.mockReturnValue({
        get: (key: string) => (key === 'focus' ? mockDealId : null),
      })

      render(<DealsQueryHandler onDealFocus={mockOnDealFocus} />)

      // Total delay: 200ms initial + 100ms for focus (no pipeline)
      await waitFor(
        () => {
          expect(mockOnDealFocus).toHaveBeenCalledWith(mockDealId)
        },
        { timeout: 400 }
      )
    })

    it('should handle both pipeline and focus params together', async () => {
      const mockPipelineId = 'pipeline-123'
      const mockDealId = 'deal-456'
      const mockOnPipelineChange = vi.fn()
      const mockOnDealFocus = vi.fn()

      mockUseSearchParams.mockReturnValue({
        get: (key: string) => {
          if (key === 'pipeline') return mockPipelineId
          if (key === 'focus') return mockDealId
          return null
        },
      })

      render(
        <DealsQueryHandler
          onPipelineChange={mockOnPipelineChange}
          onDealFocus={mockOnDealFocus}
        />
      )

      await waitFor(
        () => {
          expect(mockOnPipelineChange).toHaveBeenCalledWith(mockPipelineId)
        },
        { timeout: 300 }
      )

      // Focus should be called after pipeline with longer delay
      await waitFor(
        () => {
          expect(mockOnDealFocus).toHaveBeenCalledWith(mockDealId)
        },
        { timeout: 800 }
      )
    })

    it('should attempt to scroll deal card into view', async () => {
      const mockDealId = 'deal-789'
      const mockScrollIntoView = vi.fn()
      const mockElement = {
        scrollIntoView: mockScrollIntoView,
      }

      // Mock querySelector to return our mock element
      vi.spyOn(document, 'querySelector').mockReturnValue(mockElement as any)

      mockUseSearchParams.mockReturnValue({
        get: (key: string) => (key === 'focus' ? mockDealId : null),
      })

      render(<DealsQueryHandler onDealFocus={vi.fn()} />)

      await waitFor(
        () => {
          expect(document.querySelector).toHaveBeenCalledWith(
            `[data-deal-id="${mockDealId}"]`
          )
        },
        { timeout: 400 }
      )

      await waitFor(
        () => {
          expect(mockScrollIntoView).toHaveBeenCalledWith({
            behavior: 'smooth',
            block: 'center',
          })
        },
        { timeout: 400 }
      )
    })

    it('should handle missing element gracefully', async () => {
      const mockDealId = 'nonexistent-deal'

      vi.spyOn(document, 'querySelector').mockReturnValue(null)

      mockUseSearchParams.mockReturnValue({
        get: (key: string) => (key === 'focus' ? mockDealId : null),
      })

      expect(() => {
        render(<DealsQueryHandler onDealFocus={vi.fn()} />)
      }).not.toThrow()

      await new Promise((resolve) => setTimeout(resolve, 400))
    })

    it('should not call handlers when params are missing', async () => {
      const mockOnPipelineChange = vi.fn()
      const mockOnDealFocus = vi.fn()

      mockUseSearchParams.mockReturnValue({
        get: () => null,
      })

      render(
        <DealsQueryHandler
          onPipelineChange={mockOnPipelineChange}
          onDealFocus={mockOnDealFocus}
        />
      )

      await new Promise((resolve) => setTimeout(resolve, 800))

      expect(mockOnPipelineChange).not.toHaveBeenCalled()
      expect(mockOnDealFocus).not.toHaveBeenCalled()
    })

    it('should handle null searchParams gracefully', () => {
      mockUseSearchParams.mockReturnValue(null)

      expect(() => {
        render(
          <DealsQueryHandler onPipelineChange={vi.fn()} onDealFocus={vi.fn()} />
        )
      }).not.toThrow()
    })
  })

  describe('URL formats', () => {
    it('should document correct contact URL format', () => {
      const contactId = 'cm123abc'
      const expectedUrl = `/app/contacts?open=${contactId}`

      expect(expectedUrl).toMatch(/^\/app\/contacts\?open=/)
      expect(expectedUrl).toContain(contactId)
    })

    it('should document correct deal URL format with focus only', () => {
      const dealId = 'deal123'
      const expectedUrl = `/app/deals?focus=${dealId}`

      expect(expectedUrl).toMatch(/^\/app\/deals\?focus=/)
      expect(expectedUrl).toContain(dealId)
    })

    it('should document correct deal URL format with pipeline and focus', () => {
      const pipelineId = 'pipeline456'
      const dealId = 'deal789'
      const expectedUrl = `/app/deals?pipeline=${pipelineId}&focus=${dealId}`

      expect(expectedUrl).toMatch(/^\/app\/deals\?pipeline=/)
      expect(expectedUrl).toContain(`pipeline=${pipelineId}`)
      expect(expectedUrl).toContain(`&focus=${dealId}`)
    })
  })
})
