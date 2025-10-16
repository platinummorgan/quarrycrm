# PII Masking Integration Checklist

Use this checklist to integrate PII masking into your CRM application.

## Phase 1: Server-Side Integration

### API Routes

- [ ] **Contacts Routes**
  ```typescript
  // In contacts/route.ts
  import { transformContacts } from '@/lib/server/transform-pii'
  
  const contacts = await prisma.contact.findMany(...)
  const transformed = transformContacts(contacts, session)
  return NextResponse.json(transformed)
  ```

- [ ] **Companies Routes**
  ```typescript
  // In companies/route.ts
  import { transformCompanies } from '@/lib/server/transform-pii'
  
  const companies = await prisma.company.findMany(...)
  const transformed = transformCompanies(companies, session)
  return NextResponse.json(transformed)
  ```

- [ ] **Deals Routes**
  ```typescript
  // In deals/route.ts
  import { transformDeals } from '@/lib/server/transform-pii'
  
  const deals = await prisma.deal.findMany({
    include: { contact: true, company: true }
  })
  const transformed = transformDeals(deals, session)
  return NextResponse.json(transformed)
  ```

- [ ] **Activities Routes**
  ```typescript
  // In activities/route.ts
  import { transformActivities } from '@/lib/server/transform-pii'
  
  const activities = await prisma.activity.findMany(...)
  const transformed = transformActivities(activities, session)
  return NextResponse.json(transformed)
  ```

### tRPC Procedures

- [ ] **Contact Router**
  ```typescript
  // In server/routers/contact.ts
  import { transformResponse } from '@/lib/server/transform-pii'
  
  list: orgProcedure.query(async ({ ctx }) => {
    const contacts = await ctx.prisma.contact.findMany(...)
    return transformResponse(contacts, ctx.session)
  })
  ```

- [ ] **Company Router**
  ```typescript
  // In server/routers/company.ts
  import { transformResponse } from '@/lib/server/transform-pii'
  
  list: orgProcedure.query(async ({ ctx }) => {
    const companies = await ctx.prisma.company.findMany(...)
    return transformResponse(companies, ctx.session)
  })
  ```

- [ ] **Deal Router**
  ```typescript
  // In server/routers/deal.ts
  import { transformResponse } from '@/lib/server/transform-pii'
  
  list: orgProcedure.query(async ({ ctx }) => {
    const deals = await ctx.prisma.deal.findMany({
      include: { contact: true, company: true }
    })
    return transformResponse(deals, ctx.session)
  })
  ```

## Phase 2: Client-Side Integration

### UI Components

- [ ] **Contact Card**
  ```typescript
  import { maskEmail, maskPhone, isRequestFromDemo } from '@/lib/mask-pii'
  
  function ContactCard({ contact, session }) {
    const isDemo = isRequestFromDemo(session)
    return (
      <div>
        <p>{isDemo ? maskEmail(contact.email) : contact.email}</p>
        <p>{isDemo ? maskPhone(contact.phone) : contact.phone}</p>
      </div>
    )
  }
  ```

- [ ] **Contact List**
  ```typescript
  import { isRequestFromDemo } from '@/lib/mask-pii'
  
  function ContactList({ contacts, session }) {
    const isDemo = isRequestFromDemo(session)
    return (
      <>
        {isDemo && <DemoBanner />}
        {contacts.map(contact => <ContactCard contact={contact} />)}
      </>
    )
  }
  ```

- [ ] **Contact Details Page**
  - [ ] Email field
  - [ ] Phone field
  - [ ] Mobile field
  - [ ] Any other PII fields

- [ ] **Company Card**
  ```typescript
  function CompanyCard({ company, session }) {
    const isDemo = isRequestFromDemo(session)
    return (
      <div>
        <p>{isDemo ? maskEmail(company.email) : company.email}</p>
        <p>{isDemo ? maskPhone(company.phone) : company.phone}</p>
      </div>
    )
  }
  ```

- [ ] **Company Details Page**
  - [ ] Email field
  - [ ] Phone field
  - [ ] Any other PII fields

- [ ] **Deal Card**
  - [ ] Contact email (if displayed)
  - [ ] Contact phone (if displayed)
  - [ ] Company email (if displayed)
  - [ ] Company phone (if displayed)

### Custom Hooks

- [ ] **useContact Hook**
  ```typescript
  import { isRequestFromDemo } from '@/lib/mask-pii'
  
  function useContact(contactId: string) {
    const { data: session } = useSession()
    const isDemo = isRequestFromDemo(session)
    const { data: contact } = trpc.contact.getById.useQuery({ id: contactId })
    
    // Server should already mask, but double-check for safety
    return { contact, isDemo }
  }
  ```

- [ ] **useCompany Hook**
  ```typescript
  function useCompany(companyId: string) {
    const { data: session } = useSession()
    const isDemo = isRequestFromDemo(session)
    const { data: company } = trpc.company.getById.useQuery({ id: companyId })
    
    return { company, isDemo }
  }
  ```

## Phase 3: Testing

### Manual Testing

- [ ] **Create Demo User**
  - [ ] Seed demo organization: `npm run seed:demo`
  - [ ] Create demo user account
  - [ ] Verify user has `role='DEMO'` or `isDemo=true`

- [ ] **Test UI Masking**
  - [ ] Log in as demo user
  - [ ] Visit contacts page
  - [ ] Verify email shows: `m***@example.com`
  - [ ] Verify phone shows: `***-***-9231`
  - [ ] Check contact details page
  - [ ] Check companies page
  - [ ] Check deals page

- [ ] **Test API Masking**
  - [ ] Use browser DevTools Network tab
  - [ ] Inspect API response for `/api/contacts`
  - [ ] Verify response contains masked data
  - [ ] Test with regular user (should not mask)
  - [ ] Test with demo user (should mask)

### Automated Testing

- [ ] **Run Unit Tests**
  ```bash
  npm run test:run __tests__/mask-pii.test.ts
  npm run test:run __tests__/transform-pii.test.ts
  ```

- [ ] **Add Integration Tests**
  ```typescript
  // In __tests__/integration/api-masking.test.ts
  describe('API PII Masking', () => {
    it('should mask contacts for demo user', async () => {
      const response = await fetch('/api/contacts', {
        headers: { Authorization: `Bearer ${demoToken}` }
      })
      const data = await response.json()
      expect(data[0].email).toMatch(/^[a-z]\*\*\*@/)
    })
    
    it('should not mask for regular user', async () => {
      const response = await fetch('/api/contacts', {
        headers: { Authorization: `Bearer ${regularToken}` }
      })
      const data = await response.json()
      expect(data[0].email).not.toMatch(/\*\*\*/)
    })
  })
  ```

## Phase 4: Monitoring & Debugging

### Add Logging

- [ ] **Server-Side Logging**
  ```typescript
  import { getMaskingStatus } from '@/lib/server/transform-pii'
  
  export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions)
    const status = getMaskingStatus(session)
    
    console.log('[API] Masking status:', status)
    // { isDemo: true, reason: 'currentOrg.role === DEMO' }
  }
  ```

- [ ] **Client-Side Logging**
  ```typescript
  import { isRequestFromDemo } from '@/lib/mask-pii'
  
  function ContactCard({ contact, session }) {
    const isDemo = isRequestFromDemo(session)
    
    if (isDemo) {
      console.log('[UI] Demo mode active - masking PII')
    }
  }
  ```

### Debug Endpoint

- [ ] **Create Debug Route**
  ```typescript
  // In app/api/debug/masking/route.ts
  import { getMaskingStatus } from '@/lib/server/transform-pii'
  import { maskEmail, maskPhone } from '@/lib/mask-pii'
  
  export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions)
    const status = getMaskingStatus(session)
    
    return NextResponse.json({
      session: {
        email: session?.user?.email,
        role: session?.user?.currentOrg?.role,
        orgId: session?.user?.currentOrg?.id,
        isDemo: session?.user?.isDemo,
      },
      masking: status,
      examples: {
        email: {
          original: 'john.doe@example.com',
          masked: maskEmail('john.doe@example.com'),
        },
        phone: {
          original: '(404) 555-9231',
          masked: maskPhone('(404) 555-9231'),
        },
      },
    })
  }
  ```

## Phase 5: Deployment

### Pre-Deployment

- [ ] **Code Review**
  - [ ] Review all changes
  - [ ] Verify masking in all API routes
  - [ ] Verify masking in all UI components
  - [ ] Check for any hardcoded PII

- [ ] **Run Full Test Suite**
  ```bash
  npm run test:run
  npm run build
  ```

- [ ] **Test in Staging**
  - [ ] Deploy to staging environment
  - [ ] Test with demo user account
  - [ ] Test with regular user account
  - [ ] Verify masking works correctly
  - [ ] Check performance impact

### Deployment

- [ ] **Deploy to Production**
  ```bash
  git add .
  git commit -m "feat: Add PII masking for demo users"
  git push origin main
  ```

- [ ] **Post-Deployment Verification**
  - [ ] Test demo user login
  - [ ] Verify email masking: `m***@example.com`
  - [ ] Verify phone masking: `***-***-9231`
  - [ ] Check all pages (contacts, companies, deals)
  - [ ] Monitor logs for errors
  - [ ] Check performance metrics

### Documentation

- [ ] **Update README**
  - [ ] Document demo user feature
  - [ ] Add masking documentation link
  - [ ] Update API documentation

- [ ] **Update User Guide**
  - [ ] Explain demo mode
  - [ ] Show masking examples
  - [ ] Document demo user creation

## Phase 6: Maintenance

### Regular Checks

- [ ] **Weekly**
  - [ ] Review masking logs
  - [ ] Check for masking failures
  - [ ] Monitor performance impact

- [ ] **Monthly**
  - [ ] Run full test suite
  - [ ] Update documentation if needed
  - [ ] Review and update masking rules

### Future Enhancements

- [ ] **Add more PII fields**
  - [ ] Address masking
  - [ ] Social security number masking
  - [ ] Credit card masking

- [ ] **Enhance masking rules**
  - [ ] Configurable masking formats
  - [ ] Role-based masking levels
  - [ ] Field-specific masking rules

- [ ] **Add audit trail**
  - [ ] Log all PII access
  - [ ] Track demo user activities
  - [ ] Generate compliance reports

---

## Quick Reference

### Import Statements

```typescript
// Client-side
import { maskEmail, maskPhone, maskPII, isRequestFromDemo } from '@/lib/mask-pii'

// Server-side
import { 
  transformContact,
  transformContacts,
  transformCompany,
  transformCompanies,
  transformDeal,
  transformDeals,
  transformResponse,
  getMaskingStatus 
} from '@/lib/server/transform-pii'
```

### Basic Usage

```typescript
// Client component
const isDemo = isRequestFromDemo(session)
const displayEmail = isDemo ? maskEmail(email) : email

// API route
const transformed = transformContacts(contacts, session)
return NextResponse.json(transformed)

// tRPC procedure
return transformResponse(data, ctx.session)
```

### Testing

```bash
# Run PII masking tests
npm run test:run __tests__/mask-pii.test.ts
npm run test:run __tests__/transform-pii.test.ts

# Watch mode
npm test mask-pii

# Debug masking
curl http://localhost:3000/api/debug/masking
```

---

**Status**: Ready for integration
**Last Updated**: [Current Date]
**Version**: 1.0.0
