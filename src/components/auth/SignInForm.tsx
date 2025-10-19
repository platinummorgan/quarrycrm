'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function SignInForm() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const result = await signIn('email', {
        email,
        redirect: false,
      })

      if (result?.error) {
        console.error(
          'Sign-in error:',
          result.error,
          'URL:',
          window.location.href
        )
        if (result.error === 'EmailProviderNotFound') {
          setMessage(
            'Email authentication is not configured. Please check your email server settings.'
          )
        } else if (result.error === 'EmailSignin') {
          setMessage(
            'Error sending email. Please check your email server configuration.'
          )
        } else {
          setMessage('Error sending email. Please try again.')
        }
      } else {
        setMessage('Check your email for the magic link!')
        router.push('/auth/verify-request')
      }
    } catch (error) {
      console.error(
        'Unexpected sign-in error:',
        error,
        'URL:',
        window.location.href
      )
      setMessage('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
      <div>
        <label htmlFor="email" className="sr-only">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="relative block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      {message && (
        <div
          className={`text-sm ${message.includes('Error') ? 'text-red-600' : 'text-green-600'}`}
        >
          {message}
        </div>
      )}

      <div>
        <button
          type="submit"
          disabled={loading}
          className="group relative flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Sending...' : 'Send magic link'}
        </button>
      </div>
    </form>
  )
}
