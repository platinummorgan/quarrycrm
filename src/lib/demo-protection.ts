import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * Check if the current session is a demo session
 */
export async function isDemoSession(request?: NextRequest): Promise<boolean> {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return false;
  }

  // Check if user has demo flag or demo role
  return (
    session.user.isDemo === true ||
    session.user.currentOrg?.role === 'DEMO'
  );
}

/**
 * Middleware to block write operations for demo users
 * Returns 403 response if demo user attempts POST/PUT/PATCH/DELETE
 * 
 * @example
 * export const POST = withDemoProtection(async (req) => {
 *   // Your handler code - only runs if not demo
 *   return NextResponse.json({ success: true });
 * });
 */
export function withDemoProtection<T = any>(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse<T>>
) {
  return async (req: NextRequest, context?: any): Promise<NextResponse<T>> => {
    // Check if this is a write operation
    const method = req.method.toUpperCase();
    const isWriteOperation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

    if (isWriteOperation) {
      const isDemo = await isDemoSession(req);

      if (isDemo) {
        return NextResponse.json(
          {
            error: 'Operation not permitted',
            message: 'Write operations are disabled in demo mode. Create your own workspace to make changes.',
            code: 'DEMO_WRITE_FORBIDDEN',
          } as any,
          {
            status: 403,
            headers: {
              'X-Demo-Mode': 'true',
            },
          }
        );
      }
    }

    // Not a write operation or not demo - proceed normally
    return handler(req, context);
  };
}

/**
 * Check if a specific organization is the demo organization
 * 
 * @param organizationId - Organization ID to check
 * @returns true if this is the demo org
 */
export function isDemoOrganization(organizationId: string): boolean {
  const demoOrgId = process.env.DEMO_ORG_ID;
  return !!demoOrgId && organizationId === demoOrgId;
}

/**
 * Get demo organization ID from environment
 */
export function getDemoOrgId(): string | null {
  return process.env.DEMO_ORG_ID || null;
}

/**
 * Combined middleware for demo protection AND rate limiting
 * Use this for write endpoints that need both protections
 * 
 * @example
 * export const POST = withDemoProtectionAndRateLimit(
 *   async (req) => { ... },
 *   WriteRateLimits.CONTACTS
 * );
 */
export function withDemoProtectionAndRateLimit<T = any>(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse<T>>,
  rateLimitConfig: { limit: number; windowMs: number; keyPrefix?: string }
) {
  // Import rate limiting here to avoid circular dependencies
  const withWriteRateLimit = require('@/lib/rate-limit').withWriteRateLimit;
  
  // Chain middlewares: demo protection -> rate limiting -> handler
  const rateLimited = withWriteRateLimit(handler, rateLimitConfig);
  return withDemoProtection(rateLimited);
}
