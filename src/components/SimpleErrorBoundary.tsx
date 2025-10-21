'use client'

import React from 'react'

export default class SimpleErrorBoundary extends React.Component<{
  children: React.ReactNode
}> {
  state = { error: undefined as Error | undefined }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('SimpleErrorBoundary caught:', error, info)
    try {
      // Send a lightweight error report to a local API route for collection during dev
  if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
        void fetch('/api/client-error-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: String(error?.message),
            stack: String(error?.stack || ''),
            info: info?.componentStack || '',
            url: window.location.href,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
          }),
        }).catch((e) => {
          // swallowing network errors to avoid loops
          console.warn('Failed to POST client error report', e)
        })
      }
    } catch (err) {
      // defensive: do not let reporting throw
      console.warn('Error while reporting client error', err)
    }
  }

  render() {
    const err = this.state.error
    if (err) {
      return (
        <div style={{ padding: 16 }}>
          <h2 style={{ color: 'red', marginBottom: 8 }}>Render error</h2>
          <pre style={{ color: 'red', whiteSpace: 'pre-wrap' }}>
            {String(err.message) + '\n' + (err.stack || '')}
          </pre>
        </div>
      )
    }
    return this.props.children
  }
}
