# CRM Architecture Document

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        NEXT.JS FRONTEND                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐│
│  │Dashboard │ │ Pipeline │ │  Leads   │ │  Tasks   │ │  Auth  ││
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └───┬────┘│
│       │            │            │            │            │      │
│       └────────────┴────────────┴────────────┴────────────┘      │
│                              │                                   │
│                    ┌─────────▼─────────┐                        │
│                    │  InsForge SDK     │                        │
│                    └─────────┬─────────┘                        │
└──────────────────────────────┼──────────────────────────────────┘
                               │
┌──────────────────────────────┼──────────────────────────────────┐
│                     INSFORGE BACKEND                             │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────────┐ │
│  │   Auth     │ │ Database   │ │  Functions │ │   Realtime   │ │
│  │ (OAuth+JWT)│ │ (PostgreSQL│ │  (Workers) │ │  (WebSocket) │ │
│  └────────────┘ └────────────┘ └────────────┘ └──────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                               │
┌──────────────────────────────┼──────────────────────────────────┐
│                     EXTERNAL SERVICES                            │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐                  │
│  │   Redis    │ │   VPS      │ │   Email    │                  │
│  │  (Queues)  │ │ (Optional) │ │  Service   │                  │
│  └────────────┘ └────────────┘ └────────────┘                  │
└─────────────────────────────────────────────────────────────────┘
```

## Database Schema

### Core Tables

```sql
-- TENANTS (Multi-tenancy root)
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  plan TEXT DEFAULT 'free', -- free, pro, enterprise
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- USERS (extends auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'setter', -- admin, setter, closer
  is_active BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- LEADS
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  status TEXT DEFAULT 'new', -- new, contacted, qualified, converted, lost
  source TEXT, -- website, referral, ads, organic, cold
  value DECIMAL(12,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- DEALS (Pipeline stages)
CREATE TABLE deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  stage TEXT DEFAULT 'lead', -- lead, contacted, qualified, scheduled, closed_won, closed_lost
  value DECIMAL(12,2),
  probability INTEGER DEFAULT 0,
  expected_close_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TASKS
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  assigned_to UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'follow_up', -- follow_up, call, email, meeting, other
  status TEXT DEFAULT 'pending', -- pending, in_progress, completed, cancelled
  priority TEXT DEFAULT 'medium', -- low, medium, high, urgent
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- NOTES (Interaction history)
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'note', -- note, call, email, meeting
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ACTIVITIES (Audit log)
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL, -- lead, deal, task, note
  entity_id UUID NOT NULL,
  action TEXT NOT NULL, -- created, updated, deleted, assigned, stage_changed
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ASSIGNMENT RULES (Round robin config)
CREATE TABLE assignment_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  rule_type TEXT DEFAULT 'round_robin', -- round_robin, weighted, manual
  user_ids UUID[] DEFAULT '{}',
  weights JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register new user |
| POST | `/api/auth/signin` | Login with email/password |
| GET | `/api/auth/oauth/google` | Google OAuth |
| GET | `/api/auth/oauth/facebook` | Facebook OAuth |
| POST | `/api/auth/signout` | Logout |
| GET | `/api/auth/session` | Get current session |

### Leads
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/leads` | List leads (tenant-scoped) |
| GET | `/api/leads/:id` | Get lead details |
| POST | `/api/leads` | Create lead (+ automation) |
| PUT | `/api/leads/:id` | Update lead |
| DELETE | `/api/leads/:id` | Delete lead |
| POST | `/api/leads/:id/assign` | Assign lead to user |
| GET | `/api/leads/:id/notes` | Get lead notes |
| GET | `/api/leads/:id/tasks` | Get lead tasks |

### Deals (Pipeline)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/deals` | List deals (pipeline view) |
| GET | `/api/deals/:id` | Get deal details |
| POST | `/api/deals` | Create deal |
| PUT | `/api/deals/:id` | Update deal |
| PUT | `/api/deals/:id/stage` | Move deal to new stage |
| DELETE | `/api/deals/:id` | Delete deal |

### Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks` | List tasks |
| GET | `/api/tasks/:id` | Get task details |
| POST | `/api/tasks` | Create task |
| PUT | `/api/tasks/:id` | Update task |
| PUT | `/api/tasks/:id/complete` | Mark task complete |
| DELETE | `/api/tasks/:id` | Delete task |

### Users & Tenant
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List team members |
| GET | `/api/users/:id` | Get user details |
| PUT | `/api/users/:id` | Update user |
| GET | `/api/tenant` | Get tenant info |
| PUT | `/api/tenant` | Update tenant settings |

### Assignment Rules
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/assignment-rules` | Get assignment rules |
| POST | `/api/assignment-rules` | Create assignment rule |
| PUT | `/api/assignment-rules/:id` | Update rule |
| DELETE | `/api/assignment-rules/:id` | Delete rule |

## Automation Flow

```
┌─────────────────┐
│  Lead Created   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│ Trigger: INSERT │────▶│ Redis Queue     │
│ on leads table  │     │ lead:created    │
└─────────────────┘     └────────┬────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Worker: Assign  │     │ Worker: Create  │     │ Worker: Notify  │
│ Round Robin     │     │ Follow-up Task  │     │ Owner           │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Multi-Tenant Isolation Strategy

### 1. Database Level (RLS)
- Every table has `tenant_id`
- RLS policies enforce tenant isolation
- Users can only access data from their tenant

### 2. Application Level
- JWT contains `tenant_id` and `role`
- Middleware validates tenant access
- All queries auto-filter by tenant

### 3. Function Level
- All edge functions check tenant context
- No cross-tenant operations allowed

## Role Permissions

| Action | Admin | Closer | Setter |
|--------|-------|--------|--------|
| View all leads | ✅ | Own + Unassigned | Assigned only |
| Create leads | ✅ | ✅ | ✅ |
| Edit any lead | ✅ | Own only | Own only |
| Delete leads | ✅ | ❌ | ❌ |
| Assign leads | ✅ | Own only | ❌ |
| Manage users | ✅ | ❌ | ❌ |
| View reports | ✅ | ✅ | ❌ |
| Manage pipeline | ✅ | ✅ | Own only |

## Project Structure

```
crm/
├── insforge/
│   └── functions/
│       ├── lead-created/
│       │   └── index.ts        # Lead automation worker
│       ├── assign-lead/
│       │   └── index.ts        # Round robin assignment
│       ├── create-task/
│       │   └── index.ts        # Task creation worker
│       └── api/
│           ├── leads/
│           │   └── index.ts    # Leads CRUD API
│           ├── deals/
│           │   └── index.ts    # Deals CRUD API
│           ├── tasks/
│           │   └── index.ts    # Tasks CRUD API
│           └── auth/
│               └── index.ts    # Auth helpers
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   ├── signup/page.tsx
│   │   │   └── callback/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx           # Dashboard
│   │   │   ├── pipeline/page.tsx  # Kanban
│   │   │   ├── leads/
│   │   │   │   ├── page.tsx       # Leads list
│   │   │   │   └── [id]/page.tsx  # Lead detail
│   │   │   ├── tasks/page.tsx
│   │   │   ├── team/page.tsx
│   │   │   └── settings/page.tsx
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts
│   │       └── webhooks/route.ts
│   ├── components/
│   │   ├── ui/                    # shadcn/ui components
│   │   ├── layout/
│   │   │   ├── sidebar.tsx
│   │   │   ├── header.tsx
│   │   │   └── mobile-nav.tsx
│   │   ├── leads/
│   │   │   ├── lead-card.tsx
│   │   │   ├── lead-form.tsx
│   │   │   └── lead-list.tsx
│   │   ├── pipeline/
│   │   │   ├── pipeline-board.tsx
│   │   │   ├── pipeline-column.tsx
│   │   │   └── deal-card.tsx
│   │   └── tasks/
│   │       ├── task-card.tsx
│   │       └── task-form.tsx
│   ├── lib/
│   │   ├── insforge.ts            # InsForge client
│   │   ├── auth.ts                # Auth utilities
│   │   ├── redis.ts               # Redis client (optional)
│   │   └── utils.ts
│   ├── hooks/
│   │   ├── use-leads.ts
│   │   ├── use-deals.ts
│   │   ├── use-tasks.ts
│   │   └── use-realtime.ts
│   └── types/
│       └── index.ts               # TypeScript types
├── prisma/                        # Optional: Prisma for type safety
├── public/
├── .env.local
├── next.config.js
├── tailwind.config.js
└── package.json
```

## Redis Integration (Queues)

```typescript
// lib/queue.ts - Redis Queue Configuration
import { Queue, Worker } from 'bullmq'
import Redis from 'ioredis'

const connection = new Redis(process.env.REDIS_URL!)

// Queue definitions
export const leadQueue = new Queue('lead-processing', { connection })

// Job types
interface LeadCreatedJob {
  leadId: string
  tenantId: string
  type: 'lead_created'
}

// Worker processing
new Worker<LeadCreatedJob>(
  'lead-processing',
  async job => {
    const { leadId, tenantId } = job.data

    // Step 1: Auto-assign lead (round robin)
    await assignLeadRoundRobin(leadId, tenantId)

    // Step 2: Create follow-up task
    await createFollowUpTask(leadId, tenantId)

    // Step 3: Send notification
    await notifyOwner(leadId, tenantId)
  },
  { connection }
)

// Add job when lead is created
export async function queueLeadProcessing(leadId: string, tenantId: string) {
  await leadQueue.add('lead-created', {
    leadId,
    tenantId,
    type: 'lead_created'
  }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 }
  })
}
```

## Technology Stack Summary

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | Next.js 14+ | App router, SSR, API routes |
| UI | Tailwind + shadcn/ui | Styling, components |
| Backend | InsForge | Auth, Database, Functions |
| Database | PostgreSQL (InsForge) | Primary data store |
| Cache/Queues | Redis (optional) | Async processing |
| Realtime | InsForge Realtime | Live updates |
| Auth | InsForge Auth | OAuth + JWT |
| Deployment | VPS / InsForge Hosting | Production hosting |

## Security Considerations

1. **RLS on all tables** - Tenant isolation at DB level
2. **JWT validation** - Every request validates session
3. **CSRF protection** - Built into InsForge SDK
4. **Rate limiting** - API rate limits per tenant
5. **Input validation** - Zod schemas on all endpoints
6. **Audit logging** - All changes tracked in activities table