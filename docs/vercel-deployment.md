# Vercel Deployment Guide

This guide walks you through deploying the CRM application to Vercel with proper database setup and environment configuration.

## 🚀 Quick Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=YOUR_GITHUB_REPO_URL)

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **PostgreSQL Database**: Use one of these providers:
   - [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres) (recommended)
   - [Neon](https://neon.tech) (serverless PostgreSQL)
   - [Supabase](https://supabase.com) (PostgreSQL with extras)
   - [Railway](https://railway.app) (easy PostgreSQL setup)
3. **Git Repository**: Push your code to GitHub, GitLab, or Bitbucket

## Step-by-Step Deployment

### 1. Prepare Database

#### Option A: Vercel Postgres (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Link project
vercel link

# Create Postgres database
vercel postgres create crm-db

# Link database to project
vercel postgres link
```

This automatically sets the `DATABASE_URL` environment variable.

#### Option B: External Provider (Neon, Supabase, etc.)

1. Create a PostgreSQL database
2. Get the connection string (format: `postgresql://user:password@host:5432/database?sslmode=require`)
3. Save it for the environment variables step

### 2. Push to Git

```bash
# Initialize git if not already done
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - Production-ready CRM"

# Add remote (replace with your repo URL)
git remote add origin https://github.com/yourusername/crm.git

# Push to GitHub
git push -u origin main
```

### 3. Deploy to Vercel

#### Via Vercel Dashboard (Easiest)

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your Git repository
3. Configure project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
4. Add Environment Variables (see section below)
5. Click **Deploy**

#### Via Vercel CLI

```bash
# Deploy to production
vercel --prod

# Follow prompts to set up environment variables
```

### 4. Configure Environment Variables

In Vercel Dashboard → Your Project → Settings → Environment Variables, add:

#### Required Variables

| Variable | Value | Description |
|----------|-------|-------------|
| `DATABASE_URL` | `postgresql://user:pass@host:5432/db?sslmode=require` | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Generate with `openssl rand -base64 32` | Secret for NextAuth.js sessions |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` | Your production URL |

#### Optional Variables

| Variable | Value | Default |
|----------|-------|---------|
| `NODE_ENV` | `production` | Auto-set by Vercel |
| `NEXT_TELEMETRY_DISABLED` | `1` | Disable Next.js telemetry |

**Important**: Set environment variables for **Production**, **Preview**, and **Development** environments as needed.

### 5. Run Database Migrations

After first deployment:

```bash
# Install Vercel CLI if not already
npm i -g vercel

# Login
vercel login

# Link to your project
vercel link

# Run Prisma migrations
vercel env pull .env.production
npx prisma db push --skip-generate

# Or via Vercel CLI
vercel exec -- npx prisma db push
```

Alternatively, add a post-build script (already configured in `package.json`):
```json
{
  "scripts": {
    "vercel-build": "prisma generate && prisma db push --skip-generate && next build"
  }
}
```

### 6. Seed Initial Data (Optional)

For demo/testing:

```bash
# Seed demo data (10k contacts, 2k companies, 800 deals)
vercel exec -- npm run seed:demo
```

**Warning**: Only use seed data in non-production environments!

## 🔒 Security Checklist

Before going live:

- [ ] `DATABASE_URL` uses SSL connection (`?sslmode=require`)
- [ ] `NEXTAUTH_SECRET` is a strong random string (32+ characters)
- [ ] `NEXTAUTH_URL` matches your production domain
- [ ] Database has proper backups configured
- [ ] CORS settings are restricted (if using external APIs)
- [ ] Environment variables are NOT committed to git
- [ ] `.env` files are in `.gitignore`

## 🔧 Vercel Configuration

The `vercel.json` file includes:

### Build Configuration
- **Framework**: Next.js (auto-detected)
- **Node Version**: 18.x (specified in `.nvmrc`)
- **Build Command**: `npm run build`
- **Install Command**: `npm install`

### Function Configuration
- **Max Duration**: 30s for API routes
- **Region**: `iad1` (US East, change as needed)

### Security Headers
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

### Regions

Default: `iad1` (Washington D.C., USA)

Change in `vercel.json` for better latency:
```json
{
  "regions": ["sfo1"]  // San Francisco
  // or ["lhr1"]       // London
  // or ["hnd1"]       // Tokyo
  // or ["all"]        // Edge functions
}
```

## 🚨 Troubleshooting

### Build Failures

**TypeScript Errors**:
```bash
# Verify types locally
npm run type-check

# If passing locally, check Vercel build logs
```

**Missing Dependencies**:
```bash
# Ensure all deps are in package.json (not just devDependencies)
npm install --save-prod <package>
```

**Prisma Issues**:
```bash
# Ensure postinstall script runs
{
  "scripts": {
    "postinstall": "prisma generate"
  }
}
```

### Runtime Errors

**Database Connection**:
- Verify `DATABASE_URL` is set in Vercel environment variables
- Check connection string includes `?sslmode=require` for SSL
- Test connection string locally: `npx prisma db pull`

**NextAuth Issues**:
- Verify `NEXTAUTH_URL` matches deployment URL (https://your-app.vercel.app)
- Ensure `NEXTAUTH_SECRET` is set (32+ character random string)
- Check browser console for CORS errors

**API Routes Timeout**:
- Default timeout: 10s (Hobby), 60s (Pro)
- Optimize slow queries with indexes
- Use Vercel Edge Functions for faster responses

### Performance Issues

```bash
# Run performance benchmarks after deploy
npm run seed:demo  # On staging environment
# Visit https://your-app.vercel.app/speed
```

**Target Metrics**:
- Contacts list: <120ms
- Contacts search: <150ms
- Companies/Deals: <100ms

## 📊 Monitoring

### Vercel Analytics
Enable in Dashboard → Your Project → Analytics:
- Real User Monitoring (RUM)
- Web Vitals (LCP, FID, CLS)
- API route performance

### Logs
```bash
# Stream production logs
vercel logs --follow

# Filter by function
vercel logs api/contacts
```

### Database Monitoring
- **Vercel Postgres**: Built-in metrics dashboard
- **Neon**: Usage dashboard at neon.tech
- **Supabase**: Database metrics in dashboard

## 🔄 CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/ci.yml`) runs on every push:

1. **Type Check**: `npm run type-check`
2. **Linting**: `npm run lint`
3. **Build**: `npm run build`
4. **Tests**: `npm test`
5. **DoD Validation**: `npm run dod`

Vercel auto-deploys when CI passes:
- **Main branch**: Production deployment
- **Other branches**: Preview deployments

## 🎯 Post-Deployment

### 1. Create Admin User
```bash
# SSH into Vercel (or use Vercel Postgres dashboard)
vercel exec -- npm run create-admin

# Or manually in database:
# INSERT INTO "User" (email, name, role, ...) VALUES (...);
```

### 2. Configure Domain
1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Add custom domain: `app.yourcompany.com`
3. Add DNS records as shown
4. Update `NEXTAUTH_URL` to custom domain

### 3. Set Up Monitoring
- Enable Vercel Analytics
- Set up error tracking (e.g., Sentry)
- Configure uptime monitoring (e.g., UptimeRobot)

### 4. Run DoD Validation
```bash
# Verify production deployment
npm run dod -- --skip-lighthouse
```

All checks should pass! ✅

## 📚 Additional Resources

- [Vercel Next.js Documentation](https://vercel.com/docs/frameworks/nextjs)
- [Vercel Postgres Guide](https://vercel.com/docs/storage/vercel-postgres)
- [NextAuth.js Deployment](https://next-auth.js.org/deployment)
- [Prisma Deployment Guide](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-vercel)

## 🆘 Support

If you encounter issues:
1. Check [Vercel Status](https://www.vercel-status.com/)
2. Review [deployment logs](https://vercel.com/docs/concepts/deployments/logs)
3. Search [Vercel Discussions](https://github.com/vercel/vercel/discussions)
4. Consult project `docs/troubleshooting.md`

---

**Ready to Deploy?** 🚀

```bash
git push origin main
# Watch deployment at https://vercel.com/dashboard
```
