'use client'

import { useMemo } from 'react'
import { useSession } from 'next-auth/react'
import {
  maskEmail,
  maskPhone,
  maskPII,
  maskPIIArray,
  MaskOptions,
} from '@/lib/pii-masking'

/**
 * Hook to check if current user is in demo mode
 */
export function useIsDemo(): boolean {
  const { data: session } = useSession()

  return (
    session?.user?.isDemo === true || session?.user?.currentOrg?.role === 'DEMO'
  )
}

/**
 * Hook to get masking functions that automatically check if in demo mode
 *
 * @returns Object with masking functions that only mask in demo mode
 *
 * @example
 * const { maskEmail, maskPhone } = usePIIMasking();
 *
 * <div>{maskEmail(contact.email)}</div>
 * <div>{maskPhone(contact.phone)}</div>
 */
export function usePIIMasking(options: MaskOptions = {}) {
  const isDemo = useIsDemo()

  return useMemo(
    () => ({
      /**
       * Mask email if in demo mode, otherwise return as-is
       */
      maskEmail: (email: string | null | undefined): string => {
        if (!isDemo) return email || ''
        return maskEmail(email, options)
      },

      /**
       * Mask phone if in demo mode, otherwise return as-is
       */
      maskPhone: (phone: string | null | undefined): string => {
        if (!isDemo) return phone || ''
        return maskPhone(phone, options)
      },

      /**
       * Mask PII fields if in demo mode, otherwise return as-is
       */
      maskPII: <T extends Record<string, any>>(
        data: T,
        fields: (keyof T)[]
      ): T => {
        if (!isDemo) return data
        return maskPII(data, fields, options)
      },

      /**
       * Mask PII in array if in demo mode, otherwise return as-is
       */
      maskPIIArray: <T extends Record<string, any>>(
        data: T[],
        fields: (keyof T)[]
      ): T[] => {
        if (!isDemo) return data
        return maskPIIArray(data, fields, options)
      },

      /**
       * Whether currently in demo mode
       */
      isDemo,
    }),
    [isDemo, options]
  )
}

/**
 * HOC to wrap a component with PII masking context
 *
 * @example
 * const ContactCard = withPIIMasking(({ contact, maskEmail }) => (
 *   <div>{maskEmail(contact.email)}</div>
 * ));
 */
export function withPIIMasking<P extends object>(
  Component: React.ComponentType<P & ReturnType<typeof usePIIMasking>>
) {
  return function WithPIIMasking(props: P) {
    const masking = usePIIMasking()
    return <Component {...props} {...masking} />
  }
}
