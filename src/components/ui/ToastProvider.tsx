'use client'

import { Toaster } from '@/components/ui/toaster'
import { toast } from '@/lib/toast'

interface ToastProviderProps {
  children: React.ReactNode
}

// Centralized toast provider that ensures consistent toast behavior across the app
export function ToastProvider({ children }: ToastProviderProps) {
  return (
    <>
      {children}
      <Toaster />
    </>
  )
}

// Re-export toast utilities for convenience
export { toast }