import { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import EmailProvider from 'next-auth/providers/email'
import { Resend } from 'resend'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import { getBaseUrl } from '@/lib/baseUrl'
import { verifyDemoToken } from '@/lib/demo-auth'

const isProd = process.env.NODE_ENV === 'production';

// Resend client and helpers for magic link delivery
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
// Build magic link URLs on NEXTAUTH_URL when present; otherwise force the public
// production host so links always point to the canonical app domain.
const baseUrl = process.env.NEXTAUTH_URL || 'https://www.quarrycrm.com';

function forceBase(url: string) {
  const u = new URL(url);
  return new URL(u.pathname + u.search, baseUrl).toString();
}

const emailFrom = process.env.EMAIL_FROM || 'onboarding@resend.dev';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    // Demo provider for read-only access
    CredentialsProvider({
      id: 'demo',
      name: 'Demo',
      credentials: {
        token: { label: 'Demo Token', type: 'text' },
        host: { label: 'Host', type: 'text' }, // Optional host for pinning
      },
      async authorize(credentials) {
        console.log('🔍 Demo provider authorize called with credentials:', !!credentials?.token)
        if (!credentials?.token) {
          console.log('❌ No token provided')
          return null
        }

        try {
          console.log('🔍 Verifying demo token with security checks...')
          
          // Verify the demo token with host pinning if provided
          const expectedHost = credentials.host || process.env.NEXTAUTH_URL || undefined
          console.log('🔍 Expected host for token:', expectedHost)
          
          const payload = await verifyDemoToken(credentials.token, expectedHost)
          console.log('✅ Token verified successfully, orgId:', payload.orgId, 'jti:', payload.jti)

          // Find the demo user
          const demoUser = await prisma.user.findFirst({
            where: { email: 'demo@demo.example' },
          })
          console.log('🔍 Demo user found:', !!demoUser)

          if (!demoUser) {
            throw new Error('Demo user not found')
          }

          // Ensure the demo user has access to the demo org
          const membership = await prisma.orgMember.upsert({
            where: {
              organizationId_userId: {
                organizationId: payload.orgId,
                userId: demoUser.id,
              },
            },
            update: {
              role: 'DEMO',
            },
            create: {
              organizationId: payload.orgId,
              userId: demoUser.id,
              role: 'DEMO',
            },
            include: {
              organization: {
                select: {
                  id: true,
                  name: true,
                  domain: true,
                },
              },
            },
          })
          console.log('✅ Demo membership ready:', !!membership)

          console.log('✅ Demo auth successful, returning user object')
          // Return user object with minimal properties for database session
          return {
            id: demoUser.id,
            email: demoUser.email,
            name: demoUser.name,
            isDemo: true,
            demoOrgId: payload.orgId,
          }
        } catch (error) {
          console.error('❌ Demo auth error:', error)
          return null
        }
      },
    }),
    // EmailProvider via Resend (preferred) or SMTP fallback
    ...(process.env.RESEND_API_KEY
      ? [
          EmailProvider({
            from: emailFrom,
            async sendVerificationRequest({ identifier, url }) {
              if (!resend) {
                throw new Error('Resend client not configured')
              }
              const forced = forceBase(url)
              const result = await resend.emails.send({
                from: emailFrom,
                to: identifier,
                subject: 'Your Quarry CRM sign-in link',
                html: `<p>Click to sign in:</p><p><a href="${forced}">${forced}</a></p>`,
              })
              // The Resend SDK may return an object with `error` on failure
              if ((result as any)?.error) {
                console.error('Magic link send failed:', (result as any).error)
                throw new Error(
                  `Magic link send failed: ${((result as any).error?.message) || String((result as any).error)}`
                )
              }
            },
            maxAge: 10 * 60,
          }),
        ]
      : process.env.EMAIL_SERVER_HOST && process.env.EMAIL_SERVER_USER
      ? [
          EmailProvider({
            server: {
              host: process.env.EMAIL_SERVER_HOST,
              port: parseInt(process.env.EMAIL_SERVER_PORT || '587'),
              auth: {
                user: process.env.EMAIL_SERVER_USER,
                pass: process.env.EMAIL_SERVER_PASSWORD,
              },
              secure: process.env.EMAIL_SERVER_SECURE === 'true',
            },
            from: process.env.EMAIL_FROM || 'login@mail.quarrycrm.com',
            sendVerificationRequest: async ({ identifier: email, url }) => {
              const { sendMagicLinkEmail } = await import('@/lib/auth-email')
              // This will throw on failure so the UI surfaces an error
              await sendMagicLinkEmail(email, url)
            },
            maxAge: 10 * 60, // 10 minutes
          }),
        ]
      : []),
  ],
  session: {
    strategy: 'jwt', // Changed from 'database' to support CredentialsProvider
  },
  callbacks: {
    async session({ session, token }) {
      console.log('🔍 SESSION CALLBACK: Called with session:', !!session, 'token:', !!token)
      console.log('🔍 SESSION CALLBACK: Token data:', { id: token?.id, email: token?.email, isDemo: token?.isDemo })

      if (session.user && token) {
        session.user.id = token.id as string

        // Handle demo sessions differently - check if user is the demo user
        if (token.isDemo) {
          console.log('🔍 Handling demo session for token:', token.id)
          const demoOrgId = token.demoOrgId as string
          
          // Get demo organization details
          const demoOrg = await prisma.organization.findUnique({
            where: { id: demoOrgId },
            select: {
              id: true,
              name: true,
              domain: true,
            },
          })

          console.log('🔍 Demo org found:', !!demoOrg)
          if (demoOrg) {
            session.user.organizations = [{
              id: demoOrg.id,
              name: demoOrg.name,
              domain: demoOrg.domain,
              role: 'DEMO',
            }]

            session.user.currentOrg = {
              id: demoOrg.id,
              name: demoOrg.name,
              domain: demoOrg.domain,
              role: 'DEMO',
            }

            session.user.isDemo = true
            console.log('🔍 Demo session setup complete')
          }
        }
      }
      
      console.log('🔍 SESSION CALLBACK: Returning session')
      return session
    },
    async jwt({ token, user, account }) {
      console.log('🔍 JWT callback called:', { token: !!token, user: !!user, account: !!account })
      console.log('🔍 JWT callback data:', { tokenEmail: token?.email, userEmail: user?.email, accountProvider: account?.provider })

      if (user) {
        console.log('🔍 Setting JWT from user:', { id: user.id, email: user.email, isDemo: (user as any).isDemo })
        token.id = user.id
        token.isDemo = (user as any).isDemo
        token.demoOrgId = (user as any).demoOrgId
      }

      console.log('🔍 JWT callback returning token with id:', token.id)
      return token
    },
  },
  pages: {
    signIn: '/auth/signin',
    verifyRequest: '/auth/verify-request',
  },
  cookies: isProd ? {
    sessionToken: {
      name: '__Secure-next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: true,
        domain: '.quarrycrm.com',
      },
    },
    callbackUrl: {
      name: '__Secure-next-auth.callback-url',
      options: { sameSite: 'lax', path: '/', secure: true, domain: '.quarrycrm.com' },
    },
    csrfToken: {
      name: '__Host-next-auth.csrf-token',
      options: { sameSite: 'lax', path: '/', secure: true },
    },
  } : {},
}

function html({ url, host }: { url: string; host: string }) {
  const escapedHost = host.replace(/\./g, '&#8203;.')

  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <title>Sign in to ${host}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f6f9fc; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; margin-top: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { padding: 40px 30px; }
    .button { display: inline-block; padding: 16px 32px; background-color: #667eea; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
    .footer { padding: 20px 30px; color: #8898aa; font-size: 14px; text-align: center; border-top: 1px solid #e9ecef; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to ${host}</h1>
    </div>
    <div class="content">
      <p>Hi there,</p>
      <p>Click the button below to sign in to your account:</p>
      <a href="${url}" class="button">Sign in to ${host}</a>
      <p>If you didn't request this email, you can safely ignore it.</p>
      <p>This link will expire in 24 hours.</p>
    </div>
    <div class="footer">
      <p>If the button doesn't work, copy and paste this link into your browser:</p>
      <p><a href="${url}">${url}</a></p>
    </div>
  </div>
</body>
</html>
`
}

function text({ url, host }: { url: string; host: string }) {
  return `Sign in to ${host}\n\n${url}\n\n`
}
