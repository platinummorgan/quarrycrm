# Quarry-CRM

[![CI Status](https://github.com/your-username/quarry-crm/workflows/CI%20-%20Definition%20of%20Done/badge.svg)](https://github.com/your-username/quarry-crm/actions)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A modern, browser-first CRM application built with Next.js 14, TypeScript, and cutting-edge web technologies.

## Features

- 🚀 **Next.js 14** with App Router
- 📱 **Progressive Web App** (PWA) - Install on any device
- 🔄 **Offline-First** - Works without internet connection
- 🎨 **Modern UI** - Built with Tailwind CSS and shadcn/ui
- 🔧 **Type-Safe** - Full TypeScript with strict configuration
- 🗄️ **Database** - Prisma ORM with PostgreSQL
- ⚡ **Real-time** - TanStack Query for state management
- 🔒 **Secure** - tRPC for type-safe API calls
- 🌙 **Dark Mode** - next-themes integration
- ♿ **Accessible** - WCAG compliant with SkipLinks
- 🛡️ **Error Boundaries** - Graceful error handling

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: PostgreSQL + Prisma
- **State Management**: TanStack Query + tRPC
- **Forms**: React Hook Form + Zod validation
- **Icons**: Lucide React
- **PWA**: next-pwa
- **Linting**: ESLint + Prettier

## � Analytics Configuration

Quarry CRM includes privacy-compliant analytics for marketing routes. The analytics component respects Do Not Track settings and collects no personally identifiable information.

### Supported Providers

- **PostHog** - Full-featured analytics with privacy controls
- **Plausible** - Privacy-focused, lightweight analytics
- **None** - Disable analytics entirely

### Environment Variables

Add these to your `.env.local` file:

```bash
# Analytics Configuration
NEXT_PUBLIC_ANALYTICS_PROVIDER=posthog|plausible|none
NEXT_PUBLIC_ANALYTICS_API_KEY=your_api_key_here
NEXT_PUBLIC_ANALYTICS_DOMAIN=your_domain.com
```

### PostHog Setup

1. Create a PostHog account at [posthog.com](https://posthog.com)
2. Get your Project API Key and Host from the PostHog dashboard
3. Set environment variables:
   ```bash
   NEXT_PUBLIC_ANALYTICS_PROVIDER=posthog
   NEXT_PUBLIC_ANALYTICS_API_KEY=your_posthog_api_key
   NEXT_PUBLIC_ANALYTICS_DOMAIN=your_posthog_host
   ```

### Plausible Setup

1. Create a Plausible account at [plausible.io](https://plausible.io)
2. Get your Domain Key from the Plausible dashboard
3. Set environment variables:
   ```bash
   NEXT_PUBLIC_ANALYTICS_PROVIDER=plausible
   NEXT_PUBLIC_ANALYTICS_API_KEY=your_plausible_domain_key
   NEXT_PUBLIC_ANALYTICS_DOMAIN=your_domain.com
   ```

### Privacy Features

- **Do Not Track Respect**: Analytics won't load if `navigator.doNotTrack === '1'`
- **PII Blacklisting**: PostHog automatically disables IP, email, and other PII collection
- **Marketing Only**: Analytics only loads on marketing routes (not app routes)
- **Environment Aware**: Analytics only load in production by default

## �🚀 Deployment

### Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=YOUR_GITHUB_REPO_URL)

**Quick Deploy Steps:**

1. Push your code to GitHub
2. Connect repository to Vercel
3. Add environment variables (see [Vercel Deployment Guide](./docs/vercel-deployment.md))
4. Deploy!

📚 **Full deployment guide**: [docs/vercel-deployment.md](./docs/vercel-deployment.md)

## Getting Started

### Prerequisites

- Node.js 18.17.0 or later
- PostgreSQL database
- npm or yarn

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd quarry-crm
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` with your database URL:

   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/quarry_crm"
   ```

4. **Configure email for magic link authentication**

   For local development, you can use a service like [Mailtrap](https://mailtrap.io) or [Ethereal Email](https://ethereal.email):

   **Using Mailtrap (Recommended):**
   1. Sign up for a free Mailtrap account
   2. Create an inbox and get your SMTP credentials
   3. Update `.env.local`:

   ```env
   EMAIL_SERVER_HOST="smtp.mailtrap.io"
   EMAIL_SERVER_PORT="2525"
   EMAIL_SERVER_USER="your-mailtrap-username"
   EMAIL_SERVER_PASSWORD="your-mailtrap-password"
   EMAIL_SERVER_SECURE="false"
   EMAIL_FROM="noreply@yourdomain.com"
   ```

   **Using Ethereal Email (Free):**
   1. Visit [ethereal.email](https://ethereal.email)
   2. Create an account and get SMTP credentials
   3. Use the provided credentials in your `.env.local`

   **Production:**
   Use your email provider's SMTP settings (Gmail, SendGrid, etc.)

5. **Start the development server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run type-check` - Run TypeScript type checking
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema to database
- `npm run db:migrate` - Create and run database migrations
- `npm run db:studio` - Open Prisma Studio
- `npm run seed:demo` - Generate demo data (10k contacts, 2k companies, 800 deals)
- `npm run dod` - Run Definition of Done validation checks

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (marketing)/       # Marketing pages
│   ├── (app)/             # Protected app routes
│   │   ├── contacts/      # Contact management
│   │   ├── companies/     # Company management
│   │   ├── deals/         # Deal pipeline
│   │   ├── activities/    # Activity tracking
│   │   └── settings/      # User settings
│   ├── api/               # API routes
│   ├── globals.css        # Global styles
│   └── layout.tsx         # Root layout
├── components/            # Reusable components
│   ├── ui/               # shadcn/ui components
│   └── providers/        # React providers
├── lib/                  # Utilities and configurations
│   ├── db.ts            # Database client
│   ├── auth.ts          # Authentication utilities
│   └── utils.ts         # General utilities
└── server/               # Server-side code
    └── trpc/            # tRPC configuration
```

## Database Schema

The application uses the following main entities:

- **Users** - Application users
- **Contacts** - Customer and prospect information
- **Companies** - Business relationships
- **Deals** - Sales opportunities
- **Activities** - Customer interactions and tasks

## PWA Features

Quarry-CRM is a Progressive Web App that can be installed on any device:

- **Offline Support** - Core functionality works offline
- **Installable** - Add to home screen on mobile/desktop
- **Service Worker** - Background sync and caching
- **Manifest** - Native app-like experience

## Development Guidelines

### Code Style

- Use TypeScript for all new code
- Follow the existing naming conventions
- Use the provided ESLint and Prettier configurations
- Write meaningful commit messages

### Component Structure

- Use functional components with hooks
- Implement proper TypeScript interfaces
- Follow the established design system (shadcn/ui)
- Ensure accessibility compliance

### Database Changes

- Use Prisma migrations for schema changes
- Update TypeScript types after schema changes
- Test migrations in development before committing

## Deployment

### Environment Variables

Create a `.env.local` file with:

```env
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="your-secret"
NEXTAUTH_URL="https://your-domain.com"
```

### Build Commands

```bash
npm run build
npm run start
```

### PWA Deployment

The PWA manifest and service worker are automatically configured for production builds.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## Performance Benchmarks

Quarry-CRM is designed for high performance even with large datasets. Our benchmarks target real-world usage scenarios with thousands of records.

### Benchmark Targets

| Endpoint | Target Latency (p95) | Dataset Size | Notes |
|----------|---------------------|--------------|-------|
| Contacts List | <120ms | 10,000 records | 50 items/page |
| Contacts Search | <150ms | 10,000 records | Full-text search |
| Companies List | <100ms | 2,000 records | 50 items/page |
| Companies Search | <120ms | 2,000 records | Full-text search |
| Deals List | <80ms | 800 records | 50 items/page |
| Deals Search | <100ms | 800 records | Title search |

**Success Criteria**: p95 latency (95th percentile) must be below target. This ensures 95% of requests complete faster than the target time.

### Running Benchmarks

1. **Generate Demo Data**

   ```bash
   npm run seed:demo
   ```

   This creates 10,000 contacts, 2,000 companies, and 800 deals with realistic data using a fixed seed (12345) for reproducible results.

2. **Navigate to Speed Page**

   Open [http://localhost:3000/speed](http://localhost:3000/speed) in your browser.

3. **Run Benchmarks**

   Click "Run Benchmarks" to execute all performance tests. Each benchmark:
   - Runs 20 samples for statistical significance
   - Measures latency using `performance.now()`
   - Calculates p50, p95, p99 percentiles
   - Reports min, max, and average latencies
   - Validates against target latencies

### Methodology

#### Test Approach

- **Sample Size**: 20 requests per endpoint
- **Delay Between Samples**: 100ms (prevents server overload)
- **Pagination**: Standard 50 items per page
- **Search Query**: "test" (consistent across runs)
- **Measurement**: Browser `performance.now()` API (microsecond precision)

#### Database Optimization

The application uses strategic indexes for optimal query performance:

```prisma
// Contacts
@@index([organizationId])
@@index([organizationId, email])
@@index([organizationId, firstName, lastName])

// Companies
@@index([organizationId])
@@index([organizationId, name])
@@index([organizationId, domain])

// Deals
@@index([organizationId])
@@index([pipelineId])
@@index([stageId])
@@index([organizationId, title])
```

#### Reproducibility

For consistent results across test runs:

1. **Fixed Seed**: Demo data uses seed `12345`
2. **Standard Dataset**: Always 10k/2k/800 records
3. **Same Hardware**: Run on identical environment
4. **Controlled Conditions**: Close other apps, stable network

#### Percentile Explanation

- **p50 (Median)**: 50% of requests faster than this
- **p95**: 95% of requests faster than this (our target)
- **p99**: 99% of requests faster than this
- **Min/Max**: Fastest and slowest requests
- **Avg**: Mean latency across all samples

We target **p95** instead of average because:
- Averages hide outliers that frustrate users
- p95 ensures consistent experience for 95% of users
- Industry standard for SLA agreements

### Performance Tips

#### For Development

```bash
# Clean data and reseed for fresh benchmarks
npm run seed:demo -- --clean

# Check query performance in Prisma Studio
npm run db:studio
```

#### For Production

1. **Enable Database Connection Pooling**
   ```env
   DATABASE_URL="postgresql://...?connection_limit=10&pool_timeout=20"
   ```

2. **Use CDN for Static Assets**
   - Next.js Image Optimization
   - Static file caching

3. **Monitor with DevTools**
   - Network tab for API latency
   - Performance tab for render times
   - Lighthouse for overall scores

### Hardware Considerations

Benchmark results vary based on:

- **Database Server**: CPU, RAM, SSD vs HDD
- **Network Latency**: Local vs remote database
- **Browser**: Chrome, Firefox, Safari performance
- **System Load**: Background processes, other apps

**Reference Hardware** (for baseline comparisons):
- CPU: Modern multi-core processor (e.g., Apple M1, Intel i7)
- RAM: 16GB minimum
- Storage: SSD
- Database: Local PostgreSQL 15+
- Browser: Chrome 120+

### Limitations

- **Network Variance**: Results include network round-trip time
- **Cold Starts**: First request may be slower (query planning, connection pool)
- **Database Load**: Concurrent users affect performance
- **Browser Performance**: JavaScript execution varies by device

### Interpreting Results

**✅ Pass**: p95 latency below target
- System meets performance requirements
- Scalable to production workloads

**❌ Fail**: p95 latency above target
- Check database indexes
- Review query complexity
- Consider connection pooling
- Profile slow queries with `EXPLAIN ANALYZE`

### UI Render Metrics

The `/speed` page also tracks client-side rendering:

- **Contacts List Render**: Time to display 50 contacts
- **Companies List Render**: Time to display 50 companies
- **Deals List Render**: Time to display 50 deals

These metrics use the Performance API with `performance.mark()` and `performance.measure()` for accurate timing.

## Definition of Done (DoD)

Before deploying to production, all code must pass the Definition of Done validation checks.

### Running DoD Checks

```bash
# Run all checks
npm run dod

# Skip Lighthouse (faster for local dev)
npm run dod -- --skip-lighthouse

# CI mode (strict, no skips)
npm run dod -- --ci
```

### Validation Checks

The DoD script performs 8 comprehensive checks:

#### 1. **TypeScript Compilation** ✅
- All TypeScript code compiles without errors
- Strict mode enabled
- No implicit any types

#### 2. **Production Build** 🏗️
- Next.js builds successfully
- All pages render without errors
- No missing dependencies

#### 3. **Lint Checks** 🔍
- ESLint passes with no errors
- Code follows style guide
- No unused imports or variables

#### 4. **Unit Tests** 🧪
- All tests pass
- Code coverage meets threshold
- No flaky tests

#### 5. **Accessibility Violations** ♿
Uses [axe-core](https://github.com/dequelabs/axe-core) to detect accessibility issues:

| Severity | Threshold | Description |
|----------|-----------|-------------|
| Critical | 0 | Must fix immediately |
| Serious | ≤2 | Should fix before release |
| Moderate | ≤5 | Fix in next sprint |
| Minor | ≤10 | Can defer |

**Tested Pages**: Home, Contacts, Companies, Deals, Settings

#### 6. **Lighthouse Scores** 🔦
Desktop performance targets (0-100 scale):

| Category | Target | Notes |
|----------|--------|-------|
| Performance | ≥90 | Page load, FCP, LCP, CLS |
| Accessibility | ≥90 | WCAG 2.1 AA compliance |
| Best Practices | ≥90 | HTTPS, console errors, deprecations |
| SEO | ≥90 | Meta tags, crawlability |
| PWA | ≥90 | Service worker, manifest, installable |

**How it works**:
- Runs 3 times per URL (median score)
- Tests 4 key pages
- Desktop preset (simulated throttling)

#### 7. **Route Protection** 🔐
Ensures all protected routes require authentication:

```typescript
// All routes in src/app/(app)/ must have:
- getServerSession() check
- useSession() hook
- auth() middleware
- redirect to /login if unauthorized
```

**Detects**:
- Unprotected pages in `(app)` folder
- Missing auth checks
- Potential security vulnerabilities

#### 8. **Organization Leakage Prevention** 🛡️
Validates multi-tenant data isolation:

```typescript
// All Prisma queries MUST filter by organizationId
prisma.contact.findMany({
  where: {
    organizationId: user.organizationId, // ✅ Required
    // other filters...
  }
})
```

**Scans**:
- All tRPC router files
- Prisma queries: `findMany`, `findFirst`, `findUnique`, `count`, `aggregate`
- Ensures no cross-org data leakage

**Entities Checked**:
- Contacts
- Companies
- Deals
- Activities
- Pipelines
- Webhooks
- API Keys

### CI/CD Integration

The DoD script runs automatically in GitHub Actions on every push and pull request.

#### GitHub Actions Workflow

```yaml
# .github/workflows/ci.yml
name: CI - Definition of Done

jobs:
  dod-validation:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run db:push
      - run: npm run seed:demo
      - run: npm run dod -- --ci --skip-lighthouse
```

#### Status Badges

The README displays live CI status:

```markdown
[![CI Status](https://github.com/your-username/quarry-crm/workflows/CI%20-%20Definition%20of%20Done/badge.svg)](https://github.com/your-username/quarry-crm/actions)
```

#### Separate Jobs

1. **DoD Validation**: TypeScript, build, lint, tests, route protection, org leakage
2. **Code Quality**: Prettier, ESLint, type checking
3. **Security**: npm audit for vulnerabilities

### Local Development Workflow

```bash
# 1. Write code
# 2. Run type check
npm run type-check

# 3. Fix lint issues
npm run lint:fix

# 4. Run tests
npm run test

# 5. Run full DoD before committing
npm run dod -- --skip-lighthouse

# 6. Commit and push (CI runs full DoD)
git commit -m "feat: new feature"
git push
```

### Troubleshooting DoD Failures

#### TypeScript Errors
```bash
# See detailed errors
npm run type-check

# Check specific file
npx tsc --noEmit src/path/to/file.ts
```

#### Build Failures
```bash
# Clear cache and rebuild
rm -rf .next
npm run build
```

#### Lint Errors
```bash
# Auto-fix issues
npm run lint:fix

# Check specific file
npx eslint src/path/to/file.ts
```

#### Route Protection Issues
- Add `getServerSession()` to all `(app)` pages
- Check `src/app/(app)/*/page.tsx` files
- Ensure redirect to `/login` if not authenticated

#### Org Leakage Issues
```typescript
// ❌ Missing organizationId
const contacts = await prisma.contact.findMany()

// ✅ Properly filtered
const contacts = await prisma.contact.findMany({
  where: { organizationId: ctx.session.user.organizationId }
})
```

### Configuration

Edit `scripts/dod.ts` to customize thresholds:

```typescript
const CONFIG = {
  accessibility: {
    critical: 0,
    serious: 2,
    moderate: 5,
    minor: 10,
  },
  lighthouse: {
    performance: 90,
    accessibility: 90,
    bestPractices: 90,
    seo: 90,
    pwa: 90,
  },
}
```

### Output Example

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 DEFINITION OF DONE VALIDATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1️⃣  TypeScript Compilation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ TypeScript Compilation (3245ms)
  No type errors found

2️⃣  Production Build
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Production Build (28503ms)
  Build completed successfully

3️⃣  Lint Checks
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ ESLint (4821ms)
  No lint errors

4️⃣  Unit Tests
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Unit Tests (12456ms)
  42 tests passed

5️⃣  Accessibility Violations
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Accessibility (aXe) (8234ms)
  Critical: 0/0, Serious: 1/2, Moderate: 3/5, Minor: 7/10

6️⃣  Lighthouse Scores
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Lighthouse Scores
  Skipped (--skip-lighthouse flag)

7️⃣  Route Protection
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Route Protection (1234ms)
  12 routes properly protected

8️⃣  Organization Leakage
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Organization Leakage (567ms)
  All queries properly filtered by organizationId

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 DEFINITION OF DONE SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total Checks: 8
Passed: 8
Failed: 0

✅ DEFINITION OF DONE: PASSED
All checks passed. Ready for deployment!
```

## License

This project is licensed under the MIT License.

## Support

For questions or issues, please open an issue on GitHub.
