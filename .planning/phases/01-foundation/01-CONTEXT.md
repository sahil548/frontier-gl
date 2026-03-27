# Phase 1: Foundation - Context

**Gathered:** 2026-03-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Project scaffolding, Clerk authentication, entity CRUD with multi-entity switching, database schema with NUMERIC(19,4) and entity_id FK scoping, RESTful API patterns with Zod validation, and shadcn/ui + Tailwind CSS setup. This phase delivers the shell that all subsequent phases build on.

</domain>

<decisions>
## Implementation Decisions

### Navigation & Layout
- Collapsible left sidebar with icons + labels (toggle between expanded and icon-only mode)
- Pages in Phase 1: Dashboard (placeholder until Phase 4), Entities, Settings
- Entity switcher in the top header bar (not in sidebar)
- Sidebar collapses to give more content space for data-heavy tables in later phases

### Entity Switcher UX
- Entity dropdown in top-right of header bar, always visible
- "All Entities" pinned at top of dropdown as default selection
- Entities grouped by type in dropdown (LPs, LLCs, Corporations, Trusts, etc.)
- Switching entities stays on current page (data refreshes, no redirect)
- Entity selection persists in localStorage across sessions
- Deactivated entities hidden from dropdown (not grayed out)
- Deactivated entities excluded from "All Entities" consolidated views

### Database Provider
- Neon (managed PostgreSQL) — user already uses Neon for another app, free tier supports multiple projects (up to 10), built-in connection pooling, excellent Vercel serverless integration

### Onboarding Flow
- Welcome screen on first login: "Create your first entity to get started" with entity creation form
- After creating first entity, land on dashboard
- Entity creation form asks: "Start with a template or blank?" for Chart of Accounts (COA is Phase 2 but the choice is captured at entity creation for later use)
- Fiscal year end is a required field at entity creation (default: December 31)
- Entity types: LP, LLC, Corporation, S-Corp, Trust, Foundation, Partnership, Individual, Other (free-text for Other)

### Dark Mode
- Build dark mode from day one using CSS variables and Tailwind dark: classes
- shadcn/ui's built-in dark mode support
- Default to OS system preference (prefers-color-scheme)
- Manual sun/moon toggle in header for override
- Persist preference in localStorage

### Branding
- FOA ledger mark (teal) + "Frontier GL" text in sidebar header
- When sidebar collapsed, show just the ledger mark icon
- Subtle "Powered by Family Office Frontier" in sidebar footer
- All branding follows FOF cool temperature system

### Visual Identity (from Brand Architecture v2.1)
- **Primary accent:** Teal #0D7377
- **Secondary accent:** Teal Light #11A3A8 (hover/active states)
- **Background (light):** Cool white #FAFBFC
- **Ink (light):** #0F1419
- **Body text (light):** #4A5568
- **Muted text (light):** #94A3B8
- **Dark mode background:** Blue-black #0F1419
- **Dark mode text:** #8B95A5 (body), #E0E0E0 (headings)
- **Dark mode accent:** Teal #0D7377 at full saturation
- **Font:** Plus Jakarta Sans only (400 body, 500 medium, 600 semibold, 800 display)
- **Code font:** JetBrains Mono
- **No serifs ever** (cool system rule)
- DO NOT mix warm ink (#0A0A0A) with cool backgrounds (#FAFBFC)
- DO NOT use cream (#FAF7F2) as text — use #E0E0E0 on dark backgrounds

### Claude's Discretion
- Loading skeleton design and patterns
- Exact spacing, padding, and component sizing
- Error state handling and toast notification design
- Settings page structure and options
- Dashboard placeholder content/empty state design
- API response format details (within RESTful + Zod constraint)

</decisions>

<specifics>
## Specific Ideas

- Entity switcher should feel like Vercel's team switcher — fast, always accessible, clear context
- Brand follows the "cool" temperature system of Family Office Frontier: modern, systematic, no serifs, weight does the work
- The FOA sub-brand uses a "ledger" mark (stacked pages icon) — this is the app icon
- Sub-brand relationship language: "Powered by Family Office Frontier" in footer
- One-font strategy: Plus Jakarta Sans handles everything from display to body through weight variation (400-800)

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project, no existing codebase

### Established Patterns
- None yet — this phase establishes all patterns

### Integration Points
- Clerk auth SDK integration (middleware, providers, user button)
- Neon PostgreSQL connection via Prisma ORM
- Vercel deployment (serverless functions, edge middleware)
- shadcn/ui component installation via CLI

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-03-26*
