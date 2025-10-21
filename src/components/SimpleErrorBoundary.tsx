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
