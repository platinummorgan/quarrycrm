import { checkOnboardingProgress } from '@/server/onboarding'
import { OnboardingProgress } from '@/components/onboarding/OnboardingProgress'

export async function OnboardingProgressServer() {
  try {
    const state = await checkOnboardingProgress()
    if (!state) return null
    return <OnboardingProgress state={state} />
  } catch (err) {
    // Log and swallow errors so the header doesn't crash the whole app render
    console.error('OnboardingProgressServer failed:', err)
    return null
  }
}
