'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { LucideIcon } from 'lucide-react'
import { designTokens } from '@/lib/design-tokens'

interface EmptyStateAction {
  label: string
  onClick: () => void
  variant?: 'default' | 'outline' | 'ghost'
  icon?: LucideIcon
}

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description: string
  actions?: EmptyStateAction[]
  className?: string
  /** Accessible label for the icon container */
  iconLabel?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actions,
  className,
  iconLabel
}: EmptyStateProps) {
  return (
    <Card className={`border-dashed ${className || ''}`}>
      <CardContent 
        className="flex flex-col items-center justify-center text-center"
        style={{ 
          paddingTop: designTokens.spacing[16],
          paddingBottom: designTokens.spacing[16],
          minHeight: '300px'
        }}
      >
        {Icon && (
          <div 
            className="rounded-full bg-muted p-3"
            style={{ marginBottom: designTokens.spacing[4] }}
            aria-label={iconLabel || 'Empty state icon'}
            role="img"
          >
            <Icon className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          </div>
        )}
        <h3 
          className="font-semibold text-foreground"
          style={{ 
            fontSize: designTokens.typography.fontSize.lg,
            marginBottom: designTokens.spacing[2]
          }}
        >
          {title}
        </h3>
        <p 
          className="text-muted-foreground max-w-sm"
          style={{ 
            fontSize: designTokens.typography.fontSize.sm,
            marginBottom: actions && actions.length > 0 ? designTokens.spacing[6] : 0
          }}
        >
          {description}
        </p>
        {actions && actions.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3">
            {actions.map((action, index) => {
              const ActionIcon = action.icon
              return (
                <Button
                  key={index}
                  onClick={action.onClick}
                  variant={action.variant || 'default'}
                  className="flex items-center gap-2"
                  style={{ minHeight: designTokens.accessibility.touchTargetMin }}
                >
                  {ActionIcon && <ActionIcon className="h-4 w-4" aria-hidden="true" />}
                  {action.label}
                </Button>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}