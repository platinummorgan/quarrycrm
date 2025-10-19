# Performance Benchmarking Guide

This guide walks you through setting up and running performance benchmarks for Quarry-CRM.

## Quick Start

```bash
# 1. Generate demo data
npm run seed:demo

# 2. Start dev server
npm run dev

# 3. Navigate to http://localhost:3000/speed

# 4. Click "Run Benchmarks"
```

## Demo Data Seeder

### Basic Usage

```bash
# Generate all demo data (10k contacts, 2k companies, 800 deals)
npm run seed:demo
```

### Advanced Usage

```bash
# Clean existing data before seeding
npm run seed:demo -- --clean
```

### What Gets Created

- **10,000 Contacts**
  - Realistic names from faker
  - Valid email addresses
  - Phone numbers
  - 80% linked to companies
  - Various job titles

- **2,000 Companies**
  - Company names
  - Websites and domains
  - Industries (10 categories)
  - Descriptions (catchphrases)

- **800 Deals**
  - Deal titles
  - Value ranges ($5k-$500k)
  - 6 pipeline stages (realistic funnel):
    - Lead (40%)
    - Qualified (25%)
    - Proposal (15%)
    - Negotiation (10%)
    - Closed Won (5%)
    - Closed Lost (5%)
  - Linked to contacts and companies
  - Expected close dates

### Seeding Performance

- **Target**: Complete in <60 seconds
- **Batch Size**: 100 records per batch
- **Progress Indicators**: Real-time console output
- **Reproducible**: Uses fixed seed (12345)

### Output Example

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌱 CRM DEMO DATA SEEDER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Created demo organization
✓ Created demo user
✓ Created org member
✓ Created pipeline with stages

📊 Seeding 2,000 companies...
  Progress: 100.0% (2,000 / 2,000)
✅ Created 2,000 companies

👥 Seeding 10,000 contacts...
  Progress: 100.0% (10,000 / 10,000)
✅ Created 10,000 contacts

💰 Seeding 800 deals...
  Progress: 100.0% (800 / 800)
✅ Created 800 deals

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 SEED SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Companies: 2,000
  Contacts:  10,000
  Deals:     800
  Duration:  45.23s
  Rate:      283 records/sec

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚀 Ready for performance testing!
   Visit /speed to run benchmarks
```

## Speed Benchmark Page

### Features

1. **System Information**
   - Current record counts
   - Browser info
   - Timestamp

2. **Benchmark Runner**
   - Visual progress bar
   - Real-time results
   - 6 endpoint tests

3. **Results Display**
   - Overall pass/fail status
   - Individual endpoint metrics
   - Statistical analysis

4. **Methodology Tab**
   - Test approach explanation
   - Success criteria
   - Reproducibility guidelines
   - Known limitations

### Understanding Results

#### Metrics Explained

```
┌─────────┬────────┬────────┬────────┬────────┬────────┬────────┐
│         │  Min   │  p50   │  p95   │  p99   │  Max   │  Avg   │
├─────────┼────────┼────────┼────────┼────────┼────────┼────────┤
│ What?   │Fastest │ Median │ 95th % │ 99th % │Slowest │  Mean  │
│ Meaning │Best    │Typical │Target  │Outliers│Worst   │Overall │
└─────────┴────────┴────────┴────────┴────────┴────────┴────────┘
```

- **Min**: Best-case performance
- **p50 (Median)**: Typical request time
- **p95**: Success criteria (95% of users experience this or better)
- **p99**: Catches most outliers
- **Max**: Worst-case scenario
- **Avg**: Overall average (can hide outliers)

#### Pass/Fail Criteria

✅ **PASS**: p95 ≤ Target Latency

- Example: Contacts List p95 = 115ms (target <120ms) → PASS

❌ **FAIL**: p95 > Target Latency

- Example: Contacts Search p95 = 165ms (target <150ms) → FAIL

### Troubleshooting Poor Performance

#### If Benchmarks Fail

1. **Check Database Connection**

   ```bash
   # Test connection
   npm run db:studio
   ```

2. **Verify Indexes Exist**

   ```bash
   # Check schema is up to date
   npm run db:push
   ```

3. **Review Query Plans**
   - Use Prisma Studio to inspect queries
   - Check for missing indexes
   - Look for N+1 query problems

4. **Restart Services**

   ```bash
   # Restart dev server
   npm run dev

   # Restart PostgreSQL
   # (varies by OS)
   ```

5. **Clear Browser Cache**
   - Hard refresh (Ctrl+Shift+R / Cmd+Shift+R)
   - Open in incognito mode

#### Expected Latencies by Network

| Network                  | Additional Latency |
| ------------------------ | ------------------ |
| Localhost                | 0-5ms              |
| Local Network            | 1-10ms             |
| Cloud (same region)      | 10-50ms            |
| Cloud (different region) | 50-200ms           |

Adjust expectations based on your setup.

## Performance Monitoring in Production

### DevTools Integration

The benchmark endpoints include `performance.mark()` calls for Chrome DevTools:

1. Open DevTools (F12)
2. Go to Performance tab
3. Click Record
4. Run benchmarks
5. Stop recording
6. Search for marks: `contacts-list-sample-0`, etc.

### Custom Monitoring

Add to your production monitoring:

```typescript
// Track API latency
performance.mark('api-start')
await fetch('/api/contacts')
performance.mark('api-end')
performance.measure('api-latency', 'api-start', 'api-end')

// Get measurement
const measure = performance.getEntriesByName('api-latency')[0]
console.log(`API took ${measure.duration}ms`)
```

### Recommended Monitoring Tools

- **Sentry**: Error tracking + performance
- **Vercel Analytics**: Built-in if using Vercel
- **Datadog**: Comprehensive APM
- **New Relic**: Full-stack monitoring

## Best Practices

### Before Running Benchmarks

1. ✅ Close unnecessary browser tabs
2. ✅ Stop other apps consuming CPU/network
3. ✅ Use consistent hardware for comparisons
4. ✅ Wait for system to stabilize (1-2 min after boot)
5. ✅ Run multiple times and average results

### Interpreting Results

- **First Run**: May be slower (cold start)
- **Subsequent Runs**: Should be consistent
- **Variability >20%**: Investigate system load
- **All Fails**: Check database/network health

### Optimization Strategies

If benchmarks consistently fail:

1. **Database**
   - Add indexes to frequently queried columns
   - Use connection pooling
   - Consider read replicas for scaling

2. **Application**
   - Implement caching (Redis)
   - Optimize Prisma queries (select fewer fields)
   - Use pagination effectively

3. **Infrastructure**
   - Upgrade database hardware
   - Use CDN for static assets
   - Enable compression (gzip/brotli)

## API Endpoints

The speed page uses these benchmark endpoints:

```
POST /api/speed/contacts/list
POST /api/speed/contacts/search
POST /api/speed/companies/list
POST /api/speed/companies/search
POST /api/speed/deals/list
POST /api/speed/deals/search
GET  /api/speed/system-info
```

All endpoints return JSON with:

- `data`: Array of records
- `total`: Total count
- `page`: Current page
- `pageSize`: Items per page
- `query`: Search term (search endpoints only)

## Continuous Integration

Add benchmarks to your CI pipeline:

```yaml
# .github/workflows/performance.yml
name: Performance Tests

on: [pull_request]

jobs:
  benchmark:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run db:push
      - run: npm run seed:demo
      - run: npm run dev &
      - run: npm run test:performance
```

## FAQ

**Q: How long does seeding take?**
A: ~45-60 seconds for full dataset on modern hardware.

**Q: Can I customize the dataset size?**
A: Edit `scripts/seed-demo.ts` CONFIG values and re-run.

**Q: Are benchmarks affected by my network?**
A: Yes, especially for remote databases. Use localhost for accurate results.

**Q: What if I get timeout errors?**
A: Increase connection timeout in DATABASE_URL or reduce batch size in seed script.

**Q: Can I run benchmarks in production?**
A: Not recommended. Use staging environment with production-like data.

**Q: How do I reset the database?**
A: `npm run seed:demo -- --clean` removes all data first.

---

**Need Help?** Open an issue on GitHub with:

- Hardware specs
- Database location (local/remote)
- Benchmark results screenshot
- Console errors (if any)
