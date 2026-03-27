# Phase 1: Foundation - Research

**Researched:** 2026-03-26
**Domain:** Next.js full-stack app scaffolding, Clerk authentication, entity management, Prisma + Neon PostgreSQL, shadcn/ui theming
**Confidence:** HIGH

## Summary

Phase 1 establishes the entire application foundation: project scaffolding (Next.js 14 App Router + TypeScript), Clerk authentication with full route protection, entity CRUD with multi-entity switching, the database schema (Prisma + Neon PostgreSQL with NUMERIC(19,4) money fields and entity_id FK scoping), RESTful API patterns with Zod validation, and the UI shell (shadcn/ui + Tailwind CSS + dark mode). Every subsequent phase builds on the patterns and infrastructure laid here.

The stack is well-established and well-documented. Clerk provides managed auth with middleware-based route protection. Neon provides managed PostgreSQL with built-in PgBouncer connection pooling ideal for Vercel serverless. Prisma maps Decimal types directly to PostgreSQL NUMERIC. shadcn/ui has a documented dark mode pattern using next-themes with CSS variables. The primary risks are Prisma Decimal serialization across the server-client boundary and ensuring entity_id scoping is enforced from the very first query.

**Primary recommendation:** Scaffold with `create-next-app@14`, install Clerk + Prisma + shadcn/ui, establish the Prisma schema with NUMERIC(19,4) and entity_id FK constraints, set up Clerk middleware to protect all routes, build the layout shell (sidebar + header + entity switcher), and implement entity CRUD with RESTful API routes validated by Zod. Build dark mode from day one using next-themes.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Collapsible left sidebar with icons + labels (toggle between expanded and icon-only mode)
- Pages in Phase 1: Dashboard (placeholder until Phase 4), Entities, Settings
- Entity switcher in the top header bar (not in sidebar)
- Sidebar collapses to give more content space for data-heavy tables in later phases
- Entity dropdown in top-right of header bar, always visible
- "All Entities" pinned at top of dropdown as default selection
- Entities grouped by type in dropdown (LPs, LLCs, Corporations, Trusts, etc.)
- Switching entities stays on current page (data refreshes, no redirect)
- Entity selection persists in localStorage across sessions
- Deactivated entities hidden from dropdown (not grayed out)
- Deactivated entities excluded from "All Entities" consolidated views
- Neon (managed PostgreSQL) -- user already uses Neon for another app
- Welcome screen on first login: "Create your first entity to get started" with entity creation form
- After creating first entity, land on dashboard
- Entity creation form asks: "Start with a template or blank?" for Chart of Accounts (COA is Phase 2 but the choice is captured at entity creation for later use)
- Fiscal year end is a required field at entity creation (default: December 31)
- Entity types: LP, LLC, Corporation, S-Corp, Trust, Foundation, Partnership, Individual, Other (free-text for Other)
- Build dark mode from day one using CSS variables and Tailwind dark: classes
- Default to OS system preference (prefers-color-scheme)
- Manual sun/moon toggle in header for override
- Persist dark mode preference in localStorage
- FOA ledger mark (teal) + "Frontier GL" text in sidebar header
- When sidebar collapsed, show just the ledger mark icon
- Subtle "Powered by Family Office Frontier" in sidebar footer
- Visual Identity: Teal #0D7377, Secondary Teal #11A3A8, Background #FAFBFC, Ink #0F1419, Body #4A5568, Muted #94A3B8
- Dark mode: Background #0F1419, Body text #8B95A5, Headings #E0E0E0, Accent Teal #0D7377
- Font: Plus Jakarta Sans only (400, 500, 600, 800), Code: JetBrains Mono
- No serifs ever, no warm ink on cool backgrounds, no cream text on dark backgrounds

### Claude's Discretion
- Loading skeleton design and patterns
- Exact spacing, padding, and component sizing
- Error state handling and toast notification design
- Settings page structure and options
- Dashboard placeholder content/empty state design
- API response format details (within RESTful + Zod constraint)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-01 | User can sign up and log in via Clerk-managed authentication | Clerk @clerk/nextjs with SignIn/SignUp components, catch-all routes, ClerkProvider |
| AUTH-02 | User session persists across browser refresh and page navigation | Clerk middleware + session management handles this automatically |
| AUTH-03 | All application routes are protected behind authentication | clerkMiddleware() + createRouteMatcher() pattern; protect all except /sign-in, /sign-up |
| ENTM-01 | User can create an entity with name, type, fiscal year end | Prisma Entity model, Zod validation schema, RESTful POST /api/entities |
| ENTM-02 | User can edit and deactivate entities | RESTful PUT /api/entities/:id with isActive soft-delete pattern |
| ENTM-03 | User can switch between entities via header dropdown without page reload | Entity selector component, localStorage persistence, React context for current entity |
| ENTM-04 | User can select "All Entities" for consolidated views | entityScope() helper that omits WHERE entityId when "all" is selected |
| ENTM-05 | Entity selection persists in localStorage across sessions | localStorage + React context hydration on mount |
| DI-01 | All money fields use NUMERIC(19,4) / Prisma Decimal | Prisma Decimal type with @db.Decimal(19,4) annotation |
| DI-02 | All financial tables include entity_id FK with entity scoping | Prisma schema relations, entityScope() middleware helper |
| UI-01 | Application uses shadcn/ui + Tailwind CSS consistently | shadcn/ui init with CSS variables, Plus Jakarta Sans via next/font, dark mode via next-themes |
| API-01 | RESTful API endpoints scoped under /api/entities/:entityId/ | Next.js Route Handlers in app/api/entities/[entityId]/ structure |
| API-02 | API validates all inputs with Zod schemas | Shared Zod schemas used in both Route Handlers and client forms |
| API-03 | Consistent JSON response format with proper HTTP status codes | Standardized response wrapper with success/error format |
</phase_requirements>

## Standard Stack

### Core (Phase 1 specific)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | ^14.2.35 | Full-stack React framework | App Router, Server Components, Route Handlers. Use 14.2.35+ to include CVE-2025-29927 patch and all subsequent security fixes. |
| React | ^18.3 | UI library | Concurrent features, Server Components. Do NOT use React 19 -- Clerk and shadcn ecosystem may lag. |
| TypeScript | ^5.4 | Type safety | Non-negotiable for financial software |
| @clerk/nextjs | ^5.x | Auth + user management | Managed auth, middleware route protection, SignIn/SignUp components |
| Prisma | ^5.14 | ORM + migrations | Type-safe queries, Decimal field maps to PostgreSQL NUMERIC natively |
| @prisma/client | ^5.14 | Database client | Runtime query engine |
| @prisma/adapter-neon | latest | Neon serverless driver | Low-latency Postgres driver for serverless/edge; GA since Prisma ORM v6.16 but compatible with v5 via preview |
| shadcn/ui | latest (CLI) | Component library | Copy-paste components, full control, accessible, built on Radix UI |
| Tailwind CSS | ^3.4 | Utility CSS | shadcn/ui targets Tailwind v3. Do NOT use Tailwind v4. |
| next-themes | latest | Dark mode | shadcn/ui's recommended dark mode solution, uses CSS class strategy |
| zod | ^3.23 | Schema validation | Type-safe validation for both client forms AND server API routes |
| react-hook-form | ^7.51 | Form state management | Performant uncontrolled inputs for entity creation/edit forms |
| @hookform/resolvers | ^3.x | Schema validation bridge | Connects Zod schemas to react-hook-form |
| sonner | ^1.4 | Toast notifications | shadcn/ui's recommended toast solution |

### Supporting (used in Phase 1)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| decimal.js | ^10.4 | Decimal arithmetic | Any money math on server or client; Prisma returns decimal.js instances natively |
| date-fns | ^3.6 | Date manipulation | Fiscal year end calculations, date formatting |
| nuqs | ^1.x | URL query state | Entity selector state in URL for bookmarkability |

### Dev Dependencies

| Library | Version | Purpose |
|---------|---------|---------|
| prisma | ^5.14 | CLI for migrations |
| eslint | ^8.x | Linting with next/core-web-vitals |
| prettier | ^3.2 | Code formatting |
| vitest | ^2.x | Unit testing |
| @testing-library/react | ^16.x | Component testing |
| @vitejs/plugin-react | latest | Vitest React support |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Next.js 14 | Next.js 15 | 15 exists but Clerk/shadcn ecosystem still primarily targets 14; 14.2.35 is stable with all security patches |
| Tailwind v3 | Tailwind v4 | v4 exists but shadcn/ui ecosystem targets v3; switching causes compatibility issues |
| Prisma | Drizzle | Drizzle has no native Decimal type handling; Prisma maps Decimal to decimal.js natively |
| next-safe-action | Plain Route Handlers | next-safe-action adds abstraction; plain Route Handlers are simpler for Phase 1 REST API requirement |

**Installation:**
```bash
# Create project
npx create-next-app@14 frontier-gl --typescript --tailwind --eslint --app --src-dir

# Core dependencies
npm install @clerk/nextjs @prisma/client decimal.js date-fns zod react-hook-form @hookform/resolvers next-themes sonner nuqs

# Dev dependencies
npm install -D prisma vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom vite-tsconfig-paths prettier

# shadcn/ui setup
npx shadcn@latest init
npx shadcn@latest add button card dialog dropdown-menu input label select separator sheet table command popover avatar badge tooltip
```

## Architecture Patterns

### Recommended Project Structure (Phase 1)

```
src/
  app/
    layout.tsx                    -- Root layout (ClerkProvider, ThemeProvider, font)
    (auth)/
      layout.tsx                  -- Authenticated layout (sidebar, header, entity context)
      dashboard/
        page.tsx                  -- Placeholder dashboard
      entities/
        page.tsx                  -- Entity list
        [entityId]/
          page.tsx                -- Entity detail/edit
        new/
          page.tsx                -- Create entity (also used for onboarding)
      settings/
        page.tsx                  -- App settings
    (public)/
      sign-in/[[...sign-in]]/
        page.tsx                  -- Clerk sign-in
      sign-up/[[...sign-up]]/
        page.tsx                  -- Clerk sign-up
    api/
      entities/
        route.ts                  -- GET (list), POST (create)
        [entityId]/
          route.ts                -- GET, PUT (edit + deactivate)
  components/
    ui/                           -- shadcn/ui components (auto-generated)
    layout/
      sidebar.tsx                 -- Collapsible navigation sidebar
      header.tsx                  -- Top bar with entity selector + theme toggle + UserButton
      entity-selector.tsx         -- Dropdown for entity switching
      theme-toggle.tsx            -- Sun/moon dark mode toggle
    entities/
      entity-form.tsx             -- Create/edit entity form
      entity-type-badge.tsx       -- Visual badge for entity type
    onboarding/
      welcome-screen.tsx          -- First-login experience
  lib/
    db/
      prisma.ts                   -- Singleton client (serverless pattern)
      scoped-query.ts             -- Entity scoping helpers
    validators/
      entity.ts                   -- Zod schemas for Entity
      api-response.ts             -- Shared API response types
    utils/
      currency.ts                 -- Decimal formatting helpers
      date.ts                     -- Fiscal year helpers
      serialization.ts            -- Prisma Decimal/Date to JSON-safe conversion
  hooks/
    use-entity.ts                 -- Entity selection context + localStorage
  providers/
    entity-provider.tsx           -- React context for current entity
  types/
    index.ts                      -- Shared TypeScript types
  middleware.ts                   -- Clerk middleware (root level)
prisma/
  schema.prisma                   -- Database schema
  migrations/                     -- Migration history
```

### Pattern 1: Clerk Middleware Route Protection

**What:** Protect all routes except sign-in and sign-up using clerkMiddleware + createRouteMatcher.
**When:** Every request to the application.
**Example:**
```typescript
// src/middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)'])

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
```
**Source:** [Clerk Middleware Docs](https://clerk.com/docs/reference/nextjs/clerk-middleware)

### Pattern 2: Prisma Singleton for Serverless

**What:** Use a singleton pattern for Prisma Client to avoid exhausting database connections on Vercel serverless.
**When:** Always -- mandatory for serverless deployments.
**Example:**
```typescript
// src/lib/db/prisma.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query"] : [],
});

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

### Pattern 3: Neon Connection Strings (Pooled + Direct)

**What:** Use two connection strings -- pooled for app runtime, direct for migrations.
**When:** Prisma schema datasource configuration.
**Example:**
```prisma
// prisma/schema.prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")       // Pooled (via PgBouncer)
  directUrl = env("DIRECT_DATABASE_URL") // Direct (for migrations)
}
```
```env
# .env.local
DATABASE_URL="postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/dbname?sslmode=require"
DIRECT_DATABASE_URL="postgresql://user:pass@ep-xxx.region.aws.neon.tech/dbname?sslmode=require"
```
**Source:** [Neon + Prisma Docs](https://neon.com/docs/guides/prisma)

### Pattern 4: Entity-Scoped Queries

**What:** Every database query for financial data must be scoped by entityId. Build a helper that enforces this.
**When:** Every API route and Server Component that touches entity-scoped data.
**Example:**
```typescript
// src/lib/db/scoped-query.ts
export function entityScope(entityId: string | "all") {
  if (entityId === "all") return {};
  return { entityId };
}

// Usage in API route
const entities = await prisma.entity.findMany({
  where: {
    ...entityScope(entityId),
    isActive: true,
  },
  orderBy: { name: "asc" },
});
```

### Pattern 5: Prisma Decimal Serialization

**What:** Prisma returns Decimal fields as Decimal.js objects which cannot be passed directly to Client Components. Centralize serialization in the data layer.
**When:** Every query that returns money fields.
**Example:**
```typescript
// src/lib/utils/serialization.ts
import { Decimal } from "@prisma/client/runtime/library";

export function serializeDecimal(value: Decimal | null): string | null {
  if (value === null) return null;
  return value.toString();
}

export function serializeEntity(entity: any) {
  return {
    ...entity,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
    // Add money field serialization when needed in later phases
  };
}
```
**Source:** [Prisma Decimal Serialization Discussion](https://github.com/vercel/next.js/discussions/55349)

### Pattern 6: Standardized API Response Format

**What:** All API routes return a consistent JSON envelope.
**When:** Every Route Handler.
**Example:**
```typescript
// src/lib/validators/api-response.ts
import { z } from "zod";

export function successResponse<T>(data: T, status = 200) {
  return Response.json({ success: true, data }, { status });
}

export function errorResponse(message: string, status = 400, errors?: z.ZodError) {
  return Response.json({
    success: false,
    error: message,
    ...(errors && { details: errors.flatten().fieldErrors }),
  }, { status });
}
```

### Pattern 7: Plus Jakarta Sans + JetBrains Mono Font Setup

**What:** Use next/font to load custom fonts with CSS variable binding for Tailwind.
**When:** Root layout.
**Example:**
```typescript
// src/app/layout.tsx
import { Plus_Jakarta_Sans } from "next/font/google";
import { JetBrains_Mono } from "next/font/google";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "800"],
  variable: "--font-plus-jakarta-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});
```
```javascript
// tailwind.config.js
const { fontFamily } = require("tailwindcss/defaultTheme");

module.exports = {
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-plus-jakarta-sans)", ...fontFamily.sans],
        mono: ["var(--font-jetbrains-mono)", ...fontFamily.mono],
      },
    },
  },
};
```
**Source:** [Next.js Font Docs](https://nextjs.org/docs/pages/api-reference/components/font), [Google Fonts](https://fonts.google.com/specimen/Plus+Jakarta+Sans)

### Pattern 8: Dark Mode with next-themes + Custom CSS Variables

**What:** Use next-themes ThemeProvider with shadcn/ui CSS variable system, overriding default colors with FOF brand palette.
**When:** Root layout setup, globals.css.
**Example:**
```css
/* globals.css -- override shadcn defaults with FOF brand */
@layer base {
  :root {
    --background: 210 20% 98%;     /* #FAFBFC */
    --foreground: 210 33% 8%;      /* #0F1419 */
    --primary: 179 80% 26%;        /* #0D7377 */
    --primary-foreground: 0 0% 100%;
    --muted-foreground: 213 18% 62%; /* #94A3B8 */
    /* ... other tokens mapped to FOF palette */
  }
  .dark {
    --background: 210 33% 8%;      /* #0F1419 */
    --foreground: 210 10% 74%;     /* #E0E0E0 headings via text classes */
    --primary: 179 80% 26%;        /* #0D7377 at full saturation */
    --muted-foreground: 213 10% 62%; /* #8B95A5 */
    /* ... dark mode tokens */
  }
}
```
**Source:** [shadcn/ui Dark Mode](https://ui.shadcn.com/docs/dark-mode/next), [shadcn/ui Theming](https://ui.shadcn.com/docs/theming)

### Anti-Patterns to Avoid

- **Floating-point money fields:** Never use `Float` or JavaScript `number` for monetary values. Use Prisma `Decimal` with `@db.Decimal(19,4)`. This must be correct from the first migration.
- **Missing entity_id on tables:** Every financial table must have `entityId` as a required FK. Forgetting it on even one table creates data isolation leaks.
- **Client-side only validation:** All Zod validation must run on both client (for UX) and server (for security). API-first means external clients bypass the UI.
- **Multiple Prisma Client instances:** In serverless, each new PrismaClient opens a new connection pool. Use the singleton pattern.
- **Inferring entityId from localStorage on server:** The server must never trust client-side localStorage. Always pass entityId explicitly in API requests.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Authentication | Custom JWT/session system | @clerk/nextjs | Managed auth with email/password, social login, MFA, session management. Building this is months of work and security risk. |
| Route protection | Custom auth middleware | clerkMiddleware() + createRouteMatcher() | Battle-tested, handles edge cases (prefetches, redirects, API routes) |
| Dark mode toggle | Custom theme system | next-themes | Handles SSR hydration mismatch, localStorage, system preference, flash-of-wrong-theme |
| Form validation | Custom validation functions | Zod + react-hook-form + @hookform/resolvers | Type inference, schema reuse, error mapping, performance |
| Toast notifications | Custom notification system | sonner (via shadcn/ui) | Accessible, styled, animation, stacking, auto-dismiss |
| Connection pooling | PgBouncer self-hosted | Neon built-in PgBouncer | Neon includes PgBouncer on the -pooler hostname. Zero configuration. |
| CSS component library | Custom components from scratch | shadcn/ui + Radix UI | Accessible, keyboard-navigable, customizable, dark mode ready |
| Font loading | Self-hosted @font-face | next/font/google | Automatic optimization, zero layout shift, self-hosted at build time |

**Key insight:** Phase 1 is almost entirely integration work -- wiring together well-tested managed services and libraries. The only custom business logic is entity CRUD and the entity switching UX. Resist the temptation to customize the auth flow, the theme system, or the form handling.

## Common Pitfalls

### Pitfall 1: Prisma Decimal JSON Serialization Error
**What goes wrong:** Prisma returns `Decimal` objects that cannot cross the Server Component to Client Component boundary. Next.js throws: `"object ("[object Decimal]") cannot be serialized as JSON"`.
**Why it happens:** Prisma Decimal is a decimal.js instance, not a plain JS value. Next.js RSC serialization only supports plain objects.
**How to avoid:** Create a centralized serialization utility. Convert all Decimal values to strings before returning from Server Components or API routes. Establish this pattern with the first model that has money fields.
**Warning signs:** Runtime error on any page that renders Prisma data with Decimal fields.

### Pitfall 2: Clerk Middleware Not Protecting API Routes
**What goes wrong:** API routes under `/api/` are not protected by Clerk because the middleware matcher doesn't cover them, or `createRouteMatcher` excludes them.
**Why it happens:** Default clerkMiddleware() is permissive -- it does not protect any routes by default. Developers must explicitly opt in to protection.
**How to avoid:** Use the "protect everything, whitelist public" pattern shown in Pattern 1. Ensure the matcher includes `/(api|trpc)(.*)`. Test by hitting an API route without auth -- it should return 401.
**Warning signs:** Unauthenticated requests to /api/ routes succeed.

### Pitfall 3: CVE-2025-29927 Middleware Bypass
**What goes wrong:** Attackers bypass Clerk middleware by manipulating the `x-middleware-subrequest` header, gaining unauthorized access to protected routes.
**Why it happens:** Vulnerability in Next.js middleware processing. Affected versions: Next.js 14.x below 14.2.26.
**How to avoid:** Use Next.js 14.2.35+ (latest 14.x as of December 2025). This is non-negotiable for an app that protects financial data.
**Warning signs:** Using any Next.js 14.x version below 14.2.26.

### Pitfall 4: Entity Selector localStorage Desync Across Tabs
**What goes wrong:** User has two browser tabs, switches entity in Tab A. Tab B still shows old entity. Data entry in Tab B goes to the wrong entity.
**Why it happens:** localStorage changes are not automatically reflected in other tabs.
**How to avoid:** Always include entityId as a required field in every API request. Server never infers entityId from anything client-side. localStorage is only for pre-selecting the dropdown on page load. Consider BroadcastChannel API for tab sync as a stretch goal.
**Warning signs:** API routes that read entityId from headers or cookies instead of request body/URL params.

### Pitfall 5: Neon Cold Start Timeout
**What goes wrong:** First request after Neon compute scales to zero takes several seconds to wake up, causing Prisma connection timeout.
**Why it happens:** Neon's free tier scales compute to zero after inactivity. Wake-up takes 2-5 seconds.
**How to avoid:** Use the pooled connection string (includes PgBouncer). Set reasonable connection timeout in Prisma datasource. In development, keep Neon compute active. For production, Neon Pro keeps compute warm.
**Warning signs:** Intermittent "Connection timed out" errors after periods of inactivity.

### Pitfall 6: Dark Mode Flash of Wrong Theme
**What goes wrong:** Page loads with light theme, then flashes to dark theme after JavaScript hydrates.
**Why it happens:** Server renders with default theme, client-side next-themes detects actual preference after hydration.
**How to avoid:** Use `suppressHydrationWarning` on `<html>` tag. Use `attribute="class"` and `disableTransitionOnChange` on ThemeProvider. next-themes injects a blocking script to set the class before paint.
**Warning signs:** Brief flash of wrong colors on page load.

## Code Examples

### Prisma Schema (Phase 1 Foundation Tables)
```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  clerkId   String   @unique
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  entities Entity[]
}

model Entity {
  id              String       @id @default(cuid())
  name            String
  type            EntityType
  typeOther       String?      // Free-text when type is OTHER
  fiscalYearEnd   String       // "MM-DD" format, e.g., "12-31"
  coaTemplate     CoaTemplate  @default(BLANK)
  isActive        Boolean      @default(true)
  createdById     String
  createdBy       User         @relation(fields: [createdById], references: [id])
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  @@index([createdById])
  @@index([isActive])
}

enum EntityType {
  LP
  LLC
  CORPORATION
  S_CORP
  TRUST
  FOUNDATION
  PARTNERSHIP
  INDIVIDUAL
  OTHER
}

enum CoaTemplate {
  TEMPLATE
  BLANK
}
```

**Note:** This schema covers Phase 1 only. Phase 2 will add Account, JournalEntry, JournalEntryLine, AccountingPeriod, and AuditLog models. The DI-01 (NUMERIC 19,4) and DI-02 (entity_id FK) requirements are structurally established here -- money fields and entity_id FKs will be added to every financial model in Phase 2.

### Entity Zod Validation Schema
```typescript
// src/lib/validators/entity.ts
import { z } from "zod";

export const entityTypeEnum = z.enum([
  "LP", "LLC", "CORPORATION", "S_CORP", "TRUST",
  "FOUNDATION", "PARTNERSHIP", "INDIVIDUAL", "OTHER",
]);

export const createEntitySchema = z.object({
  name: z.string().min(1, "Entity name is required").max(200),
  type: entityTypeEnum,
  typeOther: z.string().max(100).optional(),
  fiscalYearEnd: z.string().regex(/^\d{2}-\d{2}$/, "Must be MM-DD format"),
  coaTemplate: z.enum(["TEMPLATE", "BLANK"]).default("BLANK"),
}).refine(
  (data) => data.type !== "OTHER" || (data.typeOther && data.typeOther.length > 0),
  { message: "Please specify the entity type", path: ["typeOther"] }
);

export const updateEntitySchema = createEntitySchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type CreateEntityInput = z.infer<typeof createEntitySchema>;
export type UpdateEntityInput = z.infer<typeof updateEntitySchema>;
```

### API Route Handler Pattern
```typescript
// src/app/api/entities/route.ts
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { createEntitySchema } from "@/lib/validators/entity";
import { successResponse, errorResponse } from "@/lib/validators/api-response";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return errorResponse("Unauthorized", 401);

  const entities = await prisma.entity.findMany({
    where: { createdById: userId, isActive: true },
    orderBy: { name: "asc" },
  });

  return successResponse(entities.map(serializeEntity));
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return errorResponse("Unauthorized", 401);

  const body = await req.json();
  const result = createEntitySchema.safeParse(body);

  if (!result.success) {
    return errorResponse("Validation failed", 400, result.error);
  }

  const entity = await prisma.entity.create({
    data: { ...result.data, createdById: userId },
  });

  return successResponse(serializeEntity(entity), 201);
}
```

### Clerk Environment Variables
```env
# .env.local
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard

# Neon PostgreSQL
DATABASE_URL="postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/frontiergl?sslmode=require"
DIRECT_DATABASE_URL="postgresql://user:pass@ep-xxx.region.aws.neon.tech/frontiergl?sslmode=require"
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| authMiddleware (Clerk) | clerkMiddleware() + createRouteMatcher() | Clerk v5 (2024) | authMiddleware is deprecated; clerkMiddleware is the current API |
| Prisma raw TCP connections | @prisma/adapter-neon driver adapter | 2024-2025 | Better serverless performance with HTTP/WebSocket connections |
| shadcn toast component | sonner | 2024 | shadcn deprecated its old toast in favor of sonner |
| next/font with fontFamily config | CSS variable binding + Tailwind extend | Stable | CSS variable approach is cleaner for multiple fonts |
| Next.js 13-14 early releases | Next.js 14.2.35 | Dec 2025 | Must use 14.2.35+ for CVE-2025-29927 and subsequent security patches |

**Deprecated/outdated:**
- `authMiddleware` from Clerk: replaced by `clerkMiddleware` in @clerk/nextjs v5
- shadcn/ui built-in toast: replaced by sonner integration
- `npx shadcn-ui@latest`: now just `npx shadcn@latest`

## Open Questions

1. **Neon Free Tier Compute Sleep**
   - What we know: Free tier scales to zero after 5 minutes of inactivity; wake-up takes 2-5 seconds
   - What's unclear: Whether the user's existing Neon account has Pro tier or free tier
   - Recommendation: Use pooled connection. If cold starts are unacceptable, upgrade to Neon Pro or use Prisma Accelerate.

2. **User-Entity Relationship Model**
   - What we know: Phase 1 has a simple createdById relationship (single user creates entities)
   - What's unclear: Whether future phases need multi-user access to entities (RBAC)
   - Recommendation: For Phase 1, use simple createdById FK. The schema can be extended with a UserEntity join table later if RBAC is needed.

3. **Entity Switcher URL State vs Context State**
   - What we know: Entity selection must persist in localStorage and stay on current page
   - What's unclear: Whether to also reflect entity in URL (e.g., ?entityId=xxx) for bookmarkability
   - Recommendation: Use both -- nuqs for URL state (bookmarkable), localStorage for default on fresh load with no URL param. This enables sharing filtered views.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 2.x + React Testing Library |
| Config file | vitest.config.ts (Wave 0 -- needs creation) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run --coverage` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | Clerk sign-up/sign-in renders | integration | `npx vitest run src/__tests__/auth/sign-in.test.tsx -t "renders sign-in"` | No -- Wave 0 |
| AUTH-03 | Middleware protects routes | unit | `npx vitest run src/__tests__/middleware.test.ts` | No -- Wave 0 |
| ENTM-01 | Entity creation with validation | unit | `npx vitest run src/__tests__/entities/create-entity.test.ts` | No -- Wave 0 |
| ENTM-02 | Entity edit and deactivation | unit | `npx vitest run src/__tests__/entities/update-entity.test.ts` | No -- Wave 0 |
| ENTM-03 | Entity switching without reload | integration | `npx vitest run src/__tests__/entities/entity-selector.test.tsx` | No -- Wave 0 |
| ENTM-05 | localStorage persistence | unit | `npx vitest run src/__tests__/hooks/use-entity.test.ts` | No -- Wave 0 |
| DI-01 | Decimal fields use NUMERIC(19,4) | unit | `npx vitest run src/__tests__/schema/decimal-fields.test.ts` | No -- Wave 0 |
| API-01 | REST endpoints scoped correctly | integration | `npx vitest run src/__tests__/api/entities.test.ts` | No -- Wave 0 |
| API-02 | Zod validation rejects bad input | unit | `npx vitest run src/__tests__/validators/entity.test.ts` | No -- Wave 0 |
| API-03 | Consistent JSON response format | unit | `npx vitest run src/__tests__/api/response-format.test.ts` | No -- Wave 0 |
| UI-01 | shadcn components render correctly | smoke | `npx vitest run src/__tests__/components/ui-smoke.test.tsx` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run --coverage`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `vitest.config.ts` -- Vitest configuration with React plugin and path aliases
- [ ] `src/__tests__/setup.ts` -- Test setup (jsdom, testing-library cleanup)
- [ ] `src/__tests__/validators/entity.test.ts` -- Zod schema validation tests
- [ ] `src/__tests__/api/entities.test.ts` -- API route handler tests
- [ ] `src/__tests__/hooks/use-entity.test.ts` -- Entity context + localStorage tests
- [ ] Framework install: `npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom vite-tsconfig-paths`

## Sources

### Primary (HIGH confidence)
- [Clerk Next.js Quickstart](https://clerk.com/docs/nextjs/getting-started/quickstart) -- auth setup, middleware, route protection
- [Clerk Middleware Reference](https://clerk.com/docs/reference/nextjs/clerk-middleware) -- clerkMiddleware(), createRouteMatcher()
- [Clerk Custom Sign-In Page](https://clerk.com/docs/nextjs/guides/development/custom-sign-in-or-up-page) -- catch-all route pattern
- [Neon + Prisma Guide](https://neon.com/docs/guides/prisma) -- connection strings, pooling, directUrl
- [Neon Connection Pooling](https://neon.com/docs/connect/connection-pooling) -- PgBouncer built-in, transaction mode
- [shadcn/ui Dark Mode (Next.js)](https://ui.shadcn.com/docs/dark-mode/next) -- ThemeProvider, next-themes setup
- [shadcn/ui Theming](https://ui.shadcn.com/docs/theming) -- CSS variables, color system
- [Next.js Font Optimization](https://nextjs.org/docs/pages/api-reference/components/font) -- next/font/google usage
- [Next.js Vitest Guide](https://nextjs.org/docs/app/guides/testing/vitest) -- official testing setup

### Secondary (MEDIUM confidence)
- [Next.js Security Update Dec 2025](https://nextjs.org/blog/security-update-2025-12-11) -- 14.2.35 as latest patched 14.x
- [Prisma Decimal Serialization Discussion](https://github.com/vercel/next.js/discussions/55349) -- centralized serialization pattern
- [Centralize Prisma Serialization (Build with Matija)](https://www.buildwithmatija.com/blog/centralize-prisma-serialization-nextjs) -- repository-layer serialization
- [Dub.co Zod API Validation](https://dub.co/blog/zod-api-validation) -- Zod + Route Handler pattern

### Tertiary (LOW confidence)
- Next.js 14.2.35 as "latest 14.x" -- verified via web search but not from Next.js releases page directly; verify with `npm view next@14 version` before installing

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries are well-documented and widely used
- Architecture: HIGH -- patterns come from official docs (Clerk, Prisma, shadcn, Neon)
- Pitfalls: HIGH -- Prisma Decimal serialization and Clerk middleware patterns are well-documented; CVE is publicly documented
- Dark mode / theming: HIGH -- shadcn/ui has explicit docs for this exact setup
- Neon integration: MEDIUM -- pooled connection setup is documented but @prisma/adapter-neon version compatibility with Prisma 5.x needs verification at install time

**Research date:** 2026-03-26
**Valid until:** 2026-04-26 (30 days -- stack is stable, no major releases expected)
