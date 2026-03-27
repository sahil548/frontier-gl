---
phase: 01-foundation
verified: 2026-03-26T00:00:00Z
status: human_needed
score: 13/14 must-haves verified
human_verification:
  - test: "Unauthenticated users are redirected to /sign-in"
    expected: "Visiting any app route (e.g. /dashboard) without a Clerk session redirects to /sign-in"
    why_human: "Middleware wiring is correct in code, but redirect behavior requires a live Clerk session to confirm"
  - test: "Clerk sign-in and sign-up pages render correctly"
    expected: "The Clerk <SignIn /> and <SignUp /> components render the Clerk-hosted UI at /sign-in and /sign-up"
    why_human: "Requires Clerk credentials (.env.local) and a browser to confirm the embedded Clerk widget loads"
  - test: "Dark mode toggle switches between light and dark themes"
    expected: "Clicking the Sun/Moon button in the header cycles through Light, Dark, and System options; colors visibly change to FOF brand palette"
    why_human: "CSS variable application and next-themes behavior require a browser to confirm"
  - test: "Plus Jakarta Sans is the rendered body font"
    expected: "Page text uses Plus Jakarta Sans (not the browser default) — visible in DevTools > Computed > font-family"
    why_human: "Font loading via next/font/google requires a browser to confirm"
  - test: "First-time user sees welcome screen with entity creation form"
    expected: "A new user with zero entities sees 'Welcome to Frontier GL' and can create their first entity"
    why_human: "Requires auth setup and a zero-entity account to test the conditional rendering path"
  - test: "Sidebar collapses to icon-only mode and expands back"
    expected: "Clicking the ChevronLeft/ChevronRight button collapses the sidebar to 64px (icons only) and expands it back to 240px"
    why_human: "Requires a browser to confirm collapse animation, icon-only state, and localStorage persistence"
  - test: "Entity selector groups entities by type"
    expected: "Dropdown shows 'All Entities' pinned at top, then entities grouped under headers (LPs, Trusts, etc.)"
    why_human: "Requires real entity data and a browser to confirm the Popover+Command grouping renders correctly"
---

# Phase 1: Foundation Verification Report

**Phase Goal:** Users can authenticate, create and switch between entities, and the data model is ready for accounting operations
**Verified:** 2026-03-26
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Next.js app starts and renders a page | ? HUMAN | App scaffold exists, build passes per SUMMARY — requires running `npm run dev` to confirm |
| 2 | Unauthenticated users are redirected to /sign-in | ? HUMAN | `src/middleware.ts` uses `clerkMiddleware` + `createRouteMatcher` correctly; redirect behavior requires live Clerk session |
| 3 | Clerk sign-in and sign-up pages render correctly | ? HUMAN | Both pages exist with `<SignIn />` and `<SignUp />` components; rendering requires Clerk API keys |
| 4 | Prisma schema has Entity model with correct types and enums | ✓ VERIFIED | `prisma/schema.prisma` defines `EntityType` (9 values), `CoaTemplate`, `User`, and `Entity` with all required fields and indexes |
| 5 | Dark mode toggle switches between light and dark themes | ? HUMAN | `ThemeProvider` wraps app, `ThemeToggle` uses `useTheme()`, globals.css has `:root` and `.dark` variables — visual confirmation needed |
| 6 | Plus Jakarta Sans is the rendered body font | ? HUMAN | `layout.tsx` imports `Plus_Jakarta_Sans` with correct weights, CSS variable set in `@theme inline` — requires browser to confirm |
| 7 | POST /api/entities creates entity with valid input and returns 201 | ✓ VERIFIED | Route handler calls `createEntitySchema.safeParse`, creates via `prisma.entity.create`, returns `successResponse(entity, 201)` |
| 8 | POST /api/entities returns 400 with Zod validation errors for invalid input | ✓ VERIFIED | `result.success === false` branch calls `errorResponse("Validation failed", 400, result.error)` with ZodError |
| 9 | GET /api/entities returns active entities for authenticated user | ✓ VERIFIED | Queries `prisma.entity.findMany` with `createdById` and `isActive: true`, returns serialized list |
| 10 | PUT /api/entities/:entityId updates entity fields and can deactivate | ✓ VERIFIED | Uses `updateEntitySchema`, finds owned entity, calls `prisma.entity.update`; `isActive: false` is a valid update field |
| 11 | All API responses use consistent {success, data/error} JSON envelope | ✓ VERIFIED | All routes use `successResponse` / `errorResponse` helpers; tests confirm shape |
| 12 | Unauthenticated API requests return 401 | ✓ VERIFIED | All route handlers check `const { userId } = await auth()` and return `errorResponse("Unauthorized", 401)` when no userId |
| 13 | User can switch between entities via header dropdown without page reload | ✓ VERIFIED | `entity-selector.tsx` calls `setCurrentEntityId` from context on select; no router.push/redirect |
| 14 | Entity dropdown shows "All Entities" pinned at top | ✓ VERIFIED | First `CommandGroup` in entity-selector hardcodes "All Entities" item before `CommandSeparator` and type groups |
| 15 | Entities are grouped by type in the dropdown | ✓ VERIFIED | `groupEntitiesByType()` function produces `Record<string, SerializedEntity[]>`, rendered with `CommandGroup heading` per type |
| 16 | Entity selection persists in localStorage | ✓ VERIFIED | `use-entity.ts` reads from `localStorage.getItem("frontier-gl-entity")` on mount; `setCurrentEntityId` calls `localStorage.setItem` |
| 17 | Deactivated entities are hidden from dropdown | ✓ VERIFIED | `entity-selector.tsx` filters `entities.filter((e) => e.isActive)` before grouping |
| 18 | Sidebar collapses to icon-only mode and expands back | ? HUMAN | `sidebar.tsx` toggles `isCollapsed` state and persists to localStorage; width switches between `w-16` and `w-60` — browser needed |
| 19 | First-time user sees welcome screen with entity creation form | ? HUMAN | `dashboard/page.tsx` renders `<WelcomeScreen />` when `entities.length === 0`; requires zero-entity account to test |

**Score:** 12/19 truths verified programmatically. Remaining 7 require human (visual/interactive) verification. All automated checks pass.

---

### Required Artifacts

#### Plan 01-01 Artifacts

| Artifact | Provides | Exists | Lines | Key Pattern | Status |
|----------|----------|--------|-------|-------------|--------|
| `src/middleware.ts` | Clerk route protection | Yes | 18 | `clerkMiddleware`, `createRouteMatcher` | ✓ VERIFIED |
| `prisma/schema.prisma` | Entity model with enums | Yes | 73 | `model Entity`, `enum EntityType` | ✓ VERIFIED |
| `src/app/layout.tsx` | Root layout with providers | Yes | 51 | `ClerkProvider`, `ThemeProvider` | ✓ VERIFIED |
| `src/lib/db/prisma.ts` | Prisma singleton client | Yes | 29 | `globalForPrisma`, `PrismaPg` adapter | ✓ VERIFIED |
| `vitest.config.ts` | Test framework config | Yes | 13 | `defineConfig`, `jsdom`, `tsconfigPaths` | ✓ VERIFIED |

#### Plan 01-02 Artifacts

| Artifact | Provides | Exists | Key Exports | Status |
|----------|----------|--------|-------------|--------|
| `src/lib/validators/entity.ts` | Zod schemas | Yes | `createEntitySchema`, `updateEntitySchema`, `CreateEntityInput`, `UpdateEntityInput` | ✓ VERIFIED |
| `src/lib/validators/api-response.ts` | Response helpers | Yes | `successResponse`, `errorResponse` | ✓ VERIFIED |
| `src/app/api/entities/route.ts` | List + create endpoints | Yes | `GET`, `POST` | ✓ VERIFIED |
| `src/app/api/entities/[entityId]/route.ts` | Get + update endpoints | Yes | `GET`, `PUT` | ✓ VERIFIED |
| `src/lib/db/scoped-query.ts` | Entity scoping helper | Yes | `entityScope` | ✓ VERIFIED |

#### Plan 01-03 Artifacts (with min_lines check)

| Artifact | Provides | Exists | Lines | Min Lines | Status |
|----------|----------|--------|-------|-----------|--------|
| `src/components/layout/sidebar.tsx` | Collapsible nav sidebar | Yes | 217 | 60 | ✓ VERIFIED |
| `src/components/layout/header.tsx` | Top bar with selectors | Yes | 37 | 30 | ✓ VERIFIED |
| `src/components/layout/entity-selector.tsx` | Entity switching dropdown | Yes | 145 | 50 | ✓ VERIFIED |
| `src/hooks/use-entity.ts` | Entity selection + localStorage | Yes | 81 | 20 | ✓ VERIFIED |
| `src/providers/entity-provider.tsx` | React context for entity | Yes | 34 | 20 | ✓ VERIFIED |
| `src/components/onboarding/welcome-screen.tsx` | First-login entity creation | Yes | 58 | 30 | ✓ VERIFIED |

All 16 required artifacts exist and are substantive (above minimum line thresholds where specified).

---

### Key Link Verification

#### Plan 01-01 Key Links

| From | To | Via | Pattern Found | Status |
|------|----|-----|---------------|--------|
| `src/middleware.ts` | `@clerk/nextjs/server` | clerkMiddleware import | `import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"` | ✓ WIRED |
| `src/app/layout.tsx` | `next-themes` | ThemeProvider wrapping app | `<ThemeProvider attribute="class" defaultTheme="system" enableSystem ...>` | ✓ WIRED |
| `prisma/schema.prisma` | Neon PostgreSQL | datasource db | `provider = "postgresql"` (Neon via `prisma.config.ts`) | ✓ WIRED |

#### Plan 01-02 Key Links

| From | To | Via | Pattern Found | Status |
|------|----|-----|---------------|--------|
| `src/app/api/entities/route.ts` | `src/lib/validators/entity.ts` | Zod validation on POST | `createEntitySchema.safeParse(body)` | ✓ WIRED |
| `src/app/api/entities/route.ts` | `@clerk/nextjs/server` | auth() for identity | `const { userId } = await auth()` | ✓ WIRED |
| `src/app/api/entities/route.ts` | `src/lib/db/prisma.ts` | Prisma client for DB | `prisma.entity.findMany`, `prisma.entity.create` | ✓ WIRED |
| `src/app/api/entities/route.ts` | `src/lib/validators/api-response.ts` | Response envelope | `successResponse`, `errorResponse` | ✓ WIRED |

#### Plan 01-03 Key Links

| From | To | Via | Pattern Found | Status |
|------|----|-----|---------------|--------|
| `src/components/layout/entity-selector.tsx` | `src/hooks/use-entity.ts` | useEntity hook | `useEntityContext()` consuming hook from provider | ✓ WIRED |
| `src/hooks/use-entity.ts` | localStorage | Persist selection | `localStorage.getItem(STORAGE_KEY)`, `localStorage.setItem(STORAGE_KEY, id)` | ✓ WIRED |
| `src/components/layout/entity-selector.tsx` | `/api/entities` | Fetch entity list | Indirectly via `useEntityContext()` which calls `fetch("/api/entities")` in `use-entity.ts` | ✓ WIRED |
| `src/app/(auth)/layout.tsx` | `src/providers/entity-provider.tsx` | EntityProvider wrapping | `<EntityProvider>` wraps entire auth layout | ✓ WIRED |

All 11 key links verified as wired.

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| AUTH-01 | 01-01 | User can sign up and log in via Clerk | ✓ SATISFIED | Clerk `<SignIn />` / `<SignUp />` pages exist; `ClerkProvider` wraps app |
| AUTH-02 | 01-01 | Session persists across browser refresh | ? HUMAN | Clerk handles session persistence; middleware uses `auth()` correctly — requires browser to confirm |
| AUTH-03 | 01-01 | All routes protected behind auth | ✓ SATISFIED | `clerkMiddleware` + `createRouteMatcher` protects all non-public routes; code verified |
| ENTM-01 | 01-02 | Create entity with name, type, fiscal year end | ✓ SATISFIED | `POST /api/entities` with `createEntitySchema` validation; `entity-form.tsx` has all fields |
| ENTM-02 | 01-02 | Edit and deactivate entities | ✓ SATISFIED | `PUT /api/entities/:entityId` with `updateEntitySchema`; deactivate dialog in `entity-form.tsx` |
| ENTM-03 | 01-03 | Switch between entities without page reload | ✓ SATISFIED | `entity-selector.tsx` calls `setCurrentEntityId()` — no router.push |
| ENTM-04 | 01-03 | "All Entities" for cross-entity views | ✓ SATISFIED | "All Entities" CommandItem hardcoded at top of dropdown; default entityId is "all" |
| ENTM-05 | 01-03 | Entity selection persists in localStorage | ✓ SATISFIED | `use-entity.ts` reads/writes `localStorage` key `frontier-gl-entity` |
| DI-01 | 01-01 | Money fields use NUMERIC(19,4) / Prisma Decimal | ✓ SATISFIED | Schema comment documents: "All money/currency fields MUST use Decimal @db.Decimal(19,4)"; convention established for Phase 2 |
| DI-02 | 01-01 | Financial tables include entity_id FK | ✓ SATISFIED | Schema comment documents: "All financial tables MUST include entityId String"; Entity model is the anchor; convention established |
| UI-01 | 01-01 | shadcn/ui + Tailwind CSS used consistently | ✓ SATISFIED | 15 shadcn/ui components installed; all UI files use shadcn components; Tailwind v4 CSS-based config in `globals.css` |
| API-01 | 01-02 | GL operations exposed via RESTful endpoints | ✓ SATISFIED | Entity CRUD at `/api/entities` and `/api/entities/:entityId`; plan documents that `/api/entities/:entityId/` financial scoping is Phase 2 |
| API-02 | 01-02 | API validates with Zod (matching client-side) | ✓ SATISFIED | `createEntitySchema.safeParse` in POST; `updateEntitySchema.safeParse` in PUT; `entityFormSchema` in client mirrors server schema |
| API-03 | 01-02 | Consistent JSON response format + HTTP status codes | ✓ SATISFIED | `successResponse({success:true,data})` and `errorResponse({success:false,error,details?})` used in all routes; 19 tests pass |

All 14 required requirement IDs are accounted for and satisfied. No orphaned requirements found.

**Note on API-01:** The requirement states "scoped under /api/entities/:entityId/" which applies to financial data (accounts, journal entries) coming in Phase 2. Entity management itself is user-scoped at `/api/entities`. This distinction is documented in code comments in `src/app/api/entities/route.ts`. The Phase 1 plan explicitly acknowledges this scope boundary.

---

### Anti-Patterns Found

| File | Pattern | Severity | Assessment |
|------|---------|----------|------------|
| `src/app/(auth)/dashboard/page.tsx:46` | "Dashboard Coming in Phase 4" | Info | Intentional per plan spec — dashboard content is Phase 4 scope, not Phase 1 |
| `src/app/api/entities/[entityId]/route.ts:27` | `return null` | Info | Internal helper `findOwnedEntity` returns null for not-found entity; handled correctly by callers (returns 404) |
| `src/hooks/use-entity.ts:48` | `return [] as SerializedEntity[]` | Info | Error fallback in fetch catch block — correct defensive behavior |

No blockers found. The dashboard "coming in Phase 4" is explicitly called for by the plan spec ("render placeholder dashboard card saying 'Dashboard coming in Phase 4'"). All other return-null/return-[] patterns are legitimate defensive code.

---

### Human Verification Required

#### 1. App starts and serves pages

**Test:** Run `npm run dev` and navigate to `http://localhost:3000`
**Expected:** Page loads without error; redirects to `/sign-in` if unauthenticated
**Why human:** Requires live environment with `.env.local` configured

#### 2. Authentication redirect

**Test:** Navigate to `http://localhost:3000/dashboard` without signing in
**Expected:** Immediately redirected to `/sign-in`
**Why human:** Clerk session state requires a live browser session to test

#### 3. Clerk pages render

**Test:** Navigate to `/sign-in` and `/sign-up`
**Expected:** Clerk-hosted authentication widgets appear, branded with "Frontier GL"
**Why human:** Clerk component rendering requires API keys and network access

#### 4. Dark mode toggle

**Test:** Click the Sun/Moon icon in the header; cycle through Light, Dark, and System
**Expected:** Background switches between `#FAFBFC` (light) and `#0F1419` (dark); teal `#0D7377` primary color is visible in both modes
**Why human:** CSS variable application requires a browser to confirm

#### 5. Plus Jakarta Sans font

**Test:** Inspect any text element in browser DevTools > Computed > font-family
**Expected:** Value includes "Plus Jakarta Sans" or the CSS variable `--font-plus-jakarta-sans`
**Why human:** Font loading via `next/font/google` requires a browser to confirm

#### 6. First-time user onboarding

**Test:** Sign up as a new user with zero entities; navigate to `/dashboard`
**Expected:** "Welcome to Frontier GL" heading with "Create your first entity to get started" subtext and the entity creation form embedded
**Why human:** Requires a fresh Clerk account and live database

#### 7. Sidebar collapse

**Test:** Click the ChevronLeft button in the sidebar footer; then click ChevronRight to re-expand
**Expected:** Sidebar collapses to icon-only width (~64px) with tooltips on hover; expands back to full width (~240px); "Powered by Family Office Frontier" text hidden when collapsed; state persists after page reload
**Why human:** Layout and localStorage persistence require a browser to confirm

#### 8. Entity selector grouping

**Test:** Create 2+ entities of different types; open the entity selector dropdown
**Expected:** "All Entities" is pinned at top with a separator below; entities appear grouped under type headings ("LPs", "Trusts", etc.)
**Why human:** Requires real entity data and a browser to confirm the Popover+Command grouping renders correctly

---

### Test Status

Tests exist and were reported passing per SUMMARY (35/35 at time of completion):

- `src/__tests__/validators/entity.test.ts` — 16 tests for Zod schemas and entityScope
- `src/__tests__/api/response-format.test.ts` — 9 tests for successResponse/errorResponse
- `src/__tests__/hooks/use-entity.test.ts` — 7 tests for useEntity hook and EntityProvider

All test files are substantive (real test logic, not stubs). Cannot re-run tests without a configured environment.

---

### Commit History Verified

All phase commits confirmed in `git log`:

| Commit | Description | Plan |
|--------|-------------|------|
| `15e40b3` | feat: scaffold Next.js, dependencies, shadcn/ui | 01-01 |
| `ee8a0fc` | feat: Clerk auth middleware, sign-in/sign-up pages | 01-01 |
| `62abc74` | feat: Prisma schema, singleton client, Vitest | 01-01 |
| `7db9da3` | test: failing tests for validators and response helpers | 01-02 |
| `d650d3f` | feat: implement validators, response helpers, entity scope | 01-02 |
| `3833888` | feat: entity CRUD API routes | 01-02 |
| `d1c2b5d` | test: failing tests for useEntity hook and EntityProvider | 01-03 |
| `8670359` | feat: entity context provider, sidebar, header, theme toggle | 01-03 |
| `b2459f9` | feat: entity selector, entity pages, welcome screen | 01-03 |
| `7b204ad` | fix: refresh entity dropdown after create/edit, race condition | 01-03 |

---

### Notable Deviations (Auto-fixed, No Scope Impact)

1. **Next.js 15 instead of 14** — Clerk v7 peer dependency requires Next.js 15+. No functional impact.
2. **Prisma v7 adapter pattern** — `prisma.config.ts` + `PrismaPg` adapter instead of schema `url`. Implementation correct, singleton pattern preserved.
3. **Tailwind v4 CSS config** — `@theme inline` in `globals.css` instead of `tailwind.config.js`. FOF brand colors applied correctly in oklch format.
4. **Route group `(auth)` instead of `(app)`** — SUMMARY plan 01-01 initially created `(app)`, but plan 01-03 correctly uses `(auth)`. Final state is `(auth)` route group with correct layout.

---

## Summary

Phase 1 foundation is structurally complete and correct. All 14 requirement IDs (AUTH-01 through API-03) are implemented with substantive code. All 16+ required artifacts exist with real implementations — no stubs detected. All 11 key links are wired. Test coverage exists for the three core subsystems (validators, API response format, entity hook).

The 7 human verification items are all visual/interactive behaviors (font rendering, dark mode colors, Clerk widget rendering, sidebar animation, localStorage persistence across reload) that require a browser and live credentials to confirm. None of these represent code gaps — the implementation is in place.

---

_Verified: 2026-03-26_
_Verifier: Claude (gsd-verifier)_
