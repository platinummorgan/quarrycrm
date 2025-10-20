'use client'

import React from 'react'
import { Button } from '@/components/ui/button'

export default class ClientErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null; errorInfo: any }
> {
  constructor(props: any) {
    super(props)
    this.state = { error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    // Log to console and preserve info for the user
    // In a real app you might forward this to a logging endpoint
    // ...existing code...
    console.error('ClientErrorBoundary caught error:', error, errorInfo)
    this.setState({ error, errorInfo })
  }

  render() {
    if (this.state.error) {
      return (
        <div className="p-6">
          <h2 className="text-lg font-semibold text-destructive">Something went wrong</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            An unexpected error occurred while loading this section. See details below.
          </p>

          <div className="mt-4 max-h-56 overflow-auto rounded border bg-slate-900 p-3 text-xs text-white">
            <pre className="whitespace-pre-wrap">{this.state.error?.stack || String(this.state.error)}</pre>
          </div>

          <div className="mt-4 flex gap-2">
            <Button onClick={() => location.reload()} variant="outline">
              Reload page
            </Button>
            <Button
              onClick={() => this.setState({ error: null, errorInfo: null })}
            >
              Try again
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children as any
  }
}
