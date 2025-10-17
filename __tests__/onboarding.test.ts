import { describe, it, expect } from 'vitest'
import { calculateOnboardingState, ONBOARDING_TASKS, type OnboardingProgress } from '@/lib/onboarding'

describe('Onboarding Checklist', () => {
  describe('calculateOnboardingState', () => {
    it('should calculate 0% progress when nothing is complete', () => {
      const progress: OnboardingProgress = {
        create_pipeline: false,
        import_csv: false,
        create_deal: false,
        save_view: false,
        install_pwa: false,
      }

      const state = calculateOnboardingState(false, progress)

      expect(state.completedCount).toBe(0)
      expect(state.totalCount).toBe(5)
      expect(state.percentage).toBe(0)
      expect(state.completed).toBe(false)
    })

    it('should calculate 20% progress when 1 task is complete', () => {
      const progress: OnboardingProgress = {
        create_pipeline: true,
        import_csv: false,
        create_deal: false,
        save_view: false,
        install_pwa: false,
      }

      const state = calculateOnboardingState(false, progress)

      expect(state.completedCount).toBe(1)
      expect(state.percentage).toBe(20)
      expect(state.completed).toBe(false)
    })

    it('should calculate 60% progress when 3 tasks are complete', () => {
      const progress: OnboardingProgress = {
        create_pipeline: true,
        import_csv: true,
        create_deal: true,
        save_view: false,
        install_pwa: false,
      }

      const state = calculateOnboardingState(false, progress)

      expect(state.completedCount).toBe(3)
      expect(state.percentage).toBe(60)
      expect(state.completed).toBe(false)
    })

    it('should mark as completed when all tasks are done', () => {
      const progress: OnboardingProgress = {
        create_pipeline: true,
        import_csv: true,
        create_deal: true,
        save_view: true,
        install_pwa: true,
      }

      const state = calculateOnboardingState(false, progress)

      expect(state.completedCount).toBe(5)
      expect(state.totalCount).toBe(5)
      expect(state.percentage).toBe(100)
      expect(state.completed).toBe(true)
    })

    it('should handle null progress gracefully', () => {
      const state = calculateOnboardingState(false, null)

      expect(state.completedCount).toBe(0)
      expect(state.totalCount).toBe(5)
      expect(state.percentage).toBe(0)
      expect(state.completed).toBe(false)
    })

    it('should handle partial progress object', () => {
      const partialProgress = {
        create_pipeline: true,
        import_csv: true,
      }

      const state = calculateOnboardingState(false, partialProgress as Partial<OnboardingProgress>)

      expect(state.completedCount).toBe(2)
      expect(state.percentage).toBe(40)
      expect(state.progress.create_pipeline).toBe(true)
      expect(state.progress.import_csv).toBe(true)
      expect(state.progress.create_deal).toBe(false)
    })

    it('should respect dismissed flag', () => {
      const progress: OnboardingProgress = {
        create_pipeline: false,
        import_csv: false,
        create_deal: false,
        save_view: false,
        install_pwa: false,
      }

      const state = calculateOnboardingState(true, progress)

      expect(state.dismissed).toBe(true)
      expect(state.completedCount).toBe(0)
    })

    it('should handle edge case of completed but dismissed', () => {
      const progress: OnboardingProgress = {
        create_pipeline: true,
        import_csv: true,
        create_deal: true,
        save_view: true,
        install_pwa: true,
      }

      const state = calculateOnboardingState(true, progress)

      expect(state.dismissed).toBe(true)
      expect(state.completed).toBe(true)
      expect(state.percentage).toBe(100)
    })
  })

  describe('Task Definitions', () => {
    it('should have 5 tasks defined', () => {
      expect(ONBOARDING_TASKS).toHaveLength(5)
    })

    it('should have unique task IDs', () => {
      const ids = ONBOARDING_TASKS.map((task: any) => task.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ids.length)
    })

    it('should have all required task properties', () => {
      ONBOARDING_TASKS.forEach((task: any) => {
        expect(task).toHaveProperty('id')
        expect(task).toHaveProperty('title')
        expect(task).toHaveProperty('description')
        expect(task).toHaveProperty('icon')
        // href OR action should be present
        expect(task.href || task.action).toBeTruthy()
      })
    })

    it('should have correct task IDs in order', () => {
      const ids = ONBOARDING_TASKS.map((task: any) => task.id)
      expect(ids).toEqual([
        'create_pipeline',
        'import_csv',
        'create_deal',
        'save_view',
        'install_pwa',
      ])
    })
  })

  describe('Progress Tracking', () => {
    it('should track progress incrementally', () => {
      const states = []
      
      // Start with nothing complete
      let progress: Partial<OnboardingProgress> = {}
      states.push(calculateOnboardingState(false, progress))

      // Complete each task one by one
      progress = { ...progress, create_pipeline: true }
      states.push(calculateOnboardingState(false, progress))

      progress = { ...progress, import_csv: true }
      states.push(calculateOnboardingState(false, progress))

      progress = { ...progress, create_deal: true }
      states.push(calculateOnboardingState(false, progress))

      progress = { ...progress, save_view: true }
      states.push(calculateOnboardingState(false, progress))

      progress = { ...progress, install_pwa: true }
      states.push(calculateOnboardingState(false, progress))

      // Verify progression
      expect(states[0].percentage).toBe(0)
      expect(states[1].percentage).toBe(20)
      expect(states[2].percentage).toBe(40)
      expect(states[3].percentage).toBe(60)
      expect(states[4].percentage).toBe(80)
      expect(states[5].percentage).toBe(100)

      expect(states[5].completed).toBe(true)
    })

    it('should handle tasks completed in any order', () => {
      const progress: OnboardingProgress = {
        create_pipeline: false,
        import_csv: true,
        create_deal: false,
        save_view: true,
        install_pwa: true,
      }

      const state = calculateOnboardingState(false, progress)

      expect(state.completedCount).toBe(3)
      expect(state.percentage).toBe(60)
      expect(state.completed).toBe(false)
    })
  })
})
