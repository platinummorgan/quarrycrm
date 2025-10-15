import { makeSEO } from '@/lib/seo'

export const metadata = makeSEO({
  title: 'Terms of Service - Quarry CRM',
  description: 'Read Quarry CRM\'s terms of service and usage agreement. Understand your rights and responsibilities.',
  path: '/terms',
})

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background py-20">
      <div className="container mx-auto max-w-[800px] px-4">
        <div className="mb-16">
          <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
          <p className="text-muted-foreground">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>

        <div className="prose prose-gray max-w-none">
          <h2>Acceptance of Terms</h2>
          <p>
            By accessing and using Quarry CRM, you accept and agree to be bound by the terms
            and provision of this agreement.
          </p>

          <h2>Use License</h2>
          <p>
            Permission is granted to temporarily use Quarry CRM for personal and business use.
            This is the grant of a license, not a transfer of title.
          </p>

          <h2>User Responsibilities</h2>
          <p>
            You are responsible for maintaining the confidentiality of your account and password.
            You agree to accept responsibility for all activities that occur under your account.
          </p>

          <h2>Service Availability</h2>
          <p>
            While we strive to provide continuous service, we do not guarantee that the service
            will be uninterrupted or error-free.
          </p>

          <h2>Contact Information</h2>
          <p>
            If you have any questions about these Terms of Service, please contact us.
          </p>
        </div>
      </div>
    </div>
  )
}