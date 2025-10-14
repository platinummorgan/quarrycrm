import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import SignInForm from '@/components/auth/SignInForm'

export default async function SignInPage() {
  const session = await getServerSession(authOptions)

  if (session) {
    redirect('/app')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            We'll send you a magic link to sign in
          </p>
        </div>
        <SignInForm />
      </div>
    </div>
  )
}
