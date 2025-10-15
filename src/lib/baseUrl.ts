export function getBaseUrl() {
  // Vercel previews
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }

  // Production
  if (process.env.NODE_ENV === 'production') {
    return 'https://www.quarrycrm.com'
  }

  // Development
  return 'http://localhost:3000'
}