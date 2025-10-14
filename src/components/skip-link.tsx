import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface SkipLinkProps {
  href: string
  children: ReactNode
  className?: string
}

export function SkipLink({ href, children, className }: SkipLinkProps) {
  return (
    <a
      href={href}
      className={cn(
        'sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:shadow-lg',
        className
      )}
    >
      {children}
    </a>
  )
}
