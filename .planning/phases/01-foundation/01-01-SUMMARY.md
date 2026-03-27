---
phase: 01-foundation
plan: 01
subsystem: infra
tags: [nextjs, clerk, prisma, shadcn-ui, tailwind, vitest, next-themes, sonner]

# Dependency graph
requires:
  - phase: none
    provides: greenfield project
provides:
  - Next.js 15 app with TypeScript, Tailwind CSS v4, App Router
  - Clerk authentication with route protection middleware
  - Prisma v7 schema with User and Entity models and enums
  - shadcn/ui component library with FOF brand theming
  - Dark mode via next-themes with system preference detection
  - Plus Jakarta Sans and JetBrains Mono fonts
  - Vitest test framework configured
  - .env.local.example documenting all required env vars
affects: [01-02, 01-03, 02-accounting-engine, all-future-phases]

# Tech tracking
tech-stack:
  added: [next@15.5.14, @clerk/nextjs@7, @prisma/client@7, @prisma/adapter-pg, shadcn@4, next-themes, sonner, vitest@4, zod@4, react-hook-form, nuqs, decimal.js, date-fns]
  patterns: [app-router-route-groups, clerk-middleware-v5, prisma-v7-adapter-pattern, css-variable-theming-oklch, font-css-variables]

key-files:
  created:
    - src/middleware.ts
    - prisma/schema.prisma
    - prisma.config.ts
    - src/lib/db/prisma.ts
    - src/app/(public)/sign-in/[[...sign-in]]/page.tsx
    - src/app/(public)/sign-up/[[...sign-up]]/page.tsx
    - src/app/(public)/layout.tsx
    - src/app/(app)/dashboard/page.tsx
    - vitest.config.ts
    - src/__tests__/setup.ts
    - .env.local.example
  modified:
    - src/app/globals.css
    - src/app/layout.tsx
    - src/app/page.tsx
    - package.json

key-decisions:
  - "Upgraded from Next.js 14 to Next.js 15 due to Clerk v7 peer dependency requirement"
  - "Used Prisma v7 adapter pattern (PrismaPg) instead of connection string in schema, per v7 API changes"
  - "Used oklch color format for CSS variables (Tailwind CSS v4 and shadcn v4 standard)"
  - "Removed directUrl from prisma.config.ts as Prisma v7 datasource config does not support it"

patterns-established:
  - "Route groups: (public) for unauthenticated routes, (app) for authenticated routes"
  - "Prisma singleton: globalForPrisma pattern with adapter for serverless hot-reload"
  - "Font strategy: CSS variables --font-plus-jakarta-sans and --font-jetbrains-mono applied to html element"
  - "Theme: oklch CSS variables in :root (light) and .dark (dark) with FOF brand palette"
  - "Schema conventions: NUMERIC(19,4) for money fields, entityId FK for data scoping (documented in comments)"

requirements-completed: [AUTH-01, AUTH-02, AUTH-03, DI-01, DI-02, UI-01]

# Metrics
duration: 11min
completed: 2026-03-27
---

# Phase 1 Plan 1: Foundation Scaffold Summary

**Next.js 15 app with Clerk auth middleware, Prisma v7 Entity schema, shadcn/ui FOF brand theming, dark mode, and Vitest**

## Performance

- **Duration:** 11 min
- **Started:** 2026-03-27T01:24:11Z
- **Completed:** 2026-03-27T01:35:11Z
- **Tasks:** 3
- **Files modified:** 36 (including shadcn/ui components)

## Accomplishments
- Next.js 15 app scaffolded with full dependency stack (Clerk, Prisma, shadcn/ui, Vitest)
- Clerk authentication protecting all routes with middleware; sign-in/sign-up pages rendering Clerk components
- Prisma v7 schema with User and Entity models, EntityType/CoaTemplate enums, documented conventions for future phases
- FOF brand identity applied: teal #0D7377 primary, Plus Jakarta Sans font, dark mode with system preference detection
- 15 shadcn/ui components installed (button, card, dialog, dropdown-menu, input, label, select, separator, sheet, table, command, popover, avatar, badge, tooltip)

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold Next.js project, install dependencies, configure shadcn/ui** - `15e40b3` (feat)
2. **Task 2: Clerk auth middleware and sign-in/sign-up pages** - `ee8a0fc` (feat)
3. **Task 3: Prisma schema, singleton client, Vitest setup** - `62abc74` (feat)

## Files Created/Modified
- `src/app/layout.tsx` - Root layout with ClerkProvider, ThemeProvider, fonts, metadata
- `src/app/globals.css` - FOF brand oklch CSS variables for light and dark modes
- `src/app/page.tsx` - Redirect to /dashboard
- `src/app/(app)/dashboard/page.tsx` - Placeholder dashboard page
- `src/middleware.ts` - Clerk middleware protecting all routes except /sign-in, /sign-up
- `src/app/(public)/layout.tsx` - Centered layout for auth pages
- `src/app/(public)/sign-in/[[...sign-in]]/page.tsx` - Clerk SignIn component page
- `src/app/(public)/sign-up/[[...sign-up]]/page.tsx` - Clerk SignUp component page
- `prisma/schema.prisma` - User/Entity models, EntityType/CoaTemplate enums
- `prisma.config.ts` - Prisma v7 config with DATABASE_URL
- `src/lib/db/prisma.ts` - Prisma singleton client with PrismaPg adapter
- `vitest.config.ts` - Vitest with jsdom, React plugin, path aliases
- `src/__tests__/setup.ts` - Test setup with jest-dom matchers
- `.env.local.example` - All required environment variables documented
- `src/components/ui/*.tsx` - 15 shadcn/ui components

## Decisions Made
- **Next.js 15 instead of 14:** Clerk v7 requires Next.js 15+ as peer dependency. Upgraded from plan's Next.js 14 specification.
- **Prisma v7 adapter pattern:** Prisma v7 removed `url` from schema datasource. Connection config moved to prisma.config.ts with PrismaPg adapter in client code.
- **oklch color format:** Tailwind CSS v4 and shadcn v4 use oklch. FOF brand hex colors converted to oklch equivalents.
- **No tailwind.config.js:** Tailwind v4 uses CSS-based configuration (@theme inline in globals.css) instead of tailwind.config.js. Font families configured via CSS variables.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Next.js 14 incompatible with Clerk v7**
- **Found during:** Task 1 (dependency installation)
- **Issue:** @clerk/nextjs@7 requires peer next@^15.2.8+, incompatible with Next.js 14
- **Fix:** Scaffolded with Next.js 15 (create-next-app@15) instead
- **Files modified:** package.json, all scaffold files
- **Verification:** npm install succeeds, build passes
- **Committed in:** 15e40b3

**2. [Rule 3 - Blocking] Prisma v7 API changes for datasource configuration**
- **Found during:** Task 3 (Prisma setup)
- **Issue:** Prisma v7 removed `url` and `directUrl` from schema datasource block; requires prisma.config.ts and adapter pattern
- **Fix:** Used prisma.config.ts for URL config, PrismaPg adapter in client singleton
- **Files modified:** prisma/schema.prisma, prisma.config.ts, src/lib/db/prisma.ts, package.json
- **Verification:** prisma generate succeeds, tsc --noEmit passes
- **Committed in:** 62abc74

**3. [Rule 3 - Blocking] Tailwind CSS v4 uses CSS-based config instead of tailwind.config.js**
- **Found during:** Task 1 (theming)
- **Issue:** Tailwind v4 eliminated tailwind.config.js in favor of @theme inline in CSS
- **Fix:** Configured font families and brand colors via @theme inline and CSS variables in globals.css
- **Files modified:** src/app/globals.css
- **Verification:** Build passes, CSS variables properly set
- **Committed in:** 15e40b3

**4. [Rule 3 - Blocking] npm peer dependency conflicts between React 19.1.0 and Clerk**
- **Found during:** Task 1 (dependency installation)
- **Issue:** React 19.1.0 does not match Clerk's ~19.1.4 peer requirement
- **Fix:** Created .npmrc with legacy-peer-deps=true
- **Files modified:** .npmrc
- **Verification:** All dependencies install successfully
- **Committed in:** 15e40b3

---

**Total deviations:** 4 auto-fixed (4 blocking)
**Impact on plan:** All deviations were necessary adaptations to current library versions (Next.js 15, Prisma v7, Tailwind v4, shadcn v4). No scope creep. Functionality matches plan requirements exactly.

## Issues Encountered
None beyond the version compatibility deviations documented above.

## User Setup Required

**External services require manual configuration.** The following must be set up before `npm run dev` works:

1. **Clerk** (Authentication):
   - Create a Clerk application at https://dashboard.clerk.com
   - Copy `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` from API Keys

2. **Neon** (PostgreSQL Database):
   - Create a project at https://console.neon.tech
   - Copy `DATABASE_URL` from Connection Details

3. Create `.env.local` from `.env.local.example` and fill in values

4. Run `npx prisma migrate dev` to create database tables

## Next Phase Readiness
- Foundation is ready for Plan 01-02 (API patterns, Zod validation, entity CRUD endpoints)
- Prisma schema has User and Entity models ready for CRUD operations
- Auth middleware protects all API routes automatically
- shadcn/ui components available for building UI in Plan 01-03

## Self-Check: PASSED

All 9 key files verified present. All 3 task commits verified in git history.

---
*Phase: 01-foundation*
*Completed: 2026-03-27*
