# Security Overview

This document provides a factual summary of QuarryCRM's security practices, subprocessors, and data protection agreements. No marketing language is included.

## Key Security Facts

- All data is encrypted in transit (TLS 1.2+) and at rest (AES-256).
- Access to production systems is restricted to authorized personnel only.
- Multi-factor authentication (MFA) is enforced for all admin accounts.
- Regular vulnerability scans and penetration tests are conducted.
- Audit logs are retained for all access and administrative actions.
- Backups are performed daily and stored securely offsite.
- No customer credentials are stored in plaintext.
- All code changes are peer-reviewed and CI-tested before deployment.
- Incident response procedures are documented and tested quarterly.
- Data residency: All customer data is stored in the region selected at onboarding.

## Subprocessors

| Name     | Service        | Location | Purpose                |
| -------- | -------------- | -------- | ---------------------- |
| Upstash  | Redis hosting  | US/EU    | Rate limiting, caching |
| AWS      | Cloud hosting  | US/EU    | Infrastructure         |
| SendGrid | Email delivery | US       | Transactional email    |
| Sentry   | Error tracking | US/EU    | Monitoring             |
| Stripe   | Payments       | US/EU    | Billing                |

## Data Protection Agreement (DPA)

A copy of our Data Protection Agreement (DPA) is available for review:

- [Download DPA PDF](https://quarrycrm.com/legal/dpa.pdf)

For additional details or questions, contact security@quarrycrm.com.
