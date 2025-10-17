import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface DomainVerificationStatus {
  domain: string;
  status: 'verified' | 'pending' | 'failed' | 'not_found';
  records: {
    dkim: { status: 'verified' | 'pending' | 'failed' | 'not_found'; value?: string };
    spf: { status: 'verified' | 'pending' | 'failed' | 'not_found'; value?: string };
    dmarc: { status: 'verified' | 'pending' | 'failed' | 'not_found'; value?: string };
  };
}

export interface EmailSendResult {
  success: boolean;
  id?: string;
  error?: string;
  errorCode?: string;
}

/**
 * Get domain verification status from Resend
 */
export async function getDomainVerificationStatus(
  domain: string
): Promise<DomainVerificationStatus> {
  try {
    const response = await resend.domains.get(domain);

    if (!response) {
      return {
        domain,
        status: 'not_found',
        records: {
          dkim: { status: 'not_found' },
          spf: { status: 'not_found' },
          dmarc: { status: 'not_found' },
        },
      };
    }

    // Normalize response shape: some SDK versions return { data, error }
    const raw: any = (response as any)?.data ?? response

    return {
      domain: raw.name || domain,
      status: raw.status as 'verified' | 'pending' | 'failed' | 'not_found',
      records: {
        dkim: {
          status: (raw.records?.find((r: any) => r.record === 'DKIM')?.status ||
            'not_found') as 'verified' | 'pending' | 'failed' | 'not_found',
          value: raw.records?.find((r: any) => r.record === 'DKIM')?.value,
        },
        spf: {
          status: (raw.records?.find((r: any) => r.record === 'SPF')?.status ||
            'not_found') as 'verified' | 'pending' | 'failed' | 'not_found',
          value: raw.records?.find((r: any) => r.record === 'SPF')?.value,
        },
        dmarc: {
          status: (raw.records?.find((r: any) => r.record === 'DMARC')?.status ||
            'not_found') as 'verified' | 'pending' | 'failed' | 'not_found',
          value: raw.records?.find((r: any) => r.record === 'DMARC')?.value,
        },
      },
    };
  } catch (error: any) {
    console.error('Failed to get domain verification status:', error);
    return {
      domain,
      status: 'not_found',
      records: {
        dkim: { status: 'not_found' },
        spf: { status: 'not_found' },
        dmarc: { status: 'not_found' },
      },
    };
  }
}

/**
 * Log email send failures to console and database (optional)
 */
export async function logEmailFailure(params: {
  to: string;
  subject: string;
  error: string;
  errorCode?: string;
  organizationId?: string;
}) {
  const { to, subject, error, errorCode, organizationId } = params;

  // Log to console
  console.error('Email send failed:', {
    to,
    subject,
    error,
    errorCode,
    organizationId,
    timestamp: new Date().toISOString(),
  });

  // TODO: Optionally log to database for audit trail
  // await prisma.emailLog.create({ data: { ... } });
}
