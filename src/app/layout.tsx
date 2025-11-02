import { Metadata } from 'next'
import { Inter } from 'next/font/google'
import React from 'react'
import './globals.css'
import { TRPCProvider } from '@/components/providers/trpc-provider'
import { ThemeProvider } from 'next-themes'
import { SessionProvider } from '@/components/providers/session-provider'
import { ToastProvider } from '@/components/ui/ToastProvider'
import { PreviewBanner } from '@/components/PreviewBanner'
import { DebugHeaderPill } from '@/components/DebugHeaderPill'
import dynamic from 'next/dynamic'

// Dynamically import components that use useSession to avoid SSR issues
const DemoBanner = dynamic(() => import('@/components/DemoBanner').then(m => ({ default: m.DemoBanner })), { ssr: false })
const DemoTour = dynamic(() => import('@/components/demo/Tour').then(m => ({ default: m.DemoTour })), { ssr: false })

const inter = Inter({ subsets: ['latin'] })

export async function generateMetadata(): Promise<Metadata> {
  const isPreview = process.env.NEXT_PUBLIC_APP_ENV === 'preview'

  // Note: Demo subdomain robots handling is done via middleware X-Robots-Tag header
  // This ensures proper SEO exclusion regardless of metadata cache

  return {
    title: 'Quarry CRM - Modern CRM for the Browser Era',
    description:
      'Manage your contacts, companies, and leads with a fast, offline-capable CRM that works seamlessly across all your devices. Progressive Web App with offline support.',
    manifest: '/manifest.json',
    keywords:
      'CRM,customer relationship management,contacts,companies,leads,sales,business,offline,PWA,progressive web app',
    robots: isPreview ? 'noindex, nofollow' : 'index, follow',
    openGraph: {
      title: 'Quarry CRM - Modern CRM for the Browser Era',
      description:
        'Manage your contacts, companies, and leads with a fast, offline-capable CRM that works seamlessly across all your devices. Progressive Web App with offline support.',
      url: 'http://localhost:3000',
      siteName: 'Quarry CRM',
      locale: 'en_US',
      images: [
        {
          url: 'http://localhost:3000/og-image.png',
          width: 1200,
          height: 630,
          alt: 'Quarry CRM - Modern CRM for the Browser Era - Quarry CRM',
        },
      ],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      creator: '@quarrycrm',
      title: 'Quarry CRM - Modern CRM for the Browser Era',
      description:
        'Manage your contacts, companies, and leads with a fast, offline-capable CRM that works seamlessly across all your devices. Progressive Web App with offline support.',
      images: ['http://localhost:3000/og-image.png'],
    },
    alternates: {
      canonical: 'http://localhost:3000',
    },
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
      </head>
      <body className={inter.className}>
        <PreviewBanner />
        <DebugHeaderPill />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SessionProvider>
            <TRPCProvider>
              <ToastProvider>
                <DemoBanner />
                {children}
                <DemoTour />
              </ToastProvider>
            </TRPCProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
