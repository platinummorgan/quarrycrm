import { Metadata } from 'next'
import { Inter } from 'next/font/google'
import React from 'react'
import './globals.css'
import { TRPCProvider } from '@/components/providers/trpc-provider'
import { ThemeProvider } from 'next-themes'
import { SessionProvider } from '@/components/providers/session-provider'
import { ToastProvider } from '@/components/ui/ToastProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Quarry-CRM',
  description: 'A modern, browser-first CRM application',
  manifest: '/manifest.json',
  themeColor: '#000000',
  viewport: 'width=device-width, initial-scale=1',
  robots: 'noindex, nofollow',
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
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </head>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SessionProvider>
            <TRPCProvider>
              <ToastProvider>
                {children}
              </ToastProvider>
            </TRPCProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
