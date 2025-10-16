'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { X, ArrowRight, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const TOUR_STORAGE_KEY = 'quarry-demo-tour-completed'

interface TourStep {
  id: string
  title: string
  description: string
  selector: string
  position: 'top' | 'bottom' | 'left' | 'right'
  highlightPadding?: number
  actionUrl?: string // Optional deep link to demonstrate the feature
  actionLabel?: string // Label for the action button
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'contacts-search',
    title: 'Search Contacts',
    description: 'Use the search bar to quickly find contacts by name, email, or company. Try typing to see instant results.',
    selector: '[data-tour="contacts-search"]',
    position: 'bottom',
    highlightPadding: 8,
  },
  {
    id: 'open-drawer',
    title: 'Contact Details',
    description: 'Click any contact row to open the detail drawer and view full information, activities, and edit details. You can also use deep links like /app/contacts?open=<contactId> to link directly to a contact.',
    selector: '[data-tour="contact-row"]',
    position: 'left',
    highlightPadding: 4,
  },
  {
    id: 'deals-board',
    title: 'Deals Pipeline',
    description: 'Navigate to Deals to see your sales pipeline. Drag and drop deals between stages to track progress. Use /app/deals?focus=<dealId> to link to specific deals.',
    selector: '[data-tour="deals-nav"]',
    position: 'bottom',
    highlightPadding: 8,
  },
  {
    id: 'saved-views',
    title: 'Saved Views',
    description: 'Create custom views with filters and columns. Save them for quick access to your most important data.',
    selector: '[data-tour="saved-views"]',
    position: 'bottom',
    highlightPadding: 8,
  },
  {
    id: 'offline-banner',
    title: 'Works Offline',
    description: 'This CRM works offline! Your data syncs automatically when you\'re back online. Try disconnecting to see it in action.',
    selector: '[data-tour="offline-indicator"]',
    position: 'bottom',
    highlightPadding: 8,
  },
]

export function DemoTour() {
  const { data: session } = useSession()
  const [isActive, setIsActive] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 })

  const isDemo = session?.user?.isDemo || session?.user?.currentOrg?.role === 'DEMO'

  // Check if tour should be shown
  useEffect(() => {
    if (!isDemo) return

    // Check if tour was already completed
    const completed = localStorage.getItem(TOUR_STORAGE_KEY)
    if (completed) return

    // Wait a bit for the page to load, then start tour
    const timer = setTimeout(() => {
      setIsActive(true)
      updateHighlight()
    }, 1000)

    return () => clearTimeout(timer)
  }, [isDemo])

  // Update highlight when step changes
  useEffect(() => {
    if (isActive) {
      updateHighlight()
    }
  }, [currentStep, isActive])

  // Update highlight on window resize
  useEffect(() => {
    if (!isActive) return

    const handleResize = () => updateHighlight()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [isActive, currentStep])

  const updateHighlight = () => {
    const step = TOUR_STEPS[currentStep]
    if (!step) return

    // Try to find the element
    const element = document.querySelector(step.selector)
    if (!element) {
      // Element not found, try again in a bit
      setTimeout(updateHighlight, 500)
      return
    }

    const rect = element.getBoundingClientRect()
    setHighlightRect(rect)

    // Calculate tooltip position based on step position
    const padding = 16
    const tooltipWidth = 320
    const tooltipHeight = 200 // approximate

    let top = 0
    let left = 0

    switch (step.position) {
      case 'bottom':
        top = rect.bottom + padding
        left = rect.left + rect.width / 2 - tooltipWidth / 2
        break
      case 'top':
        top = rect.top - tooltipHeight - padding
        left = rect.left + rect.width / 2 - tooltipWidth / 2
        break
      case 'left':
        top = rect.top + rect.height / 2 - tooltipHeight / 2
        left = rect.left - tooltipWidth - padding
        break
      case 'right':
        top = rect.top + rect.height / 2 - tooltipHeight / 2
        left = rect.right + padding
        break
    }

    // Keep tooltip on screen
    const maxLeft = window.innerWidth - tooltipWidth - 16
    const maxTop = window.innerHeight - tooltipHeight - 16
    left = Math.max(16, Math.min(left, maxLeft))
    top = Math.max(16, Math.min(top, maxTop))

    setTooltipPosition({ top, left })
  }

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      completeTour()
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const completeTour = () => {
    localStorage.setItem(TOUR_STORAGE_KEY, 'true')
    setIsActive(false)
    setHighlightRect(null)
  }

  const handleSkip = () => {
    completeTour()
  }

  if (!isActive || !isDemo) return null

  const step = TOUR_STEPS[currentStep]
  const padding = step.highlightPadding || 8

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/60 z-[9998] transition-opacity"
        onClick={handleSkip}
      />

      {/* Highlight cutout */}
      {highlightRect && (
        <>
          {/* Top mask */}
          <div
            className="fixed bg-transparent z-[9999] pointer-events-none"
            style={{
              top: 0,
              left: 0,
              right: 0,
              height: highlightRect.top - padding,
            }}
          />
          {/* Bottom mask */}
          <div
            className="fixed bg-transparent z-[9999] pointer-events-none"
            style={{
              top: highlightRect.bottom + padding,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />
          {/* Left mask */}
          <div
            className="fixed bg-transparent z-[9999] pointer-events-none"
            style={{
              top: highlightRect.top - padding,
              left: 0,
              width: highlightRect.left - padding,
              height: highlightRect.height + padding * 2,
            }}
          />
          {/* Right mask */}
          <div
            className="fixed bg-transparent z-[9999] pointer-events-none"
            style={{
              top: highlightRect.top - padding,
              left: highlightRect.right + padding,
              right: 0,
              height: highlightRect.height + padding * 2,
            }}
          />

          {/* Highlight border */}
          <div
            className="fixed border-2 border-blue-500 rounded-lg z-[9999] pointer-events-none shadow-xl transition-all duration-300"
            style={{
              top: highlightRect.top - padding,
              left: highlightRect.left - padding,
              width: highlightRect.width + padding * 2,
              height: highlightRect.height + padding * 2,
            }}
          />

          {/* Pulsing ring effect */}
          <div
            className="fixed border-2 border-blue-400 rounded-lg z-[9999] pointer-events-none animate-ping"
            style={{
              top: highlightRect.top - padding,
              left: highlightRect.left - padding,
              width: highlightRect.width + padding * 2,
              height: highlightRect.height + padding * 2,
              animationDuration: '2s',
            }}
          />
        </>
      )}

      {/* Tooltip */}
      <div
        className="fixed z-[10000] bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 p-6 max-w-sm transition-all duration-300"
        style={{
          top: tooltipPosition.top,
          left: tooltipPosition.left,
        }}
      >
        {/* Close button */}
        <button
          onClick={handleSkip}
          className="absolute top-2 right-2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          aria-label="Close tour"
        >
          <X className="h-4 w-4 text-gray-500" />
        </button>

        {/* Step indicator */}
        <div className="flex items-center space-x-1 mb-3">
          {TOUR_STEPS.map((_, index) => (
            <div
              key={index}
              className={cn(
                'h-1.5 rounded-full transition-all',
                index === currentStep
                  ? 'bg-blue-500 w-8'
                  : index < currentStep
                  ? 'bg-blue-300 w-1.5'
                  : 'bg-gray-300 dark:bg-gray-600 w-1.5'
              )}
            />
          ))}
        </div>

        {/* Content */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {step.title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {step.description}
          </p>
        </div>

        {/* Progress counter */}
        <div className="text-xs text-gray-500 dark:text-gray-500 mb-4">
          Step {currentStep + 1} of {TOUR_STEPS.length}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkip}
            className="text-gray-600 dark:text-gray-400"
          >
            Skip tour
          </Button>

          <div className="flex space-x-2">
            {currentStep > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrev}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleNext}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {currentStep === TOUR_STEPS.length - 1 ? (
                'Finish'
              ) : (
                <>
                  Next
                  <ArrowRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

/**
 * Hook to manually restart the tour
 */
export function useRestartTour() {
  const restartTour = () => {
    localStorage.removeItem(TOUR_STORAGE_KEY)
    window.location.reload()
  }

  return { restartTour }
}
