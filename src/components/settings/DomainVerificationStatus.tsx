'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { DomainVerificationStatus } from '@/lib/email-verification';
import { toast } from 'sonner';

interface Props {
  domain: string;
}

export function DomainVerificationStatusCard({ domain }: Props) {
  const [status, setStatus] = useState<DomainVerificationStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  async function checkStatus() {
    setLoading(true);
    try {
      const response = await fetch(`/api/dev/test-email?domain=${encodeURIComponent(domain)}`);
      const data = await response.json();
      setStatus(data.status);
    } catch (error) {
      toast.error('Failed to check domain status');
    } finally {
      setLoading(false);
    }
  }

  async function sendTestEmail() {
    setSendingTest(true);
    try {
      const response = await fetch('/api/dev/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: 'test@example.com',
          domain,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Test email sent successfully!');
      } else {
        toast.error(`Failed to send email: ${data.error}`);
      }
    } catch (error) {
      toast.error('Failed to send test email');
    } finally {
      setSendingTest(false);
    }
  }

  const getStatusBadge = (recordStatus: string) => {
    switch (recordStatus) {
      case 'verified':
        return <Badge className="bg-green-500">Verified</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500">Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="secondary">Not Found</Badge>;
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Email Domain Verification</h3>
          <p className="text-sm text-muted-foreground">
            Check your Resend domain verification status
          </p>
        </div>

        {!status && (
          <Button onClick={checkStatus} disabled={loading}>
            {loading ? 'Checking...' : 'Check Status'}
          </Button>
        )}

        {status && (
          <>
            <Alert>
              <AlertDescription>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Domain:</span>
                    <span>{status.domain}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Overall Status:</span>
                    {getStatusBadge(status.status)}
                  </div>
                </div>
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <h4 className="text-sm font-semibold">DNS Records</h4>
              <div className="space-y-2 border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">DKIM:</span>
                  {getStatusBadge(status.records.dkim.status)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">SPF:</span>
                  {getStatusBadge(status.records.spf.status)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">DMARC:</span>
                  {getStatusBadge(status.records.dmarc.status)}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={checkStatus} variant="outline" disabled={loading}>
                Refresh
              </Button>
              <Button onClick={sendTestEmail} disabled={sendingTest}>
                {sendingTest ? 'Sending...' : 'Send Test Email'}
              </Button>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
