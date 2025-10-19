export interface SEOMetadata {
  title: string
  description: string
  path: string
  image?: string
}

export interface SEOProps {
  title: string
  description: string
  keywords?: string[]
  canonical: string
  openGraph: {
    title: string
    description: string
    url: string
    siteName: string
    images: Array<{
      url: string
      width: number
      height: number
      alt: string
    }>
    locale: string
    type: 'website'
  }
  twitter: {
    card: 'summary_large_image'
    title: string
    description: string
    images: string[]
    creator?: string
  }
  robots: {
    index: boolean
    follow: boolean
    googleBot: {
      index: boolean
      follow: boolean
      'max-video-preview': number
      'max-image-preview': 'large'
      'max-snippet': number
    }
  }
  alternates: {
    canonical: string
  }
}

/**
 * Generate comprehensive SEO metadata for pages
 * @param metadata - SEO metadata object
 * @returns Next.js metadata export props
 */
export function makeSEO(metadata: SEOMetadata): SEOProps {
  const { title, description, path, image } = metadata

  // Base URL - fallback to localhost for development
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  // Full URL for the page
  const url = `${baseUrl}${path}`

  // Default OG image - placeholder
  const ogImage = image || `${baseUrl}/og-image.png`

  // Site name
  const siteName = 'Quarry CRM'

  // Check if we're in production for robots settings
  const isProduction = process.env.NEXT_PUBLIC_APP_ENV === 'prod'

  return {
    title,
    description,
    keywords: [
      'CRM',
      'customer relationship management',
      'contacts',
      'companies',
      'deals',
      'sales',
      'business',
      'offline',
      'PWA',
      'progressive web app',
    ],
    canonical: url,
    openGraph: {
      title,
      description,
      url,
      siteName,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `${title} - ${siteName}`,
        },
      ],
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
      creator: '@quarrycrm',
    },
    robots: {
      index: isProduction,
      follow: isProduction,
      googleBot: {
        index: isProduction,
        follow: isProduction,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    alternates: {
      canonical: url,
    },
  }
}
