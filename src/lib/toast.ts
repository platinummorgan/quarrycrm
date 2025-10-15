'use client'

import { toast as sonnerToast } from 'sonner'

// Centralized toast utility
export const toast = {
  success: (message: string, description?: string) => {
    return sonnerToast.success(message, {
      description,
      duration: 4000,
    })
  },

  error: (message: string, description?: string) => {
    return sonnerToast.error(message, {
      description,
      duration: 6000,
    })
  },

  info: (message: string, description?: string) => {
    return sonnerToast.info(message, {
      description,
      duration: 4000,
    })
  },

  warning: (message: string, description?: string) => {
    return sonnerToast.warning(message, {
      description,
      duration: 5000,
    })
  },

  loading: (message: string, description?: string) => {
    return sonnerToast.loading(message, {
      description,
    })
  },

  // Update existing toast
  update: (toastId: string | number, message: string, options?: any) => {
    return sonnerToast(message, {
      id: toastId,
      ...options,
    })
  },

  dismiss: (toastId?: string | number) => {
    return sonnerToast.dismiss(toastId)
  },
}

// Export the original sonner toast for advanced usage
export { sonnerToast as sonner }