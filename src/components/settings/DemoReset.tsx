'use client';

import { useState } from 'react';
import { useIsDemo } from '@/hooks/usePIIMasking';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface DemoResetStats {
  before: {
    companies: number;
    contacts: number;
    deals: number;
    activities: number;
  };
  after: {
    companies: number;
    contacts: number;
    deals: number;
    activities: number;
  };
}

interface DemoResetResponse {
  success: boolean;
  message?: string;
  error?: string;
  stats?: DemoResetStats;
  organization?: string;
}

/**
 * Demo Reset Component
 * 
 * Allows organization owners to reset demo data back to initial state.
 * Only visible in demo organizations and non-production environments.
 * 
 * Features:
 * - Confirmation dialog with warning
 * - Loading state during reset
 * - Success/error feedback
 * - Shows before/after stats
 */
export function DemoReset() {
  const isDemo = useIsDemo();
  const [isResetting, setIsResetting] = useState(false);
  const [lastReset, setLastReset] = useState<{
    timestamp: Date;
    stats?: DemoResetStats;
  } | null>(null);

  // Only show in demo organizations
  if (!isDemo) {
    return null;
  }

  const handleReset = async () => {
    setIsResetting(true);

    try {
      const response = await fetch('/api/admin/demo-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data: DemoResetResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset demo data');
      }

      if (data.success) {
        setLastReset({
          timestamp: new Date(),
          stats: data.stats,
        });

        toast.success('Demo data reset successfully', {
          description: data.message || 'All demo data has been restored to initial state',
        });

        // Reload page to show fresh data
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        throw new Error(data.error || 'Reset failed');
      }
    } catch (error) {
      console.error('Demo reset error:', error);
      toast.error('Failed to reset demo data', {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Demo Data Reset
        </CardTitle>
        <CardDescription>
          Restore demo data to its initial state (Owner only)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="default">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This action will delete all current data (contacts, deals, companies, activities)
            and restore the original demo dataset. This cannot be undone.
          </AlertDescription>
        </Alert>

        {lastReset && (
          <Alert variant="default" className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertDescription className="text-green-800 dark:text-green-200">
              <div className="space-y-1">
                <p className="font-medium">Last reset: {lastReset.timestamp.toLocaleString()}</p>
                {lastReset.stats && (
                  <div className="text-sm space-y-0.5">
                    <p>Companies: {lastReset.stats.before.companies} → {lastReset.stats.after.companies}</p>
                    <p>Contacts: {lastReset.stats.before.contacts} → {lastReset.stats.after.contacts}</p>
                    <p>Deals: {lastReset.stats.before.deals} → {lastReset.stats.after.deals}</p>
                    <p>Activities: {lastReset.stats.before.activities} → {lastReset.stats.after.activities}</p>
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              disabled={isResetting}
              className="w-full"
            >
              {isResetting ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Resetting Demo Data...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reset Demo Data
                </>
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Confirm Demo Reset
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-3">
                <p>
                  This will <strong>permanently delete</strong> all current data in the demo organization:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>All contacts and companies</li>
                  <li>All deals and pipelines data</li>
                  <li>All activities and tasks</li>
                  <li>All custom fields and settings</li>
                </ul>
                <p>
                  The demo will be restored to its original state with fresh sample data.
                </p>
                <p className="font-semibold text-destructive">
                  This action cannot be undone.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isResetting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  handleReset();
                }}
                disabled={isResetting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isResetting ? 'Resetting...' : 'Yes, Reset Demo Data'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <p className="text-xs text-muted-foreground">
          Only available in non-production environments. Requires organization owner role.
        </p>
      </CardContent>
    </Card>
  );
}
