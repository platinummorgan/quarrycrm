# Performance Testing Setup

## Overview

Implemented a comprehensive performance testing system with demo data seeding and benchmarking capabilities.

## Files Created/Modified

### Scripts

- **`scripts/seed-demo.ts`** - Generates 10k contacts, 2k companies, 800 deals for performance testing
  - Uses fixed seed (12345) for reproducible data
  - Batched inserts for optimal performance
  - Progress indicators and timing metrics
  - Rate: ~367 records/second

### Pages

- **`app/(marketing)/speed/page.tsx`** - Performance benchmarking dashboard
  - Server endpoint timing measurements (contacts list/search, deals list)
  - UI render time measurement with `performance.now()`
  - Statistical analysis (p50, p95, p99 latencies)
  - Target performance validation

## Usage

### 1. Seed Demo Data

```bash
npm run seed:demo
```

- Generates 10,000 contacts, 2,000 companies, 800 deals
- Takes ~35 seconds on typical hardware
- Uses fixed seed for reproducible benchmarks

### 2. Run Performance Tests

1. Navigate to `/speed`
2. Click "Run Benchmarks"
3. View results with p50/p95/p99 latencies
4. Check against targets:
   - Contacts list: <120ms (p95)
   - Contacts search: <150ms (p95)
   - Companies list: <100ms (p95)
   - Companies search: <120ms (p95)
   - Deals list: <80ms (p95)
   - Deals search: <100ms (p95)

## Technical Implementation

### Demo Data Generation

- **Contacts**: 10k with realistic names, emails, phones, company links
- **Companies**: 2k with names, websites, industries, descriptions
- **Deals**: 800 with values, probabilities, stages, expected close dates
- **Weighted Distribution**: Deals distributed across sales funnel stages
- **Relationships**: Proper foreign key relationships maintained

### Benchmarking Methodology

- **Samples**: 20 requests per endpoint for statistical significance
- **Delay**: 100ms between samples to avoid server overload
- **Pagination**: Standard 50 items per page
- **Search**: Uses "test" query for consistency
- **Timing**: `performance.now()` for high-precision measurements

### Performance Targets

Based on 10k contacts dataset:

- **Contacts List**: <120ms server response time
- **Contacts Search**: <150ms server response time
- **UI Render**: Measured client-side with performance markers

## API Endpoints Tested

### Speed API Routes

- `POST /api/speed/contacts/list` - Paginated contacts list
- `POST /api/speed/contacts/search` - Contact search with query
- `POST /api/speed/companies/list` - Paginated companies list
- `POST /api/speed/companies/search` - Company search with query
- `POST /api/speed/deals/list` - Paginated deals list
- `POST /api/speed/deals/search` - Deal search with query
- `GET /api/speed/system-info` - Dataset statistics

## Database Indexes

Ensure optimal performance with these indexes (already configured):

- Contacts: `organizationId`, `ownerId`, `organizationId+email`
- Companies: `organizationId`, `ownerId`, `organizationId+name`
- Deals: `organizationId`, `ownerId`, `pipelineId`, `stageId`

## Results Interpretation

### Latency Metrics

- **p50**: Median response time (50% of requests faster)
- **p95**: 95th percentile (95% of requests faster than this)
- **p99**: 99th percentile (99% of requests faster than this)
- **Target**: p95 must be below target for "PASS"

### UI Render Times

- Measured using Performance API marks/measures
- Captures client-side rendering performance
- Requires navigation to respective pages for measurement

## Reproducibility

- **Fixed Seed**: Faker.js seed ensures identical data across runs
- **Same Hardware**: Run on consistent hardware for comparable results
- **Clean State**: Use `npm run seed:demo -- --clean` for fresh data
- **Isolated Tests**: Benchmarks run independently with delays

## Example Output

```
📈 SEED SUMMARY
  Companies: 2,000
  Contacts:  10,000
  Deals:     800
  Duration:  34.90s
  Rate:      367 records/sec
```

## Next Steps

1. **Database Optimization**: Add composite indexes if needed
2. **Query Optimization**: Analyze slow queries with EXPLAIN
3. **Caching**: Implement Redis for frequently accessed data
4. **CDN**: Serve static assets from CDN
5. **Monitoring**: Set up APM tools for production monitoring
