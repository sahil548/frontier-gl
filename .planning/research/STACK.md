# Technology Stack

**Project:** Frontier GL
**Researched:** 2026-03-26
**Overall confidence:** MEDIUM (versions based on training data as of early 2025 -- verify with `npm view <pkg> version` before installing)

## Recommended Stack

### Core Framework (Pre-decided)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Next.js | ^14.2 | Full-stack React framework | App Router, Server Components, API routes. Stick with 14 -- Next 15 exists but 14 is battle-tested and matches project constraint. | HIGH |
| React | ^18.3 | UI library | Concurrent features, Server Components support. Do NOT jump to React 19 yet -- Clerk and shadcn ecosystem may lag. | HIGH |
| TypeScript | ^5.4 | Type safety | Non-negotiable for financial software. Catches accounting logic bugs at compile time. | HIGH |
| Prisma | ^5.14 | ORM | Type-safe queries, migrations, Decimal field support. Critical: Prisma natively maps `Decimal` to PostgreSQL `NUMERIC` -- this is why it wins over Drizzle for accounting. | HIGH |
| PostgreSQL | 15+ | Database | NUMERIC type for exact decimal arithmetic, CHECK constraints for double-entry enforcement, ACID transactions. | HIGH |

### Authentication (Pre-decided)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| @clerk/nextjs | ^5.x | Auth + user management | Managed auth, middleware-based route protection, org support for multi-entity RBAC later. Free tier covers <10K MAU. | MEDIUM |

### UI Framework (Pre-decided)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| shadcn/ui | latest (not versioned) | Component library | Copy-paste components, full control, accessible. NOT an npm package -- installed via CLI into your codebase. | HIGH |
| Tailwind CSS | ^3.4 | Utility CSS | Fast styling, pairs with shadcn/ui. Tailwind v4 exists but shadcn/ui still targets v3. | HIGH |
| @radix-ui/react-* | (installed by shadcn) | Headless primitives | Accessible, unstyled -- shadcn wraps these. Installed automatically. | HIGH |

---

### Accounting-Specific Libraries

These are the libraries the research question is really about.

#### Decimal Math (CRITICAL for financial software)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| decimal.js | ^10.4 | Arbitrary-precision decimal arithmetic | **Use this, not dinero.js.** Prisma returns `Decimal` objects from its own bundled `decimal.js`. Using the same library avoids conversion overhead and type mismatches. All balance computations, trial balance sums, and validation (debits = credits) must use Decimal, never native JS floats. | HIGH |

**Why NOT dinero.js:** Dinero works in integer cents (minor units), which is a good pattern for e-commerce but awkward for GL accounting where you need arbitrary precision, sub-cent allocations, and interop with Prisma's Decimal type. decimal.js aligns with what Prisma already uses internally.

**Why NOT big.js:** Smaller API surface, fewer features. decimal.js is the superset and already bundled with Prisma.

#### Currency Formatting

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Intl.NumberFormat | (built-in) | Currency display formatting | Native browser/Node API. Zero-dependency. `new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)`. Handles commas, decimals, currency symbols. Wrap in a utility function. | HIGH |

**Why NOT a library:** For USD-only (Phase 1), Intl.NumberFormat is sufficient. When multi-currency comes (future phase), revisit with a formatting library.

#### Date Handling

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| date-fns | ^3.6 | Date manipulation and formatting | Tree-shakeable, functional API, no mutable state. Used for fiscal year calculations, period boundaries, date range filters, aging calculations. | HIGH |

**Why NOT dayjs/luxon:** date-fns v3 is fully tree-shakeable (reduces bundle), has a functional API that fits React patterns, and has excellent TypeScript support. dayjs has a plugin-based API that is less discoverable; Luxon is heavier.

**Why NOT Temporal API:** Not yet broadly available in all runtimes. date-fns is the safe choice.

#### Data Tables

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| @tanstack/react-table | ^8.x | Headless table logic | Powers GL ledger, trial balance, chart of accounts tables. Headless = pairs perfectly with shadcn/ui table components. Sorting, filtering, pagination built-in. | HIGH |

**Critical for this project:** The GL ledger, trial balance, and chart of accounts are all table-heavy views. TanStack Table handles column definitions, sorting, filtering, pagination, and row selection without opinionated styling. shadcn/ui has a pre-built DataTable recipe using TanStack Table.

#### Charts / Dashboard

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| recharts | ^2.12 | Dashboard charts | shadcn/ui's chart components are built on Recharts. Using anything else means fighting the component library. Simple API for bar, line, area, pie charts. | HIGH |

**Why NOT Chart.js / visx / nivo:** shadcn/ui ships chart components that wrap Recharts. Using the same library means you get pre-styled, theme-consistent charts with zero extra work. Chart.js requires a React wrapper (react-chartjs-2) and does not integrate with shadcn's design system.

#### Forms and Validation

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| react-hook-form | ^7.51 | Form state management | Performant (uncontrolled inputs), minimal re-renders. Essential for journal entry forms with dynamic line items. | HIGH |
| @hookform/resolvers | ^3.x | Schema validation bridge | Connects Zod schemas to react-hook-form. | HIGH |
| zod | ^3.23 | Schema validation | Type-safe validation for both client forms AND server API routes. Single schema definition validates on both sides. Critical for double-entry validation (debits = credits). | HIGH |

**Pattern for journal entries:** Define a Zod schema with `.refine()` to enforce debits === credits. Use the same schema in the API route and the client form. This is the standard Next.js pattern and gives you compile-time + runtime safety.

#### PDF Export

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| jspdf | ^2.5 | PDF generation | Client-side PDF generation for trial balance, GL ledger exports. Lightweight, well-maintained. | MEDIUM |
| jspdf-autotable | ^3.8 | Table layout in PDFs | Plugin for jspdf that handles tabular data layout. Essential for financial report PDFs with columns for debit/credit/balance. | MEDIUM |

**Why NOT @react-pdf/renderer:** react-pdf uses its own layout engine (yoga) and React reconciler, which adds significant bundle size. For exporting tabular financial data, jspdf + autotable is simpler and lighter. react-pdf is better when you need pixel-perfect branded reports (Phase 2+).

**Alternative approach:** Generate PDFs server-side in an API route if client-side generation causes performance issues with large datasets.

#### CSV Export

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| papaparse | ^5.4 | CSV parsing and generation | Bi-directional: export GL data to CSV, import chart of accounts from CSV. Battle-tested, handles edge cases (commas in fields, unicode). | HIGH |

**Why NOT manual CSV:** CSV has subtle edge cases (fields containing commas, newlines, quotes). PapaParse handles all of them. It is also useful for future CSV import features.

#### Toast / Notifications

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| sonner | ^1.4 | Toast notifications | shadcn/ui's recommended toast solution. Simple API: `toast.success("Journal entry posted")`. Replaces the older shadcn toast component. | MEDIUM |

#### URL State Management

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| nuqs | ^1.x | URL query state | Type-safe URL search params for Next.js App Router. Use for entity selector, date range filters, pagination -- so users can bookmark/share filtered views. | MEDIUM |

**Why this matters for GL:** An accountant filtering the GL ledger by account + date range should be able to bookmark that URL or share it. nuqs makes URL state as easy as useState.

### Server-Side Utilities

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| next-safe-action | ^7.x | Type-safe Server Actions | Type-safe server actions with Zod validation, error handling, and middleware. Reduces boilerplate for API endpoints. | MEDIUM |

### Dev Dependencies

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| eslint | ^8.x | Linting | Code quality. Use next/core-web-vitals config. | HIGH |
| prettier | ^3.2 | Code formatting | Consistent formatting across AI-generated code. | HIGH |
| @types/papaparse | ^5.3 | TypeScript types | Type definitions for PapaParse. | HIGH |
| prisma (CLI) | ^5.14 | DB migrations | `npx prisma migrate dev`, `npx prisma studio`. Installed as devDep alongside @prisma/client as prod dep. | HIGH |

---

## What NOT to Use

| Technology | Why Not | Use Instead |
|------------|---------|-------------|
| dinero.js | Integer-cents model misaligns with GL accounting; Prisma returns decimal.js Decimals natively | decimal.js |
| moment.js | Deprecated, massive bundle, mutable API | date-fns |
| dayjs | Not tree-shakeable by default, plugin system is less discoverable | date-fns |
| Chart.js / react-chartjs-2 | Does not integrate with shadcn/ui chart components | recharts |
| @react-pdf/renderer | Overkill for Phase 1 tabular exports, large bundle | jspdf + jspdf-autotable |
| Drizzle ORM | No native Decimal type handling like Prisma; would require manual decimal management for every financial field | Prisma |
| tRPC | Adds complexity for a solo-dev project; Next.js Server Actions + Zod gives the same type safety with less abstraction | next-safe-action + zod |
| Redux / Zustand | Unnecessary -- React Server Components + URL state (nuqs) + react-hook-form covers all state needs | React state + nuqs |
| NextAuth.js | More DIY than Clerk; requires configuring providers, session management, DB adapters | @clerk/nextjs |
| Tailwind v4 | shadcn/ui ecosystem still targets Tailwind v3; switching causes compatibility issues | Tailwind v3 |
| Next.js 15 | Newer but Clerk and ecosystem libraries may lag on support; Next 14 is stable and proven | Next.js 14 |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not Alternative |
|----------|-------------|-------------|---------------------|
| Decimal math | decimal.js | dinero.js | Prisma uses decimal.js internally; dinero uses integer-cents model |
| Dates | date-fns | dayjs | date-fns v3 is fully tree-shakeable, better TS support |
| Charts | recharts | nivo | shadcn/ui charts are built on recharts |
| Tables | @tanstack/react-table | AG Grid | AG Grid is heavy, commercial license needed for features; TanStack is free and headless |
| PDF | jspdf + autotable | @react-pdf/renderer | Simpler for tabular data, smaller bundle |
| State | React state + nuqs | Zustand | Server Components reduce need for client state; URL state is more appropriate for filter/pagination |
| Server actions | next-safe-action | tRPC | Less abstraction, native Next.js pattern, solo dev simplicity |
| Hosting DB | Supabase | Railway / Neon | Supabase has generous free tier + Postgres extensions; Railway is a solid alternative |

## PostgreSQL-Specific Configuration

**Critical for accounting:**

```sql
-- Use NUMERIC(19,4) for all money fields
-- 19 digits total, 4 decimal places
-- Handles values up to 999,999,999,999,999.9999
-- Standard for financial applications

-- In Prisma schema:
-- amount Decimal @db.Decimal(19, 4)
```

Prisma `Decimal` type maps to PostgreSQL `NUMERIC`. Always specify precision: `@db.Decimal(19, 4)`. Four decimal places is standard for GL systems (sub-cent precision for allocations and rounding).

**Database constraints for double-entry:**

```sql
-- Add a CHECK constraint at the database level:
-- For each journal entry, SUM(debit) must equal SUM(credit)
-- Enforced via a trigger or application-level transaction
```

## Installation

```bash
# Core framework (pre-decided)
npx create-next-app@14 frontier-gl --typescript --tailwind --eslint --app --src-dir
npm install @prisma/client @clerk/nextjs

# Accounting-specific libraries
npm install decimal.js date-fns zod react-hook-form @hookform/resolvers

# Data display
npm install @tanstack/react-table recharts

# Export
npm install jspdf jspdf-autotable papaparse

# UI utilities
npm install sonner nuqs next-safe-action

# Dev dependencies
npm install -D prisma prettier @types/papaparse @types/jspdf
```

```bash
# shadcn/ui setup (run after project creation)
npx shadcn-ui@latest init
npx shadcn-ui@latest add button card dialog dropdown-menu input label select separator sheet table tabs toast chart
```

## Sources

- Prisma documentation: Decimal field type maps to decimal.js internally (HIGH confidence, well-documented)
- shadcn/ui documentation: Charts built on Recharts, Toast uses Sonner (HIGH confidence, directly stated in docs)
- TanStack Table: shadcn/ui DataTable recipe uses @tanstack/react-table (HIGH confidence)
- date-fns v3 release: Tree-shakeable ESM, new functional API (HIGH confidence)
- Next.js 14 App Router: Server Components, Server Actions (HIGH confidence)

**Note:** All version numbers are based on training data through early 2025. Run `npm view <package> version` before installing to get the actual latest. The major version recommendations (decimal.js 10.x, date-fns 3.x, zod 3.x, etc.) are stable and unlikely to have breaking changes.
