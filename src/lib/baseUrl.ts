export const getBaseUrl = (): string =>
  process.env.NEXTAUTH_URL ??
  (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000')

// Notes:
// - Prefer NEXTAUTH_URL when explicitly set (used by NextAuth and many providers)
// - Fall back to VERCEL_URL (preview/production on Vercel) with https:// prefix
// - Default to http://localhost:3000 for local development
