'use client'

import { Component, ErrorInfo, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react'
import { toast } from '@/lib/toast'

interface RouteErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  routeName?: string
  showErrorDetails?: boolean
  onRetry?: () => void
  onReset?: () => void
}

interface RouteErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
  retryCount: number
}

const MAX_RETRY_COUNT = 3

export class RouteErrorBoundary extends Component<RouteErrorBoundaryProps, RouteErrorBoundaryState> {
  private retryTimeouts: NodeJS.Timeout[] = []

  public state: RouteErrorBoundaryState = {
    hasError: false,
    retryCount: 0,
  }

  public static getDerivedStateFromError(error: Error): Partial<RouteErrorBoundaryState> {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`RouteErrorBoundary (${this.props.routeName || 'unknown'}):`, error, errorInfo)

    this.setState({ errorInfo })

    // Report to error tracking in production
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to error tracking service (e.g., Sentry)
      console.error('Route error reported:', {
        error: error.toString(),
        componentStack: errorInfo.componentStack,
        route: this.props.routeName,
        userAgent: navigator.userAgent,
        url: window.location.href,
      })
    }

    // Show toast notification
    toast.error('Something went wrong', 'The page encountered an error. You can try refreshing or going back.')
  }

  public componentWillUnmount() {
    // Clear any pending retry timeouts
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout))
  }

  private handleRetry = () => {
    const { onRetry } = this.props
    const { retryCount } = this.state

    if (retryCount >= MAX_RETRY_COUNT) {
      toast.error('Maximum retry attempts reached', 'Please refresh the page or contact support.')
      return
    }

    this.setState(prevState => ({ retryCount: prevState.retryCount + 1 }))

    // Reset error state
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
    })

    // Call retry callback if provided
    if (onRetry) {
      onRetry()
    } else {
      // Default retry behavior - reload the page after a delay
      const timeout = setTimeout(() => {
        window.location.reload()
      }, 1000)
      this.retryTimeouts.push(timeout)
    }

    toast.info('Retrying...', `Attempt ${retryCount + 1} of ${MAX_RETRY_COUNT}`)
  }

  private handleGoHome = () => {
    window.location.href = '/app'
  }

  private handleReportBug = () => {
    const { error } = this.state
    const { routeName } = this.props
    const bugReport = {
      message: 'Route Error Report',
      route: routeName || window.location.pathname,
      error: error?.toString(),
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    }

    // Copy to clipboard
    navigator.clipboard.writeText(JSON.stringify(bugReport, null, 2))
      .then(() => {
        toast.success('Bug report copied to clipboard', 'Please paste this in a support ticket.')
      })
      .catch(() => {
        toast.error('Failed to copy bug report', 'Please manually copy the error details.')
      })
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      const { error, retryCount } = this.state
      const { routeName, showErrorDetails = process.env.NODE_ENV === 'development' } = this.props
      const canRetry = retryCount < MAX_RETRY_COUNT

      return (
        <div className="min-h-[400px] flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl border-destructive/50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-destructive/10 rounded-full">
                  <AlertTriangle className="h-6 w-6 text-destructive" aria-hidden="true" />
                </div>
                <div>
                  <CardTitle className="text-destructive">
                    {routeName ? `${routeName} Error` : 'Page Error'}
                  </CardTitle>
                  <CardDescription>
                    Something went wrong while loading this page
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                We apologize for the inconvenience. This error has been logged and we're working to fix it.
              </p>

              {retryCount > 0 && (
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm">
                    Retry attempts: {retryCount} / {MAX_RETRY_COUNT}
                  </p>
                </div>
              )}

              {showErrorDetails && error && (
                <details className="text-xs bg-muted p-3 rounded-md">
                  <summary className="cursor-pointer font-medium mb-2 flex items-center gap-2">
                    <Bug className="h-4 w-4" />
                    Error Details (Development)
                  </summary>
                  <div className="space-y-2">
                    <div>
                      <strong>Error:</strong>
                      <pre className="mt-1 text-xs whitespace-pre-wrap break-all bg-background p-2 rounded border overflow-auto max-h-32">
                        {error.toString()}
                      </pre>
                    </div>
                    {this.state.errorInfo?.componentStack && (
                      <div>
                        <strong>Component Stack:</strong>
                        <pre className="mt-1 text-xs whitespace-pre-wrap break-all bg-background p-2 rounded border overflow-auto max-h-32">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}
            </CardContent>
            <CardFooter className="flex gap-2 flex-wrap">
              {canRetry && (
                <Button onClick={this.handleRetry} variant="default" className="flex-1">
                  <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
                  Try Again {retryCount > 0 && `(${retryCount}/${MAX_RETRY_COUNT})`}
                </Button>
              )}
              <Button onClick={this.handleGoHome} variant="outline" className={canRetry ? "flex-1" : "flex-1"}>
                <Home className="mr-2 h-4 w-4" aria-hidden="true" />
                Go Home
              </Button>
              {showErrorDetails && (
                <Button onClick={this.handleReportBug} variant="ghost" size="sm">
                  <Bug className="mr-2 h-4 w-4" aria-hidden="true" />
                  Report Bug
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}