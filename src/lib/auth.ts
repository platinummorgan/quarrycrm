import { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import EmailProvider from 'next-auth/providers/email'
import { prisma } from '@/lib/prisma'
import { createTransport } from 'nodemailer'

const transporter = createTransport({
  host: process.env.EMAIL_SERVER_HOST,
  port: parseInt(process.env.EMAIL_SERVER_PORT || '587'),
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
  secure: process.env.EMAIL_SERVER_SECURE === 'true',
})

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [
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
      from: process.env.EMAIL_FROM,
      sendVerificationRequest: async ({ identifier: email, url, provider }) => {
        const { host } = new URL(url)
        await transporter.sendMail({
          to: email,
          from: provider.from,
          subject: `Sign in to ${host}`,
          text: text({ url, host }),
          html: html({ url, host }),
        })
      },
    }),
  ],
  session: {
    strategy: 'database',
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id

        // Get user's organizations and current org context
        const memberships = await prisma.orgMember.findMany({
          where: { userId: user.id },
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

        // For now, default to first org or create one if none exist
        let currentOrg = memberships[0]?.organization

        if (!currentOrg) {
          // Create default organization for new users
          const defaultOrg = await prisma.organization.create({
            data: {
              name: `${session.user.name || session.user.email}'s Organization`,
              members: {
                create: {
                  userId: user.id,
                  role: 'OWNER',
                },
              },
            },
          })
          currentOrg = {
            id: defaultOrg.id,
            name: defaultOrg.name,
            domain: defaultOrg.domain,
          }
        }

        // Add org context to session
        session.user.organizations = memberships.map((m) => ({
          id: m.organization.id,
          name: m.organization.name,
          domain: m.organization.domain,
          role: m.role,
        }))

        session.user.currentOrg = {
          id: currentOrg.id,
          name: currentOrg.name,
          domain: currentOrg.domain,
          role:
            memberships.find((m) => m.organizationId === currentOrg.id)?.role ||
            'MEMBER',
        }
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
    verifyRequest: '/auth/verify-request',
  },
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
