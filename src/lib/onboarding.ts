/**
 * Onboarding Checklist Types
 * Tracks user progress through key setup tasks
 */

export type OnboardingTaskType =
  | 'create_pipeline'
  | 'import_csv'
  | 'create_deal'
  | 'save_view'
  | 'install_pwa'

export interface OnboardingTask {
  id: OnboardingTaskType
  title: string
  description: string
  completed: boolean
  icon: string
  href?: string
  action?: string
}

export interface OnboardingProgress {
  create_pipeline: boolean
  import_csv: boolean
  create_deal: boolean
  save_view: boolean
  install_pwa: boolean
}

export interface OnboardingState {
  dismissed: boolean
  completed: boolean
  progress: OnboardingProgress
  completedCount: number
  totalCount: number
  percentage: number
}

export const ONBOARDING_TASKS: Omit<OnboardingTask, 'completed'>[] = [
  {
    id: 'create_pipeline',
    title: 'Create a pipeline',
    description: 'Set up your first sales pipeline',
    icon: '🎯',
    href: '/app/deals',
  },
  {
    id: 'import_csv',
    title: 'Import sample contacts',
    description: 'Try importing our 10-row sample CSV',
    icon: '📥',
    href: '/csv',
  },
  {
    id: 'create_deal',
    title: 'Create your first deal',
    description: 'Add a deal to your pipeline',
    icon: '💼',
    href: '/app/deals',
  },
  {
    id: 'save_view',
    title: 'Save a custom view',
    description: 'Save a filtered view of your contacts',
    icon: '👁️',
    href: '/app/contacts',
  },
  {
    id: 'install_pwa',
    title: 'Install as app',
    description: 'Get quick access from your desktop',
    icon: '📱',
    action: 'installPWA',
  },
]

export function calculateOnboardingState(
  dismissed: boolean,
  progress: Partial<OnboardingProgress> | null
): OnboardingState {
  const defaultProgress: OnboardingProgress = {
    create_pipeline: false,
    import_csv: false,
    create_deal: false,
    save_view: false,
    install_pwa: false,
  }

  const currentProgress = {
    ...defaultProgress,
    ...(progress || {}),
  }

  const completedTasks = Object.values(currentProgress).filter(Boolean).length
  const totalTasks = Object.keys(defaultProgress).length
  const percentage = Math.round((completedTasks / totalTasks) * 100)
  const completed = completedTasks === totalTasks

  return {
    dismissed,
    completed,
    progress: currentProgress,
    completedCount: completedTasks,
    totalCount: totalTasks,
    percentage,
  }
}
