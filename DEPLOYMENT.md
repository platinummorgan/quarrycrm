# Quick Vercel Deployment Reference

## 🚀 Deploy in 3 Steps

### 1. Install Vercel CLI

```powershell
npm install -g vercel
vercel login
```

### 2. Set Environment Variables

```powershell
# Generate NextAuth secret
openssl rand -base64 32

# Or on Windows without openssl:
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Add to Vercel:

- `DATABASE_URL`: Your PostgreSQL connection string with SSL
- `NEXTAUTH_SECRET`: Output from command above
- `NEXTAUTH_URL`: Your Vercel app URL

### 3. Deploy

```powershell
git add .
git commit -m "Ready for deployment"
git push origin main

# Deploy to Vercel
vercel --prod
```

## 🎯 Quick Links

- **Dashboard**: https://vercel.com/dashboard
- **Deploy Button**: Click "Deploy" in README.md
- **Full Guide**: [docs/vercel-deployment.md](./vercel-deployment.md)

## 🔧 Post-Deployment

```powershell
# Run migrations
vercel env pull .env.production
npx prisma db push

# View logs
vercel logs --follow

# Check deployment
npm run dod -- --skip-lighthouse
```

## 🆘 Common Issues

### Build Error: "Prisma Client not generated"

**Solution**: Add `postinstall` script in package.json (already included)

### Database Connection Error

**Solution**: Ensure `DATABASE_URL` includes `?sslmode=require`

### NextAuth Error: "No secret provided"

**Solution**: Set `NEXTAUTH_SECRET` in Vercel environment variables

### 404 on API Routes

**Solution**: Ensure `vercel.json` is committed to git

## 📚 Database Providers

### Vercel Postgres (Easiest)

```powershell
vercel postgres create crm-db
vercel postgres link
```

DATABASE_URL is set automatically.

### Neon (Serverless PostgreSQL)

1. Sign up at https://neon.tech
2. Create database
3. Copy connection string
4. Add `?sslmode=require` to end

### Supabase

1. Sign up at https://supabase.com
2. Create project
3. Get connection string from Settings → Database
4. Use "Connection Pooling" string for production

### Railway

1. Sign up at https://railway.app
2. New Project → PostgreSQL
3. Copy `DATABASE_URL` from variables
4. Ensure SSL is enabled

## ⚡ Performance Targets

After deployment, visit `/speed` page:

- Contacts list: < 120ms
- Contacts search: < 150ms
- Companies: < 100ms
- Deals: < 80ms

## 🔒 Security Checklist

- [ ] DATABASE_URL uses SSL (`?sslmode=require`)
- [ ] NEXTAUTH_SECRET is 32+ characters
- [ ] NEXTAUTH_URL matches production domain
- [ ] `.env` files not committed to git
- [ ] Database has backups enabled
- [ ] npm audit shows no critical vulnerabilities

## 🎓 Next Steps

1. **Custom Domain**: Vercel Dashboard → Settings → Domains
2. **Analytics**: Enable Vercel Analytics for monitoring
3. **Team Access**: Invite team members in settings
4. **CI/CD**: GitHub Actions runs on every push
5. **Monitoring**: Set up error tracking (Sentry, LogRocket)

---

**Need help?** See [docs/vercel-deployment.md](./vercel-deployment.md) for the complete guide.
