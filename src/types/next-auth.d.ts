import { DefaultSession, DefaultUser } from 'next-auth'
import { JWT, DefaultJWT } from 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      organizations: Array<{
        id: string
        name: string
        domain: string | null
        role: string
      }>
      currentOrg: {
        id: string
        name: string
        domain: string | null
        role: string
      }
    } & DefaultSession['user']
  }

  interface User extends DefaultUser {
    id: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id: string
    organizations?: Array<{
      id: string
      name: string
      domain: string | null
      role: string
    }>
    currentOrg?: {
      id: string
      name: string
      domain: string | null
      role: string
    }
  }
}
