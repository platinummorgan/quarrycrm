import SignInForm from '@/components/auth/SignInForm'

export default async function SignInPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
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
          {searchParams.error && (
            <div className="mt-4 rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">
                {searchParams.error === 'EmailCreateAccount'
                  ? 'There was a problem creating your account. Please try again.'
                  : 'There was a problem signing you in. Please try again.'}
              </p>
            </div>
          )}
        </div>
        <SignInForm />
      </div>
    </div>
  )
}
