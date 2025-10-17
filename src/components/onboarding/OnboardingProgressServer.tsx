import { checkOnboardingProgress } from '@/server/onboarding'
import { OnboardingProgress } from '@/components/onboarding/OnboardingProgress'

export async function OnboardingProgressServer() {
  const state = await checkOnboardingProgress()
  
  if (!state) {
    return null
  }
  
  return <OnboardingProgress state={state} />
}
