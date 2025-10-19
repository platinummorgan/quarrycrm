import { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import EmailProvider from 'next-auth/providers/email'
import { Resend } from 'resend'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import { getBaseUrl } from '@/lib/baseUrl'
import { verifyDemoToken } from '@/lib/demo-auth'
import { ensureUserOrg } from '@/server/ensure-user-org'

const isProd = process.env.NODE_ENV === 'production';

// Resend client and helpers for magic link delivery
// Note: Don't cache the Resend client - create it fresh in the provider to ensure env vars are loaded
// Build magic link URLs on NEXTAUTH_URL when present; otherwise force the public
// production host so links always point to the canonical app domain.
const baseUrl = process.env.NEXTAUTH_URL || 'https://www.quarrycrm.com';

function forceBase(url: string) {
  const u = new URL(url);
  return new URL(u.pathname + u.search, baseUrl).toString();
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  debug: true, // Enable debug logging
  providers: [
    // Temporary simple email login for debugging
    CredentialsProvider({
      id: 'email-simple',
      name: 'Email',
      credentials: {
        email: { label: 'Email', type: 'email' },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null
        
        // Find or create user
        let user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })
        
        if (!user) {
          // Create user
          user = await prisma.user.create({
            data: {
              email: credentials.email,
              emailVerified: new Date(),
            },
          })
          
          // Create organization
          const emailDomain = credentials.email.split('@')[1]
          const orgName = emailDomain.split('.')[0].charAt(0).toUpperCase() + emailDomain.split('.')[0].slice(1)
          
          const org = await prisma.organization.create({
            data: {
              name: `${orgName} Organization`,
              domain: emailDomain,
            },
          })
          
          // Add user as owner
          await prisma.orgMember.create({
            data: {
              organizationId: org.id,
              userId: user.id,
              role: 'OWNER',
              onboardingProgress: {},
            },
          })
        }
        
        return {
          id: user.id,
          email: user.email,
          name: user.name,
        }
      },
    }),
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
              onboardingProgress: {},
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
    // EmailProvider - Always include it, check for API key at runtime
    EmailProvider({
      from: process.env.EMAIL_FROM?.trim() || 'noreply@mail.quarrycrm.com',
      async sendVerificationRequest({ identifier, url }) {
        // Create Resend client here to ensure env vars are loaded
        // Trim environment variables to remove any whitespace/newlines
        const apiKey = process.env.RESEND_API_KEY?.trim()
        if (!apiKey) {
          console.error('❌ RESEND_API_KEY not available at runtime')
          throw new Error('Email service not configured - RESEND_API_KEY missing')
        }
        
        const resend = new Resend(apiKey)
        const emailFrom = process.env.EMAIL_FROM?.trim() || 'noreply@mail.quarrycrm.com'
        const forced = forceBase(url)
        
        console.log('📧 Sending magic link email to:', identifier, 'from:', emailFrom)
        console.log('🔗 Magic link URL:', forced)
        console.log('🔗 Original URL:', url)
        console.log('🌐 Base URL:', baseUrl)
        
        try {
          const result = await resend.emails.send({
            from: emailFrom,
            to: identifier,
            subject: 'Your Quarry CRM sign-in link',
            html: `<p>Click to sign in:</p><p><a href="${forced}">${forced}</a></p>`,
          })
          
          // Resend SDK returns { data: { id }, error: null } on success
          // or { data: null, error: { message } } on failure
          if (result.error) {
            console.error('❌ Magic link send failed:', result.error)
            throw new Error(`Email send failed: ${result.error.message || 'Unknown error'}`)
          }
          
          console.log('✅ Magic link sent successfully, email ID:', result.data?.id)
          // Must not throw or return error - NextAuth expects success
        } catch (error: any) {
          console.error('❌ Exception sending magic link:', error)
          // Re-throw so NextAuth knows it failed
          throw error
        }
      },
      maxAge: 10 * 60,
    }),
  ],
  session: {
    strategy: 'jwt', // Use JWT for sessions
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  // Use database for verification tokens but JWT for sessions
  useSecureCookies: isProd,
  callbacks: {
    async signIn({ user, account, profile, email, credentials }) {
      console.log('🔍 SIGNIN CALLBACK:', { 
        user: user?.email, 
        userId: user?.id,
        account: account?.provider,
        hasEmail: !!email 
      })
      
      // Guarantee the user has an organization before they hit the app
      try {
        if (user?.id) await ensureUserOrg(user.id)
      } catch (err) {
        console.error('❌ ensureUserOrg failed during signIn callback:', err)
        // don't block sign-in on failure
      }

      // For email provider sign-ins, ensure user has an organization
      if (account?.provider === 'email' && user?.id && user?.email) {
        console.log('🔍 Email provider sign-in, checking organization membership')
        
        try {
          // Check if user has any organization memberships
          const existingMembership = await prisma.orgMember.findFirst({
            where: { userId: user.id }
          })
          
          if (!existingMembership) {
            console.log('🔍 User has no organization, creating default organization')
            
            // Extract domain from email for organization name
            const emailDomain = user.email.split('@')[1]
            const orgName = emailDomain.split('.')[0].charAt(0).toUpperCase() + emailDomain.split('.')[0].slice(1)
            
            // Create a default organization for the user
            const org = await prisma.organization.create({
              data: {
                name: `${orgName} Organization`,
                domain: emailDomain,
              }
            })
            
            console.log('✅ Created organization:', org.id)
            
            // Add user as owner of the organization
            await prisma.orgMember.create({
              data: {
                organizationId: org.id,
                userId: user.id,
                role: 'OWNER',
                onboardingProgress: {},
              }
            })
            
            console.log('✅ Added user as organization owner')
          } else {
            console.log('✅ User already has organization membership')
          }
        } catch (error) {
          console.error('❌ Error ensuring organization membership:', error)
          // Don't block sign-in if organization creation fails
        }
      }
      
      // Allow all sign-ins - the adapter will handle user creation
      return true
    },
    async redirect({ url, baseUrl }) {
      console.log('🔍 REDIRECT CALLBACK:', { url, baseUrl })
      
      // Parse the URL to check for errors
      const urlObj = new URL(url, baseUrl)
      
      // If redirecting to sign-in page after callback, redirect to app instead
      if (urlObj.pathname === '/auth/signin' && !urlObj.searchParams.has('error')) {
        console.log('🔍 Redirecting from sign-in to /app/contacts after successful auth')
        return `${baseUrl}/app/contacts`
      }
      
      // If there's an error in the URL, allow it through
      if (urlObj.searchParams.has('error')) {
        console.log('🔍 Error in URL, returning as-is:', url)
        return url
      }
      
      // Allows relative callback URLs
      if (url.startsWith("/")) {
        // If it's the sign-in page without error, redirect to app
        if (url === '/auth/signin' || url.startsWith('/auth/signin?')) {
          return `${baseUrl}/app/contacts`
        }
        return `${baseUrl}${url}`
      }
      
      // Allows callback URLs on the same origin
      if (new URL(url).origin === baseUrl) return url
      
      // Default redirect after sign in
      return `${baseUrl}/app/contacts`
    },
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
      // Attach currentOrganizationId to session for faster context resolution
      try {
        const userId = (token?.id as string) || (session.user?.id as string)
        if (userId) {
          const m = await prisma.orgMember.findFirst({
            where: { userId },
            select: { organizationId: true },
          })
          ;(session.user as any).currentOrganizationId = m?.organizationId ?? null
        }
      } catch (err) {
        // ignore errors here
      }
      
      console.log('🔍 SESSION CALLBACK: Returning session')
      return session
    },
    async jwt({ token, user, account, trigger }) {
      console.log('🔍 JWT callback called:', { token: !!token, user: !!user, account: !!account, trigger })
      console.log('🔍 JWT callback data:', { tokenEmail: token?.email, userEmail: user?.email, accountProvider: account?.provider })

      if (user) {
        console.log('🔍 Setting JWT from user:', { id: user.id, email: user.email, isDemo: (user as any).isDemo })
        token.id = user.id
        token.isDemo = (user as any).isDemo
        token.demoOrgId = (user as any).demoOrgId
        
        // For email sign-in, fetch user's organizations
        if (account?.provider === 'email') {
          console.log('🔍 Email sign-in detected, fetching organizations for user:', user.id)
          const userWithOrgs = await prisma.user.findUnique({
            where: { id: user.id },
            include: {
              memberships: {
                include: {
                  organization: true
                }
              }
            }
          })
          
          if (userWithOrgs && userWithOrgs.memberships.length > 0) {
            const firstOrg = userWithOrgs.memberships[0]
            token.organizationId = firstOrg.organizationId
            console.log('🔍 User has organization:', firstOrg.organizationId)
          } else {
            console.log('⚠️ User has no organizations, may need onboarding')
          }
        }
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
