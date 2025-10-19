# Definition of Done (DoD) Guide

This guide explains the comprehensive validation checks required before deploying code to production.

## Quick Start

```bash
# Run all checks (recommended before committing)
npm run dod

# Skip Lighthouse (faster for local development)
npm run dod -- --skip-lighthouse

# CI mode (strict, used in GitHub Actions)
npm run dod -- --ci
```

## What is Definition of Done?

Definition of Done (DoD) is a checklist of criteria that code must meet before being considered "done" and ready for production. Our DoD ensures:

- ✅ Code quality (TypeScript, lint, tests)
- ✅ Accessibility standards (WCAG 2.1 AA)
- ✅ Performance targets (Lighthouse scores)
- ✅ Security (route protection, data isolation)

## The 8 Validation Checks

### 1. TypeScript Compilation

**What it checks**: All TypeScript code compiles without errors.

**Why it matters**: Prevents runtime type errors in production.

**How to fix**:

```bash
npm run type-check
```

Common issues:

- Missing type definitions
- Incorrect function signatures
- Type mismatches in components

### 2. Production Build

**What it checks**: Next.js can build the application for production.

**Why it matters**: Catches build-time errors that dev mode might miss.

**How to fix**:

```bash
npm run build
```

Common issues:

- Missing environment variables
- Import errors
- Invalid page exports

### 3. Lint Checks

**What it checks**: ESLint rules are followed.

**Why it matters**: Maintains code quality and consistency.

**How to fix**:

```bash
npm run lint:fix
```

Common issues:

- Unused imports
- Missing React dependencies in useEffect
- Console.log statements (use proper logging)

### 4. Unit Tests

**What it checks**: All unit tests pass.

**Why it matters**: Prevents regressions and validates functionality.

**How to fix**:

```bash
npm run test:run
```

Common issues:

- Outdated snapshots
- Mock data inconsistencies
- Async timing issues

### 5. Accessibility Violations (aXe)

**What it checks**: No critical accessibility issues on key pages.

**Why it matters**: Ensures app is usable by everyone, including people with disabilities.

**Thresholds**:

- Critical: 0 (must fix)
- Serious: ≤2
- Moderate: ≤5
- Minor: ≤10

**Tested Pages**:

- `/` - Home page
- `/contacts` - Contacts list
- `/companies` - Companies list
- `/deals` - Deals pipeline
- `/settings` - Settings page

**How to fix**:

```typescript
// ❌ Missing alt text
<img src="/logo.png" />

// ✅ Accessible image
<img src="/logo.png" alt="Company logo" />

// ❌ Non-semantic button
<div onClick={handleClick}>Click me</div>

// ✅ Semantic button
<button onClick={handleClick}>Click me</button>

// ❌ Missing label
<input type="text" />

// ✅ Accessible input
<label htmlFor="name">Name</label>
<input id="name" type="text" />
```

Common issues:

- Missing alt text on images
- Insufficient color contrast
- Missing ARIA labels
- Non-semantic HTML (divs instead of buttons)
- Missing form labels

**Learn more**: https://www.deque.com/axe/

### 6. Lighthouse Scores

**What it checks**: Performance, accessibility, best practices, SEO, and PWA scores.

**Why it matters**: Ensures fast, optimized, and well-structured application.

**Targets** (Desktop):

| Category       | Score | What it measures                         |
| -------------- | ----- | ---------------------------------------- |
| Performance    | ≥90   | Load time, FCP, LCP, CLS, TTI            |
| Accessibility  | ≥90   | WCAG compliance, ARIA, semantics         |
| Best Practices | ≥90   | HTTPS, console errors, deprecated APIs   |
| SEO            | ≥90   | Meta tags, structured data, crawlability |
| PWA            | ≥90   | Service worker, manifest, installable    |

**How to run manually**:

```bash
# Install Lighthouse CI
npm install -g @lhci/cli

# Build and run
npm run build
npm run start

# Run Lighthouse
lhci autorun
```

**How to fix**:

Performance issues:

- Optimize images (use Next.js `<Image>`)
- Remove unused JavaScript
- Enable caching headers
- Use code splitting

Accessibility issues:

- Add ARIA labels
- Improve color contrast
- Fix heading hierarchy

Best practices:

- Use HTTPS
- Remove console.log statements
- Update deprecated APIs

SEO issues:

- Add meta descriptions
- Use semantic HTML
- Add Open Graph tags

PWA issues:

- Configure service worker
- Add web manifest
- Make app installable

**Learn more**: https://developer.chrome.com/docs/lighthouse/

### 7. Route Protection

**What it checks**: All routes in `src/app/(app)/` require authentication.

**Why it matters**: Prevents unauthorized access to protected pages.

**How it works**:

- Scans all `page.tsx` files in `(app)` folder
- Checks for authentication patterns:
  - `getServerSession()`
  - `useSession()`
  - `auth()`
  - `redirect` to `/login`

**How to fix**:

```typescript
// ❌ Unprotected route
export default function ContactsPage() {
  return <div>Contacts</div>
}

// ✅ Server-side protection
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'

export default async function ContactsPage() {
  const session = await getServerSession()

  if (!session) {
    redirect('/login')
  }

  return <div>Contacts</div>
}

// ✅ Client-side protection
'use client'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'

export default function ContactsPage() {
  const { data: session, status } = useSession()

  if (status === 'unauthenticated') {
    redirect('/login')
  }

  if (status === 'loading') {
    return <div>Loading...</div>
  }

  return <div>Contacts</div>
}
```

### 8. Organization Leakage Prevention

**What it checks**: All Prisma queries filter by `organizationId`.

**Why it matters**: Prevents data leakage between organizations in multi-tenant system.

**How it works**:

- Scans all files in `src/server/trpc/routers/`
- Finds Prisma queries: `findMany`, `findFirst`, `findUnique`, `count`, `aggregate`
- Verifies `organizationId` is in the `where` clause

**Entities checked**:

- contacts
- companies
- deals
- activities
- pipelines
- webhooks
- apiKeys

**How to fix**:

```typescript
// ❌ Missing organizationId - DATA LEAKAGE!
export const list = protectedProcedure.query(async ({ ctx }) => {
  const contacts = await prisma.contact.findMany()
  return contacts // Returns ALL contacts from ALL orgs!
})

// ✅ Properly filtered by organizationId
export const list = protectedProcedure.query(async ({ ctx }) => {
  const contacts = await prisma.contact.findMany({
    where: {
      organizationId: ctx.session.user.organizationId,
    },
  })
  return contacts // Only returns contacts from user's org
})

// ✅ With additional filters
export const search = protectedProcedure
  .input(z.object({ query: z.string() }))
  .query(async ({ ctx, input }) => {
    const contacts = await prisma.contact.findMany({
      where: {
        organizationId: ctx.session.user.organizationId, // Always include!
        OR: [
          { firstName: { contains: input.query } },
          { lastName: { contains: input.query } },
        ],
      },
    })
    return contacts
  })
```

**Critical**: This is a security check. Failing this means potential data breach.

## CI/CD Integration

### GitHub Actions

The DoD script runs automatically on every push and pull request:

```yaml
# .github/workflows/ci.yml
name: CI - Definition of Done

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

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

### Pull Request Checks

When you open a PR, GitHub Actions will:

1. Run all DoD checks
2. Report results in the PR
3. Block merge if checks fail
4. Show status badge in README

### Status Badges

Add to your README:

```markdown
[![CI Status](https://github.com/your-username/quarry-crm/workflows/CI%20-%20Definition%20of%20Done/badge.svg)](https://github.com/your-username/quarry-crm/actions)
```

## Development Workflow

### Daily Development

```bash
# 1. Pull latest changes
git pull

# 2. Install dependencies
npm install

# 3. Start dev server
npm run dev

# 4. Make changes...

# 5. Before committing, run quick checks
npm run type-check
npm run lint:fix
npm run test

# 6. Run full DoD (skip Lighthouse for speed)
npm run dod -- --skip-lighthouse

# 7. Commit and push
git add .
git commit -m "feat: implement new feature"
git push
```

### Before Creating PR

```bash
# Run FULL DoD including Lighthouse
npm run build
npm run dod

# If all checks pass, create PR
gh pr create --title "feat: new feature" --body "Description"
```

### Before Deploying

```bash
# Ensure main branch is up to date
git checkout main
git pull

# Run full DoD
npm run dod

# If passed, deploy
npm run build
# ... deploy to production
```

## Customizing Thresholds

Edit `scripts/dod.ts` to adjust validation criteria:

```typescript
const CONFIG = {
  // Accessibility thresholds (number of violations allowed)
  accessibility: {
    critical: 0, // No critical violations allowed
    serious: 2, // Up to 2 serious violations
    moderate: 5, // Up to 5 moderate violations
    minor: 10, // Up to 10 minor violations
  },

  // Lighthouse thresholds (0-100 scale)
  lighthouse: {
    performance: 90, // Must score 90+ on performance
    accessibility: 90, // Must score 90+ on accessibility
    bestPractices: 90, // Must score 90+ on best practices
    seo: 90, // Must score 90+ on SEO
    pwa: 90, // Must score 90+ on PWA
  },
}
```

## Troubleshooting

### "Command not found: npm run dod"

Make sure the script is in `package.json`:

```json
{
  "scripts": {
    "dod": "tsx scripts/dod.ts"
  }
}
```

### "Cannot find module 'tsx'"

Install tsx:

```bash
npm install -D tsx
```

### "TypeScript errors in DoD script"

The DoD script is TypeScript. Ensure `tsx` can compile it:

```bash
npx tsx scripts/dod.ts
```

### "Lighthouse takes too long"

Skip Lighthouse during local development:

```bash
npm run dod -- --skip-lighthouse
```

Lighthouse runs in CI automatically.

### "All tests fail in CI but pass locally"

Environment differences:

- Check DATABASE_URL in GitHub Secrets
- Ensure test database is seeded
- Check Node.js version matches

### "Route protection false positives"

The script looks for authentication patterns. If you have a custom auth solution, update the regex in `checkRouteProtection()`:

```typescript
const hasAuth =
  content.includes('getServerSession') ||
  content.includes('useSession') ||
  content.includes('auth()') ||
  content.includes('yourCustomAuthFunction')
```

### "Organization leakage false positives"

If you have queries that legitimately don't need `organizationId` (e.g., system-level queries), add them to an allowlist in `checkOrgLeakage()`.

## Best Practices

### 1. Run DoD Before Every Commit

```bash
# Add to pre-commit hook
echo "npm run dod -- --skip-lighthouse" > .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

### 2. Fix Issues Immediately

Don't accumulate technical debt. Fix DoD failures as soon as they appear.

### 3. Monitor CI Results

Watch GitHub Actions results. If checks fail, fix them before merging.

### 4. Keep Thresholds Strict

Don't lower thresholds to pass checks. Fix the underlying issues instead.

### 5. Document Exceptions

If you must skip a check, document why:

```typescript
// Exception: This route is intentionally public
// for marketing landing page
export default function LandingPage() {
  return <div>Welcome</div>
}
```

## FAQ

**Q: Can I skip DoD checks?**
A: Locally, yes (with `--skip-lighthouse`). In CI, no. All checks must pass.

**Q: How long does DoD take?**
A: ~2-5 minutes without Lighthouse, ~10-15 minutes with Lighthouse.

**Q: Can I run checks in parallel?**
A: The script runs checks sequentially for clear output. For parallel execution, modify the script.

**Q: What if a check is not relevant to my project?**
A: Comment out that check in `scripts/dod.ts` and document why.

**Q: Can I add custom checks?**
A: Yes! Add a new function in `dod.ts` following the `CheckResult` interface.

**Q: Where can I see CI results?**
A: GitHub Actions tab in your repository: `https://github.com/your-username/quarry-crm/actions`

---

**Need Help?**

- Check the troubleshooting section above
- Review CI logs in GitHub Actions
- Open an issue with the error message and steps to reproduce
