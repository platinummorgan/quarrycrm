import React from 'react';

export default function SecurityPage() {
  return (
    <main style={{ maxWidth: 700, margin: '0 auto', padding: '2rem' }}>
      <h1>Security Overview</h1>
      <ul style={{ marginBottom: '2rem' }}>
        <li>All data is encrypted in transit (TLS 1.2+) and at rest (AES-256).</li>
        <li>Access to production systems is restricted to authorized personnel only.</li>
        <li>Multi-factor authentication (MFA) is enforced for all admin accounts.</li>
        <li>Regular vulnerability scans and penetration tests are conducted.</li>
        <li>Audit logs are retained for all access and administrative actions.</li>
        <li>Backups are performed daily and stored securely offsite.</li>
        <li>No customer credentials are stored in plaintext.</li>
        <li>All code changes are peer-reviewed and CI-tested before deployment.</li>
        <li>Incident response procedures are documented and tested quarterly.</li>
        <li>Data residency: All customer data is stored in the region selected at onboarding.</li>
      </ul>
      <h2>Subprocessors</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem' }}>
        <thead>
          <tr>
            <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>Name</th>
            <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>Service</th>
            <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>Location</th>
            <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>Purpose</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Upstash</td>
            <td>Redis hosting</td>
            <td>US/EU</td>
            <td>Rate limiting, caching</td>
          </tr>
          <tr>
            <td>AWS</td>
            <td>Cloud hosting</td>
            <td>US/EU</td>
            <td>Infrastructure</td>
          </tr>
          <tr>
            <td>SendGrid</td>
            <td>Email delivery</td>
            <td>US</td>
            <td>Transactional email</td>
          </tr>
          <tr>
            <td>Sentry</td>
            <td>Error tracking</td>
            <td>US/EU</td>
            <td>Monitoring</td>
          </tr>
          <tr>
            <td>Stripe</td>
            <td>Payments</td>
            <td>US/EU</td>
            <td>Billing</td>
          </tr>
        </tbody>
      </table>
      <p>
        <a href="https://quarrycrm.com/legal/dpa.pdf" target="_blank" rel="noopener noreferrer">
          Download Data Protection Agreement (DPA) PDF
        </a>
      </p>
      <p style={{ marginTop: '2rem', fontSize: '0.95em', color: '#555' }}>
        For additional details or questions, contact <a href="mailto:security@quarrycrm.com">security@quarrycrm.com</a>.
      </p>
    </main>
  );
}
