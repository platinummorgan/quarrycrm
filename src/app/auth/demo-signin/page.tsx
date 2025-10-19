'use client'

import { useEffect, useState, Suspense } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'

function DemoSigninContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [signinAttempted, setSigninAttempted] = useState(false)

  const token = searchParams.get('token')

  useEffect(() => {
    if (!token) {
      setError('Demo token is missing')
      return
    }

    if (signinAttempted) {
      return
    }

    const performDemoSignin = async () => {
      const timeoutId = window.setTimeout(() => {
        console.error('Demo signin timeout - session not established')
        setError('Demo signin failed - no session established.')
        setLoading(false)
      }, 4000)

      try {
        setLoading(true)
        setSigninAttempted(true)
        console.log(
          'Attempting demo signin with token:',
          token.substring(0, 10) + '...'
        )

        // Get current host for host pinning
        const currentHost = window.location.host

        const result = await signIn('demo', {
          token,
          host: currentHost, // Pass host for validation
          redirect: false,
          callbackUrl: '/app',
        })

        console.log('Demo signin result:', result)

        if (!result) {
          clearTimeout(timeoutId)
          setError('Demo signin failed with an unexpected response.')
          setLoading(false)
          return
        }

        if (result.error) {
          clearTimeout(timeoutId)
          console.error('Demo signin error:', result.error)
          setError(
            result.error === 'CredentialsSignin'
              ? 'Demo signin failed - no session established.'
              : `Failed to sign in with demo account: ${result.error}`
          )
          setLoading(false)
          return
        }

        clearTimeout(timeoutId)
        const targetUrl = result.url || '/app'
        router.replace(targetUrl)
      } catch (err) {
        clearTimeout(timeoutId)
        console.error('Demo signin exception:', err)
        setError('An error occurred during demo signin')
        setLoading(false)
      }
    }

    void performDemoSignin()
  }, [token, signinAttempted, router])

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-600">
              Demo Signin Error
            </h2>
            <p className="mt-2 text-gray-600">Demo token is missing</p>
            <button
              onClick={() => router.push('/auth/signin')}
              className="mt-4 rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
            >
              Go to Sign In
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">
            {signinAttempted
              ? 'Establishing session...'
              : 'Signing you into the demo...'}
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
            <h2 className="text-2xl font-bold text-red-600">
              Demo Signin Error
            </h2>
            <p className="mt-2 text-gray-600">{error}</p>
            <button
              onClick={() => router.push('/auth/signin')}
              className="mt-4 rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
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
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-indigo-600"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <DemoSigninContent />
    </Suspense>
  )
}
