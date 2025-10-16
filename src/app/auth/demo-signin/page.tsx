'use client'

import { useEffect, useState, Suspense } from 'react'
import { signIn, useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'

function DemoSigninContent() {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [signinAttempted, setSigninAttempted] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()

  useEffect(() => {
    const token = searchParams.get('token')

    if (!token) {
      setError('Demo token is missing')
      setLoading(false)
      return
    }

    // If user is already authenticated, redirect to app
    if (status === 'authenticated') {
      router.push('/app')
      return
    }

    // If still loading session and we haven't attempted signin yet, wait
    if (status === 'loading' && !signinAttempted) {
      return
    }

    // If we attempted signin and now have a session, redirect
    if (signinAttempted && status === 'authenticated') {
      router.push('/app')
      return
    }

    // If we attempted signin but status is not loading anymore and we're not authenticated, show error
    if (signinAttempted && status === 'unauthenticated') {
      setError('Demo signin failed - no session established')
      setLoading(false)
      return
    }

    // Attempt demo signin if we haven't tried yet
    if (!signinAttempted) {
      const performDemoSignin = async () => {
        try {
          setLoading(true)
          console.log('Attempting demo signin with token:', token.substring(0, 10) + '...')
          const result = await signIn('demo', {
            token,
            redirect: false,
          })

          console.log('Demo signin result:', result)

          if (result?.error) {
            console.error('Demo signin error:', result.error)
            setError(`Failed to sign in with demo account: ${result.error}`)
            setLoading(false)
          } else if (result?.ok) {
            console.log('Demo signin reported success, waiting for session...')
            setSigninAttempted(true)
            // Don't set loading to false yet - wait for session to update
          } else {
            console.error('Demo signin failed with unknown result:', result)
            setError('Demo signin failed with unknown error')
            setLoading(false)
          }
        } catch (err) {
          console.error('Demo signin exception:', err)
          setError('An error occurred during demo signin')
          setLoading(false)
        }
      }

      performDemoSignin()
    }
  }, [searchParams, status, router, signinAttempted])

  // If we attempted signin and session becomes authenticated, redirect
  useEffect(() => {
    if (signinAttempted && status === 'authenticated') {
      console.log('Session established after demo signin, redirecting to /app')
      router.push('/app')
    }
  }, [status, signinAttempted, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            {signinAttempted ? 'Establishing session...' : 'Signing you into the demo...'}
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-600">Demo Signin Error</h2>
            <p className="mt-2 text-gray-600">{error}</p>
            <button
              onClick={() => router.push('/auth/signin')}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Go to Sign In
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}

export default function DemoSigninPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <DemoSigninContent />
    </Suspense>
  )
}