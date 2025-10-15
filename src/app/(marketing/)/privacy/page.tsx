import { makeSEO } from '@/lib/seo'

export const metadata = makeSEO({
  title: 'Privacy Policy - Quarry CRM',
  description: 'Learn how Quarry CRM protects your data and privacy. Our commitment to data security and user privacy.',
  path: '/privacy',
})

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background py-20">
      <div className="container mx-auto max-w-[800px] px-4">
        <div className="mb-16">
          <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-muted-foreground">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>

        <div className="prose prose-gray max-w-none">
          <h2>Data Collection</h2>
          <p>
            We collect information you provide directly to us, such as when you create an account,
            use our services, or contact us for support.
          </p>

          <h2>Data Usage</h2>
          <p>
            We use the information we collect to provide, maintain, and improve our services,
            process transactions, and communicate with you.
          </p>

          <h2>Data Security</h2>
          <p>
            We implement appropriate security measures to protect your personal information
            against unauthorized access, alteration, disclosure, or destruction.
          </p>

          <h2>Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact us.
          </p>
        </div>
      </div>
    </div>
  )
}