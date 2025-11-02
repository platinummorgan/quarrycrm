# Quarry CRM → Contractor CRM Transformation Roadmap

**Current Status:** You have a solid B2B sales CRM foundation  
**Target:** Contractor-focused lead & job management system  
**Gap:** ~40% complete for contractor use case

---

## 🎯 Current State Assessment

### ✅ What You Already Have (Reusable)

| Feature | Current Status | Contractor Fit |
|---------|---------------|----------------|
| **Contacts** | Full CRUD, companies, activities | ✅ Perfect - just rename "Contacts" → "Leads" |
| **Pipeline/Stages** | Kanban board, drag-drop, custom pipelines | ✅ 80% there - need simpler default flow |
| **Activities** | Notes, calls, emails, tasks | ✅ Great foundation - needs follow-up focus |
| **Tasks** | Due dates, overdue tracking | ✅ Excellent - already contractor-friendly |
| **Mobile UI** | Responsive design, PWA-ready | ✅ Good bones for mobile-first |
| **Search** | Global search, filters | ✅ Works as-is |
| **Import/Export** | CSV import, bulk operations | ✅ Perfect for switching from spreadsheets |

### ❌ What's Missing (Critical for Contractors)

| Feature | Status | Priority | Effort |
|---------|--------|----------|--------|
| **Lead Quick-Add** | ❌ None | 🔴 Critical | 4 hours |
| **Today's Follow-ups Dashboard** | ❌ None | 🔴 Critical | 8 hours |
| **SMS Templates** | ❌ None | 🔴 Critical | 12 hours |
| **Job Tracking** | ❌ None | 🔴 Critical | 16 hours |
| **Photo Uploads** | ❌ None | 🟡 High | 8 hours |
| **Lead Source Tracking** | ❌ None | 🟡 High | 4 hours |
| **Simple Quoting** | ❌ None | 🟢 Phase 2 | 20 hours |
| **Job Calendar** | ❌ None | 🟢 Phase 2 | 12 hours |

### ⚠️ What Needs Simplification

| Current Feature | Issue | Fix |
|----------------|-------|-----|
| **Deals terminology** | Too corporate ("deals", "opportunities") | Rename to "Leads" → "Jobs" |
| **Pipeline complexity** | 6 stages, probability %, expected close | Simplify to 4 stages: New → Contacted → Quoted → Won/Lost |
| **Companies** | Separate entity, corporate-focused | Make optional, focus on individual homeowners |
| **Activities UI** | Too formal (meeting types, subjects) | Simplify to: Note, Call, Text, Photo |
| **Navigation** | Too many sections | Consolidate: Leads, Jobs, Follow-ups, Settings |

---

## 📋 Detailed Transformation Plan

### Phase 1: Core MVP (40 hours - 1 week sprint)

#### 1.1 Simplify Pipeline (4 hours)
**Goal:** Make the default pipeline contractor-friendly

**Changes:**
```typescript
// src/lib/contractor-defaults.ts
export const CONTRACTOR_PIPELINE = {
  name: "Lead Pipeline",
  stages: [
    { name: "New Lead", color: "#3b82f6", order: 0 },
    { name: "Contacted", color: "#10b981", order: 1 },
    { name: "Quoted", color: "#f59e0b", order: 2 },
    { name: "Won", color: "#22c55e", order: 3 },
    { name: "Lost", color: "#ef4444", order: 4 },
  ]
}

export const LEAD_SOURCES = [
  "Google Search",
  "Referral",
  "Yard Sign",
  "Facebook",
  "Repeat Customer",
  "Angi/HomeAdvisor",
  "Other"
]
```

**Files to modify:**
- `prisma/schema.prisma` - Add `leadSource` to Deal model
- `src/components/deals/Board.tsx` - Hide probability%, simplify UI
- `scripts/seed-demo.ts` - Use contractor pipeline by default

#### 1.2 Lead Quick-Add Button (4 hours)
**Goal:** Add lead in 30 seconds from anywhere

**New Component:**
```tsx
// src/components/leads/QuickAddLead.tsx
export function QuickAddLead() {
  // Float button fixed to bottom-right on mobile
  // Modal with: Name, Phone, Address, Job Type, Lead Source
  // One-click save → auto-sets to "New Lead" stage
  // Optional: Voice-to-text for notes (browser API)
}
```

**Add to:**
- Dashboard
- Leads page
- Mobile nav bar

#### 1.3 Today's Follow-ups Dashboard (8 hours)
**Goal:** Home screen shows ONLY today's tasks + overdue

**New Page:**
```tsx
// src/app/(app)/follow-ups/page.tsx
export default async function FollowUpsPage() {
  // Show:
  // - Overdue tasks (red)
  // - Due today (yellow)
  // - Quick actions: "Mark called", "Set next follow-up"
  // - One-click SMS/call buttons
}
```

**Make this the default home:**
- Change nav to show "Follow-ups" first
- Redirect `/app` → `/app/follow-ups`

#### 1.4 SMS Templates (12 hours)
**Goal:** Send common messages in 2 clicks

**Backend Setup:**
```env
# .env.local
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=...
```

**New Feature:**
```typescript
// src/lib/sms-templates.ts
export const SMS_TEMPLATES = {
  initial_contact: "Hi {name}, this is {your_name} from {company}. Got your request for {job_type}. When's a good time to chat about your project?",
  quote_ready: "Hi {name}! Your quote for {job_type} is ready: {quote_amount}. I can email it over or discuss by phone - what works best?",
  follow_up: "Hi {name}, just checking in on the {job_type} quote we discussed. Any questions I can answer?",
  job_scheduled: "Hi {name}! We're all set for {date}. I'll text you the morning of with our arrival time.",
}
```

**UI:**
- SMS button on lead detail page
- Template picker modal
- Variable auto-fill from lead data
- Send + log activity in one action

#### 1.5 Job Tracking (16 hours)
**Goal:** Convert won lead to active job

**Schema Changes:**
```prisma
// prisma/schema.prisma
enum JobStatus {
  SCHEDULED
  IN_PROGRESS
  COMPLETED
  PAID
}

model Job {
  id            String      @id @default(cuid())
  leadId        String      @unique
  status        JobStatus   @default(SCHEDULED)
  startDate     DateTime?
  endDate       DateTime?
  crew          String?     // Simple text field
  jobValue      Float?
  paidAmount    Float?      @default(0)
  notes         String?
  lead          Deal        @relation(fields: [leadId], references: [id])
  // ... rest
}
```

**New Jobs Page:**
```tsx
// src/app/(app)/jobs/page.tsx
// Show active jobs in card view
// Quick filters: Scheduled, In Progress, Awaiting Payment
// Click job → detail page with timeline
```

---

### Phase 2: Polish & Power Features (30 hours - 1 week)

#### 2.1 Photo Uploads (8 hours)
- Add photo upload to activities
- Before/after photo gallery on job detail
- Mobile camera capture
- Compress images client-side (to avoid huge uploads)

#### 2.2 Lead Source Analytics (4 hours)
- Simple report: "Which sources bring the most jobs?"
- Bar chart: Leads by source
- Conversion rate by source

#### 2.3 Mobile Voice Notes (6 hours)
- Use browser Speech-to-Text API
- "Tap to record" button on quick-add
- Auto-transcribe and save as note

#### 2.4 Click-to-Call & Click-to-Text (4 hours)
- Phone numbers become `tel:` links
- SMS button opens pre-filled message
- Log call/text activity automatically

#### 2.5 Simple Quoting (12 hours)
- Line item builder (material + labor)
- Save as PDF
- Email quote directly from app
- Track: Sent, Viewed, Accepted

#### 2.6 Job Calendar (12 hours)
- Monthly view of scheduled jobs
- Drag-drop to reschedule
- Color-coded by status
- Export to Google Calendar

---

## 🎨 UI/UX Simplification Plan

### Navigation Before/After

**Before (Current):**
```
Dashboard | Contacts | Companies | Deals | Activities | Settings
```

**After (Contractor):**
```
Follow-ups | Leads | Jobs | Reports | Settings
```

### Terminology Changes

| Old (B2B) | New (Contractor) |
|-----------|------------------|
| Contacts | Leads |
| Deals | Leads → Jobs |
| Companies | (Hidden by default) |
| Pipeline | Lead Pipeline |
| Stage | Status |
| Activities | Notes & Follow-ups |
| Expected Close Date | Follow-up Date |
| Deal Value | Job Value |

### Mobile-First Changes
1. **Bigger tap targets** - 48px minimum
2. **Bottom nav** - Fixed follow-ups/add buttons
3. **One-handed actions** - Key buttons at thumb reach
4. **Fewer fields** - Only essential info on mobile
5. **Auto-fill** - Use device location for address

---

## 🚀 Quick Wins (Do These First!)

### This Weekend (8 hours total)

1. **Rename everything** (2 hours)
   - Global find/replace: "Deal" → "Lead"
   - Update nav labels
   - Change page titles

2. **Simplify pipeline** (2 hours)
   - Create contractor default pipeline
   - Hide probability% and expected close
   - Add lead source dropdown

3. **Make follow-ups the home page** (2 hours)
   - Redirect /app → /app/follow-ups
   - Filter tasks to show "due today" + overdue
   - Add "Mark called" quick action

4. **Add quick-add button** (2 hours)
   - Fixed fab button (mobile)
   - Minimal modal: name, phone, job type
   - Save to "New Lead" stage

### Next Weekend (12 hours)

5. **SMS integration** (6 hours)
   - Set up Twilio
   - Add 3 SMS templates
   - SMS button on lead detail

6. **Photo uploads** (4 hours)
   - Add to activity composer
   - Show in timeline

7. **Job tracking basics** (2 hours)
   - "Convert to Job" button on won leads
   - Simple job list page

---

## 💰 Pricing Strategy (Implementation)

### Recommended Approach
**Single Tier: $79/month**
- Unlimited leads
- Unlimited users
- All features included
- 14-day free trial (no CC required)

### Technical Implementation

```typescript
// src/lib/plans.ts
export const CONTRACTOR_PLAN = {
  name: "Contractor Pro",
  price: 79,
  features: [
    "Unlimited leads & jobs",
    "Unlimited team members",
    "SMS notifications",
    "Photo storage (50GB)",
    "Mobile app (PWA)",
    "Email & phone support"
  ],
  limits: {
    leads: -1,      // unlimited
    users: -1,      // unlimited
    storage: 50_000_000_000, // 50GB
    sms_per_month: 1000,
  }
}
```

### Trial Logic
```typescript
// Add to Organization model
model Organization {
  // ... existing fields
  trialEndsAt DateTime?
  stripeCustomerId String?
  stripeSubscriptionId String?
}

// Middleware check
if (!org.stripeSubscriptionId && org.trialEndsAt < new Date()) {
  return redirect('/billing/upgrade')
}
```

---

## 📊 Success Metrics (What to Track)

### Core KPIs
1. **Time to add lead** - Target: < 30 seconds
2. **Follow-up completion rate** - Target: > 80%
3. **Lead → Job conversion** - Target: > 25%
4. **Active daily users** - Target: > 70%

### Feature Usage
- % using SMS templates
- % uploading photos
- Avg follow-ups per lead
- Most common lead sources

---

## 🛠️ Technical Debt to Address

### Before Launch
1. **Remove/hide unused features:**
   - Companies page (make optional)
   - Complex pipeline features (probability, revenue forecasting)
   - Activity types: Meeting, Email (contractors rarely use)

2. **Performance:**
   - Image compression for photo uploads
   - Lazy load job history
   - Cache follow-up counts

3. **Mobile testing:**
   - Test on real Android/iOS devices
   - Ensure offline-first works
   - PWA install flow

---

## 📝 Marketing Copy Changes

### Current (B2B SaaS)
> "Modern CRM for the Browser Era"

### New (Contractor-Focused)
> "Never Lose a Lead Again"
> 
> The only CRM built for contractors who live in their trucks.
> Add leads in seconds. Get reminded to follow up. Win more jobs.

### Feature Headlines
- ❌ "Pipeline Management" → ✅ "Track Every Lead"
- ❌ "Activity Tracking" → ✅ "Never Forget to Follow Up"
- ❌ "Contact Management" → ✅ "All Your Leads in One Place"
- ❌ "Deal Stages" → ✅ "See Where Every Job Stands"

---

## 🎯 Next Steps (Prioritized)

### Start Here (This Week)
1. [x] Create this roadmap
2. [ ] Rename "Deals" → "Leads" everywhere
3. [ ] Create contractor default pipeline
4. [ ] Add quick-add lead button
5. [ ] Make follow-ups the home page

### Week 2
6. [ ] Integrate Twilio for SMS
7. [ ] Add SMS templates
8. [ ] Add photo uploads

### Week 3
9. [ ] Build job tracking
10. [ ] Add lead source analytics
11. [ ] Mobile polish pass

### Week 4
12. [ ] Beta test with 5 contractors
13. [ ] Fix top 10 issues
14. [ ] Prepare marketing site

---

## 🚨 What NOT to Build (Avoid Scope Creep!)

- ❌ Accounting/bookkeeping
- ❌ Inventory management
- ❌ Employee time tracking
- ❌ Customer portal
- ❌ Built-in payments
- ❌ Marketing automation
- ❌ Complex project management (Gantt charts)

Contractors use QuickBooks for accounting, they don't need it in the CRM.

---

## 💡 Key Design Principles

1. **Speed Over Features**
   - Every action should be 1-2 clicks max
   - No "wizard" flows or multi-step forms
   - Keyboard shortcuts for power users

2. **Forgiveness**
   - Everything is editable later
   - No required fields except name & phone
   - Easy undo

3. **Plain Language**
   - No jargon ("conversion funnel" → "leads I closed")
   - No abbreviations contractors don't use
   - Obvious labels, not clever ones

4. **Mobile-First**
   - Test every feature on phone first
   - One-handed operation
   - Big buttons

---

## 📞 How to Validate This (Before Building)

### Talk to 10 Contractors
Ask:
1. "How do you track leads today?" (pen & paper? spreadsheet? app?)
2. "What's the most annoying part of that system?"
3. "How do you remember to follow up with leads?"
4. "Would you pay $79/month to never lose a lead again?"

### Red Flags
- "I need to integrate with my accounting software" → Scope creep
- "Can it track my crews' time?" → Different product
- "I need proposals with line items" → Phase 2, not MVP

### Green Lights
- "I lose leads all the time because I forget to call back"
- "I have a notebook full of leads but no system"
- "I wish I knew which ads were actually bringing me jobs"

---

## 📂 Code Files to Create/Modify

### Immediate (Phase 1)
```
CREATE:
- src/lib/contractor-defaults.ts
- src/components/leads/QuickAddLead.tsx
- src/app/(app)/follow-ups/page.tsx
- src/lib/sms-templates.ts
- src/app/api/sms/send/route.ts
- src/app/(app)/jobs/page.tsx

MODIFY:
- prisma/schema.prisma (add Job model, leadSource)
- src/app/(app)/layout.tsx (change nav)
- src/app/(app)/deals/page.tsx (rename to leads)
- src/components/deals/Board.tsx (simplify UI)
- scripts/seed-demo.ts (contractor pipeline)
```

### Phase 2
```
CREATE:
- src/components/activities/PhotoUpload.tsx
- src/components/jobs/JobCalendar.tsx
- src/components/quotes/QuoteBuilder.tsx
- src/app/(app)/reports/page.tsx

MODIFY:
- src/components/activities/activity-composer.tsx (add photo)
- src/app/(app)/app/page.tsx (make follow-ups home)
```

---

## ✅ Definition of "Done" for MVP

MVP is ready when a contractor can:
1. ✅ Add a new lead in < 30 seconds (mobile)
2. ✅ See today's follow-ups on home screen
3. ✅ Send a pre-written SMS to a lead in 2 clicks
4. ✅ Convert a won lead to an active job
5. ✅ Upload before/after photos to a job
6. ✅ See which lead sources are working best

Total estimated effort: **70 hours** (2 weeks full-time, or 4 weekends)

---

## 🎉 Go/No-Go Decision

### You Should Build This If:
- ✅ You can commit 2-4 weeks to MVP
- ✅ You can get 5 contractors to test it
- ✅ You're okay starting with 1 vertical (contractors)
- ✅ You can handle support (contractors call, not email)

### Hold Off If:
- ❌ You want to keep it a "general CRM"
- ❌ You can't afford to strip out B2B features
- ❌ You need it to work for every industry
- ❌ You don't have time to talk to contractors

---

**Ready to start?** Pick 3 tasks from "Start Here" and knock them out this weekend. The rest will follow.
