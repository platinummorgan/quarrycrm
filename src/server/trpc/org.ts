import { ensureUserOrg } from '@/server/ensure-user-org'

// Compatibility wrapper to match the requested API name
export async function ensureOrgForUser(userId: string) {
  return ensureUserOrg(userId)
}

export default ensureOrgForUser
