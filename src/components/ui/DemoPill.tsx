'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Eye, Lock } from 'lucide-react';
import { useIsDemo } from '@/hooks/usePIIMasking';

/**
 * DemoPill Component
 * 
 * Displays a visible "Read-only demo" badge when:
 * 1. User is in demo mode (via session)
 * 2. User is on demo subdomain (via hostname)
 * 
 * Variants:
 * - default: Small pill for headers/navigation
 * - large: Prominent banner for page content
 */
export function DemoPill({ variant = 'default' }: { variant?: 'default' | 'large' }) {
  const isDemo = useIsDemo();
  const [isDemoSubdomain, setIsDemoSubdomain] = useState(false);

  useEffect(() => {
    // Check if on demo subdomain
    const host = window.location.hostname;
    setIsDemoSubdomain(host.startsWith('demo.') || host === 'demo.localhost');
  }, []);

  // Show if either demo user OR demo subdomain
  if (!isDemo && !isDemoSubdomain) {
    return null;
  }

  if (variant === 'large') {
    return (
      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 border-y border-yellow-200 dark:border-yellow-800">
        <div className="container max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-center gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-yellow-700 dark:text-yellow-400" />
              <span className="font-semibold text-yellow-900 dark:text-yellow-100">
                Read-only Demo Mode
              </span>
            </div>
            <span className="text-yellow-700 dark:text-yellow-400">
              •
            </span>
            <span className="text-yellow-700 dark:text-yellow-400">
              Explore features without making changes
            </span>
            <span className="text-yellow-700 dark:text-yellow-400">
              •
            </span>
            <a
              href="/signup"
              className="text-yellow-900 dark:text-yellow-100 underline font-medium hover:text-yellow-700 dark:hover:text-yellow-300 transition-colors"
            >
              Sign up for full access
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Badge
      variant="outline"
      className="bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700 gap-1.5 px-2.5 py-0.5"
    >
      <Eye className="h-3 w-3" />
      <span className="font-medium text-xs">Read-only Demo</span>
    </Badge>
  );
}
