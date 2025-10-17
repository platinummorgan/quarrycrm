'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import { AlertTriangle, Trash2, RotateCcw, Skull, Calendar } from 'lucide-react';

const CONFIRMATION_PHRASE = 'delete my workspace';

interface Props {
  organizationName: string;
  organizationId: string;
  deleteStatus?: {
    isDeleted: boolean;
    scheduledPurgeAt: string | null;
    deletedAt: string | null;
  };
  recordCounts?: {
    contacts: number;
    companies: number;
    deals: number;
    members: number;
  };
}

export function WorkspaceDelete({ 
  organizationName, 
  organizationId, 
  deleteStatus,
  recordCounts 
}: Props) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPurgeDialog, setShowPurgeDialog] = useState(false);
  const [confirmationPhrase, setConfirmationPhrase] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [purging, setPurging] = useState(false);

  const daysUntilPurge = deleteStatus?.scheduledPurgeAt 
    ? Math.ceil((new Date(deleteStatus.scheduledPurgeAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  async function handleSoftDelete() {
    setDeleting(true);
    try {
      const response = await fetch('/api/workspace/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          organizationId,
          immediate: false,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Delete failed');
      }

      toast.success('Workspace scheduled for deletion', {
        description: `Data will be permanently removed on ${new Date(data.scheduledPurgeAt).toLocaleDateString()}. You can restore it anytime before then.`,
      });
      
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete workspace');
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  }

  async function handleRestore() {
    setRestoring(true);
    try {
      const response = await fetch('/api/workspace/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Restore failed');
      }

      toast.success('Workspace restored successfully!', {
        description: 'All your data has been recovered.',
      });
      
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to restore workspace');
    } finally {
      setRestoring(false);
    }
  }

  async function handlePermanentDelete() {
    if (confirmationPhrase.toLowerCase().trim() !== CONFIRMATION_PHRASE) {
      toast.error('Confirmation phrase does not match', {
        description: `Please type exactly: "${CONFIRMATION_PHRASE}"`,
      });
      return;
    }

    setPurging(true);
    try {
      const response = await fetch('/api/workspace/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          organizationId,
          immediate: true,
          confirmationPhrase,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Permanent delete failed');
      }

      toast.success('Workspace permanently deleted');
      
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to permanently delete workspace');
      setPurging(false);
    } finally {
      setShowPurgeDialog(false);
      setConfirmationPhrase('');
    }
  }

  return (
    <Card className="p-6 border-destructive">
      <div className="space-y-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
          <div>
            <h3 className="text-lg font-semibold text-destructive">Danger Zone</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Irreversible and destructive actions that affect your entire workspace
            </p>
          </div>
        </div>

        {deleteStatus?.isDeleted && daysUntilPurge !== null && (
          <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
            <Calendar className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-900 dark:text-amber-100">
              Workspace Scheduled for Deletion
            </AlertTitle>
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              <p className="mb-3">
                This workspace will be permanently deleted in <strong>{daysUntilPurge} days</strong> ({new Date(deleteStatus.scheduledPurgeAt!).toLocaleDateString()}).
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRestore} 
                disabled={restoring}
                className="border-amber-600 text-amber-700 hover:bg-amber-100"
              >
                {restoring ? (
                  <>
                    <RotateCcw className="h-4 w-4 mr-2 animate-spin" />
                    Restoring...
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Cancel Deletion & Restore
                  </>
                )}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {recordCounts && !deleteStatus?.isDeleted && (
          <Alert className="bg-muted">
            <AlertDescription className="text-sm">
              <div className="font-medium mb-2">This workspace contains:</div>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>{recordCounts.contacts.toLocaleString()} contacts</li>
                <li>{recordCounts.companies.toLocaleString()} companies</li>
                <li>{recordCounts.deals.toLocaleString()} deals</li>
                <li>{recordCounts.members.toLocaleString()} team members</li>
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {!deleteStatus?.isDeleted && (
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Trash2 className="h-4 w-4 text-destructive" />
                  <h4 className="font-semibold">Delete Workspace</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Soft delete with 30-day recovery period. You can restore your workspace anytime within 30 days.
                </p>
              </div>
            </div>
            <Button 
              variant="destructive" 
              onClick={() => setShowDeleteDialog(true)}
              className="w-full sm:w-auto"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Workspace
            </Button>
          </div>
        )}

        {deleteStatus?.isDeleted && (
          <div className="border border-destructive rounded-lg p-4 space-y-3 bg-destructive/5">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Skull className="h-4 w-4 text-destructive" />
                  <h4 className="font-semibold text-destructive">Permanent Deletion</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Skip the 30-day waiting period and immediately purge all data. <strong className="text-destructive">This action cannot be undone.</strong>
                </p>
              </div>
            </div>
            <Button 
              variant="destructive" 
              onClick={() => setShowPurgeDialog(true)}
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700"
            >
              <Skull className="h-4 w-4 mr-2" />
              Permanently Delete Now
            </Button>
          </div>
        )}
      </div>

      {/* Soft Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Delete "{organizationName}"?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 pt-2">
              <p>
                This will schedule your workspace for deletion. Your data will be kept for <strong>30 days</strong> during which you can restore it.
              </p>
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded p-3 text-sm">
                <p className="font-medium text-amber-900 dark:text-amber-100 mb-1">What happens:</p>
                <ul className="list-disc list-inside space-y-1 text-amber-800 dark:text-amber-200">
                  <li>Workspace will be hidden from your account</li>
                  <li>Team members lose access immediately</li>
                  <li>Data remains recoverable for 30 days</li>
                  <li>After 30 days, all data is permanently deleted</li>
                </ul>
              </div>
              {recordCounts && (
                <p className="text-xs text-muted-foreground">
                  This will affect {recordCounts.contacts} contacts, {recordCounts.companies} companies, {recordCounts.deals} deals, and {recordCounts.members} team members.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleSoftDelete} 
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting...' : 'Schedule Deletion'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permanent Delete Dialog */}
      <AlertDialog open={showPurgeDialog} onOpenChange={(open) => {
        setShowPurgeDialog(open);
        if (!open) setConfirmationPhrase('');
      }}>
        <AlertDialogContent className="border-destructive">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Skull className="h-5 w-5" />
              Permanently Delete Workspace?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4 pt-2">
              <div className="bg-red-50 dark:bg-red-950/20 border-2 border-red-200 dark:border-red-800 rounded p-4">
                <p className="font-bold text-red-900 dark:text-red-100 text-sm mb-2">
                  ⚠️ THIS ACTION IS IRREVERSIBLE
                </p>
                <p className="text-red-800 dark:text-red-200 text-sm">
                  All data will be <strong>immediately and permanently deleted</strong>. This includes:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-red-800 dark:text-red-200 mt-2">
                  <li>All contacts, companies, and deals</li>
                  <li>All pipelines and activities</li>
                  <li>All team members and permissions</li>
                  <li>All files and attachments</li>
                  <li>All audit logs and history</li>
                </ul>
                <p className="text-red-900 dark:text-red-100 font-semibold text-sm mt-3">
                  There is no recovery period. This data cannot be restored.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmation" className="text-sm font-medium">
                  Type <code className="text-xs bg-muted px-2 py-0.5 rounded">{CONFIRMATION_PHRASE}</code> to confirm:
                </Label>
                <Input
                  id="confirmation"
                  value={confirmationPhrase}
                  onChange={(e) => setConfirmationPhrase(e.target.value)}
                  placeholder={CONFIRMATION_PHRASE}
                  className="font-mono text-sm"
                  autoComplete="off"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmationPhrase('')}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePermanentDelete}
              disabled={confirmationPhrase.toLowerCase().trim() !== CONFIRMATION_PHRASE || purging}
              className="bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            >
              {purging ? (
                <>
                  <Skull className="h-4 w-4 mr-2 animate-pulse" />
                  Deleting Forever...
                </>
              ) : (
                <>
                  <Skull className="h-4 w-4 mr-2" />
                  Permanently Delete Now
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
