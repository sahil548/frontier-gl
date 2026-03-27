# Phase 2: Accounting Engine - Research

**Researched:** 2026-03-26
**Domain:** Double-entry accounting engine -- chart of accounts CRUD, journal entry lifecycle, PostgreSQL integrity triggers, balance materialization
**Confidence:** HIGH

## Summary

Phase 2 builds the core accounting engine on top of Phase 1's foundation (Next.js 14, Prisma, Neon PostgreSQL, Clerk auth, shadcn/ui). It has two major subsystems: (1) Chart of Accounts management with hierarchical parent/sub-account structure, and (2) Journal Entry creation with full double-entry enforcement and a Draft/Approved/Posted workflow. The phase also delivers three critical database-layer integrity mechanisms: a trigger preventing modification of posted entries (DI-04), a deferred constraint trigger validating debits equal credits (DI-05), and an atomic balance materialization system (DI-03).

The technical challenge centers on three areas. First, PostgreSQL triggers must be created via Prisma's `--create-only` migration workflow since Prisma has no declarative trigger support. Second, account balance computation requires either a trigger-updated balance column or Prisma interactive transactions that atomically update balances during journal posting -- the trigger approach is more robust. Third, the journal entry form is the most complex UI in the app: a spreadsheet-style dynamic line item table with searchable account comboboxes, live running totals, and balanced/unbalanced visual feedback.

The stack established in Phase 1 (react-hook-form, Zod, shadcn/ui, Prisma, decimal.js) handles all Phase 2 needs without new core dependencies. The key additions are `useFieldArray` from react-hook-form for dynamic line items and shadcn's Combobox (Popover + Command) for the account selector. All money math uses decimal.js on both client and server -- never native JavaScript arithmetic.

**Primary recommendation:** Build the Prisma schema first (accounts, journal entries, line items, account balances), add PostgreSQL triggers via custom migrations for immutability and balance validation, then build the COA UI (indented table + slide-over CRUD), then the JE form (useFieldArray + combobox + live totals), then the JE list with workflow actions and bulk operations.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Indented table display for COA (flat table with visual indentation, not tree view)
- Lean 4-column layout: Account Number, Account Name, Type, Balance
- Description and details in slide-over panel on click/expand
- Top search bar searching name and number simultaneously
- Type filter chips (Asset, Liability, Equity, Income, Expense) toggle on/off
- Hover actions: Edit icon and kebab menu (View Ledger, Add Sub-Account, Deactivate)
- Parent accounts show aggregated balance (sum of children) -- no direct posting to parent accounts
- 2 levels of nesting only: Parent -> Sub-Account
- Slide-over panel for create/edit (same pattern)
- Form fields: Name, Number, Type, Parent Account, Description
- Account number auto-suggests next available based on parent/siblings -- user can override
- 5-digit numbering: 10000s Assets, 20000s Liabilities, 30000s Equity, 40000s Income, 50000s+ Expenses, sub-accounts in 100 increments
- JE form is a full dedicated page at /journal-entries/new
- Header: Date, Description/Memo
- Spreadsheet-style line item table: Account (searchable combobox), Debit, Credit, Memo
- "Add Line" button at bottom
- Searchable combobox for account: type to search by name or number, shows number + name + type, keyboard navigable
- Running totals row updates live; green checkmark when balanced, red with difference when unbalanced
- Save Draft and Post buttons disabled until balanced
- JE list page with three tabs: Draft (default), Approved, Posted -- count badge on each
- Approval is optional: Draft -> Posted directly OR Draft -> Approved -> Posted
- Three action buttons: Save Draft, Approve, Post
- Checkbox selection on Draft/Approved tab rows
- Floating bulk action bar at bottom when selected: "Approve Selected" and "Post Selected" with count
- "Reverse" button on posted entry detail creates new draft with flipped debits/credits, auto-linked to original
- User reviews reversal draft before posting
- One "Family Office Standard" template (~40 accounts) + Blank option
- Template includes family-office-specific accounts (Partner Capital, Management Fees, Realized/Unrealized Gains, etc.)
- Template accounts fully editable after creation
- Template can apply at entity creation OR to existing entities with merge logic (skip duplicates by account number)

### Claude's Discretion
- Audit trail display format and location (inline, separate tab, or modal)
- Loading skeleton patterns for COA and JE pages
- Exact spacing, padding, typography sizing within the brand system
- Error state handling and toast notification design
- JE auto-numbering format (JE-001, JE-002, etc.)
- Closed period enforcement UX (how the error surfaces when trying to post to a closed period)
- Template merge conflict resolution details (exact matching logic for duplicates)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| COA-01 | Create accounts with name, number, type, description | Prisma Account model with slide-over form; Zod validation schema; RESTful POST /api/entities/:entityId/accounts |
| COA-02 | Hierarchical parent/sub-account relationships | Self-referencing `parentId` on Account model; 2-level max depth; parent accounts aggregate children balances |
| COA-03 | Customizable account numbers (e.g., 1000-series) | 5-digit numbering scheme stored as String; auto-suggest next available via query on siblings |
| COA-04 | Search and filter by name, number, or type | Client-side search + type filter chips on COA table; Prisma `where` OR clause for server filtering |
| COA-05 | Current balance inline for each account | AccountBalance table updated atomically via trigger or interactive transaction on posting |
| COA-06 | Edit and deactivate accounts (soft delete) | `isActive` boolean; deactivated accounts hidden from selectors but preserved for historical JEs |
| COA-07 | Each entity has own COA scoped by entity_id | `entityId` FK on Account model; all queries scoped via entityScope() helper from Phase 1 |
| JE-01 | Create JE with date, description, 2+ line items | JournalEntry + JournalEntryLine models; useFieldArray for dynamic lines; min 2 lines validated by Zod |
| JE-02 | Double-entry enforcement (client + server + DB) | Client: live sum comparison; Server: Zod refine; DB: deferred constraint trigger on line items |
| JE-03 | Draft -> Approved -> Posted workflow | Status enum on JournalEntry; state transition validation in API; UI tabs filter by status |
| JE-04 | Edit/delete drafts; posted entries immutable | API checks status before allowing mutation; DB trigger blocks UPDATE/DELETE on posted entries |
| JE-05 | One-click reversing entries linked to original | Create new draft JE with flipped amounts; `reversalOfId` FK linking to original posted entry |
| JE-06 | Prevent posting to closed periods (DB layer) | DB trigger on JournalEntry status change checks period_close table; Phase 4 builds period close UI but trigger skeleton added now |
| JE-07 | Audit trail: who created, approved, when posted | `createdBy`, `approvedBy`, `postedBy` user ID fields + timestamps; JournalEntryAudit log table for edit history |
| JE-08 | Bulk-post multiple selected drafts | API endpoint accepts array of IDs; Prisma interactive transaction posts all or rolls back |
| DI-03 | Account balances via materialized/cached table updated atomically | AccountBalance table with trigger-based update on JournalEntryLine insert when parent JE is posted |
| DI-04 | DB trigger prevents UPDATE/DELETE on posted JEs | BEFORE UPDATE/DELETE trigger on journal_entries raises exception when status = 'POSTED' |
| DI-05 | DB trigger validates SUM(debit) = SUM(credit) | Deferred AFTER constraint trigger on journal_entry_lines validates per journal_entry_id |
</phase_requirements>

## Standard Stack

### Core (Phase 2 additions to Phase 1 stack)

No new npm packages required. Phase 2 uses the same stack established in Phase 1:

| Library | Version | Purpose | Phase 2 Usage |
|---------|---------|---------|---------------|
| react-hook-form | ^7.51 | Form management | `useFieldArray` for JE line items; slide-over forms for account CRUD |
| @hookform/resolvers | ^3.x | Zod bridge | Zod validation on JE form (debit = credit refinement) |
| zod | ^3.23 | Schema validation | Account schemas, JE schemas with cross-field validation |
| decimal.js | ^10.4 | Decimal arithmetic | All debit/credit math on client (running totals) and server (balance computation) |
| shadcn/ui | latest | Components | Combobox (Popover+Command), Sheet (slide-over), Table, Tabs, Badge, Checkbox |
| Prisma | ^5.14 | ORM + migrations | Schema models, interactive transactions, custom SQL migrations for triggers |
| sonner | ^1.4 | Toast notifications | Success/error feedback on JE posting, account operations |

### Additional shadcn/ui Components to Install

```bash
npx shadcn@latest add tabs checkbox command popover sheet
```

(Some may already be installed from Phase 1. The `command` component is built on cmdk and powers the account searchable combobox.)

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| useFieldArray | TanStack Form | react-hook-form already in stack from Phase 1; switching adds complexity |
| Trigger-based balance | Prisma aggregate on read | Triggers keep balances always current; aggregate on read is slow at scale and complex for parent rollups |
| Deferred constraint trigger | Application-only validation | DB trigger is defense-in-depth; app bugs can't corrupt ledger |
| Separate AccountBalance table | Balance column on Account | Separate table enables atomic trigger updates without locking Account row |

## Architecture Patterns

### Prisma Schema (Phase 2 models)

```prisma
// prisma/schema.prisma additions for Phase 2

enum AccountType {
  ASSET
  LIABILITY
  EQUITY
  INCOME
  EXPENSE
}

enum JournalEntryStatus {
  DRAFT
  APPROVED
  POSTED
}

model Account {
  id          String      @id @default(cuid())
  entityId    String
  entity      Entity      @relation(fields: [entityId], references: [id])
  number      String      // "10000", "10100", etc.
  name        String
  type        AccountType
  description String?
  parentId    String?
  parent      Account?    @relation("AccountHierarchy", fields: [parentId], references: [id])
  children    Account[]   @relation("AccountHierarchy")
  isActive    Boolean     @default(true)
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  lineItems   JournalEntryLine[]
  balance     AccountBalance?

  @@unique([entityId, number])
  @@index([entityId, isActive])
  @@index([entityId, type])
  @@map("accounts")
}

model AccountBalance {
  id        String   @id @default(cuid())
  accountId String   @unique
  account   Account  @relation(fields: [accountId], references: [id])
  debitTotal  Decimal  @db.Decimal(19, 4) @default(0)
  creditTotal Decimal  @db.Decimal(19, 4) @default(0)
  balance     Decimal  @db.Decimal(19, 4) @default(0) // debitTotal - creditTotal
  updatedAt DateTime @updatedAt

  @@map("account_balances")
}

model JournalEntry {
  id          String              @id @default(cuid())
  entityId    String
  entity      Entity              @relation(fields: [entityId], references: [id])
  entryNumber String              // "JE-001" auto-generated per entity
  date        DateTime            @db.Date
  description String
  status      JournalEntryStatus  @default(DRAFT)

  // Audit fields
  createdBy   String              // Clerk user ID
  approvedBy  String?
  postedBy    String?
  createdAt   DateTime            @default(now())
  approvedAt  DateTime?
  postedAt    DateTime?
  updatedAt   DateTime            @updatedAt

  // Reversal linking
  reversalOfId String?            @unique
  reversalOf   JournalEntry?      @relation("Reversal", fields: [reversalOfId], references: [id])
  reversedBy   JournalEntry?      @relation("Reversal")

  lineItems   JournalEntryLine[]

  @@unique([entityId, entryNumber])
  @@index([entityId, status])
  @@index([entityId, date])
  @@map("journal_entries")
}

model JournalEntryLine {
  id             String       @id @default(cuid())
  journalEntryId String
  journalEntry   JournalEntry @relation(fields: [journalEntryId], references: [id], onDelete: Cascade)
  accountId      String
  account        Account      @relation(fields: [accountId], references: [id])
  debit          Decimal      @db.Decimal(19, 4) @default(0)
  credit         Decimal      @db.Decimal(19, 4) @default(0)
  memo           String?
  sortOrder      Int          @default(0)

  @@index([journalEntryId])
  @@index([accountId])
  @@map("journal_entry_lines")
}

model JournalEntryAudit {
  id             String   @id @default(cuid())
  journalEntryId String
  action         String   // "CREATED", "EDITED", "APPROVED", "POSTED", "REVERSAL_CREATED"
  userId         String   // Clerk user ID
  changes        Json?    // diff of what changed (for edits)
  createdAt      DateTime @default(now())

  @@index([journalEntryId])
  @@map("journal_entry_audit")
}
```

### Pattern 1: PostgreSQL Trigger -- Immutability of Posted Entries (DI-04)

**What:** BEFORE UPDATE/DELETE trigger that blocks modification of posted journal entries and their line items.
**When:** Applied via custom Prisma migration (`npx prisma migrate dev --create-only`).

```sql
-- Migration: add_posted_immutability_trigger

-- Prevent UPDATE/DELETE on posted journal entries
CREATE OR REPLACE FUNCTION prevent_posted_je_modification()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status = 'POSTED' THEN
      RAISE EXCEPTION 'Cannot delete posted journal entry (id: %). Posted entries are immutable.', OLD.id;
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Allow status transitions TO posted (that's the posting action itself)
    IF OLD.status = 'POSTED' AND NEW.status = 'POSTED' THEN
      RAISE EXCEPTION 'Cannot modify posted journal entry (id: %). Posted entries are immutable.', OLD.id;
    END IF;
    -- Allow the transition from DRAFT/APPROVED -> POSTED
    IF OLD.status = 'POSTED' AND NEW.status != 'POSTED' THEN
      RAISE EXCEPTION 'Cannot change status of posted journal entry (id: %). Use a reversing entry instead.', OLD.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_posted_je_immutable
  BEFORE UPDATE OR DELETE ON journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION prevent_posted_je_modification();

-- Prevent modification of line items belonging to posted JEs
CREATE OR REPLACE FUNCTION prevent_posted_line_modification()
RETURNS TRIGGER AS $$
DECLARE
  je_status TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT status INTO je_status FROM journal_entries WHERE id = OLD.journal_entry_id;
  ELSE
    SELECT status INTO je_status FROM journal_entries WHERE id = NEW.journal_entry_id;
  END IF;

  IF je_status = 'POSTED' THEN
    RAISE EXCEPTION 'Cannot modify line items of a posted journal entry. Posted entries are immutable.';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_posted_line_immutable
  BEFORE INSERT OR UPDATE OR DELETE ON journal_entry_lines
  FOR EACH ROW
  EXECUTE FUNCTION prevent_posted_line_modification();
```

### Pattern 2: PostgreSQL Trigger -- Debit/Credit Balance Validation (DI-05)

**What:** Deferred constraint trigger that validates SUM(debit) = SUM(credit) per journal entry at transaction commit.
**When:** Fires at end of transaction, after all line items are inserted/updated.

```sql
-- Migration: add_balance_validation_trigger

CREATE OR REPLACE FUNCTION validate_je_balance()
RETURNS TRIGGER AS $$
DECLARE
  total_debit NUMERIC(19,4);
  total_credit NUMERIC(19,4);
  je_id TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    je_id := OLD.journal_entry_id;
  ELSE
    je_id := NEW.journal_entry_id;
  END IF;

  SELECT COALESCE(SUM(debit), 0), COALESCE(SUM(credit), 0)
  INTO total_debit, total_credit
  FROM journal_entry_lines
  WHERE journal_entry_id = je_id;

  IF total_debit != total_credit THEN
    RAISE EXCEPTION 'Journal entry % is unbalanced: total debits (%) != total credits (%)',
      je_id, total_debit, total_credit;
  END IF;

  RETURN NULL; -- AFTER trigger, return value is ignored
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER trg_validate_je_balance
  AFTER INSERT OR UPDATE OR DELETE ON journal_entry_lines
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION validate_je_balance();
```

### Pattern 3: Atomic Balance Update on Posting (DI-03)

**What:** When a journal entry transitions to POSTED, atomically update AccountBalance for each affected account.
**When:** Inside a Prisma interactive transaction during posting.

```typescript
// src/lib/journal-entries/post.ts
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";

export async function postJournalEntry(journalEntryId: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    // 1. Lock the journal entry and verify it's postable
    const je = await tx.journalEntry.findUniqueOrThrow({
      where: { id: journalEntryId },
      include: { lineItems: true },
    });

    if (je.status === "POSTED") {
      throw new Error("Journal entry is already posted");
    }

    // 2. Update status to POSTED
    await tx.journalEntry.update({
      where: { id: journalEntryId },
      data: {
        status: "POSTED",
        postedBy: userId,
        postedAt: new Date(),
      },
    });

    // 3. Update account balances atomically
    for (const line of je.lineItems) {
      await tx.accountBalance.upsert({
        where: { accountId: line.accountId },
        create: {
          accountId: line.accountId,
          debitTotal: line.debit,
          creditTotal: line.credit,
          balance: new Prisma.Decimal(line.debit.toString())
            .minus(new Prisma.Decimal(line.credit.toString())),
        },
        update: {
          debitTotal: { increment: line.debit },
          creditTotal: { increment: line.credit },
          balance: {
            increment: new Prisma.Decimal(line.debit.toString())
              .minus(new Prisma.Decimal(line.credit.toString())),
          },
        },
      });
    }

    // 4. Record audit trail
    await tx.journalEntryAudit.create({
      data: {
        journalEntryId,
        action: "POSTED",
        userId,
      },
    });
  });
}
```

**Note on balance update approach:** Using Prisma `increment` in the interactive transaction is atomic within the transaction. An alternative is a PostgreSQL trigger on journal_entry_lines that fires when the parent JE becomes POSTED. The application-level approach is chosen because: (a) it keeps business logic visible in TypeScript, (b) Prisma's interactive transactions provide ACID guarantees, and (c) triggers for balance updates would need complex logic to detect the status change. The DB triggers (DI-04, DI-05) handle integrity constraints; the application handles balance computation.

### Pattern 4: JE Line Items with useFieldArray

**What:** Dynamic spreadsheet-style line items using react-hook-form's useFieldArray.
**When:** Journal entry create/edit form.

```typescript
// src/components/journal-entries/je-line-items.tsx
import { useFieldArray, useWatch, Control } from "react-hook-form";
import { Decimal } from "decimal.js";
import type { JournalEntryFormValues } from "@/lib/validators/journal-entry";

export function JELineItems({ control }: { control: Control<JournalEntryFormValues> }) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "lineItems",
  });

  // Watch all line items for live totals
  const lineItems = useWatch({ control, name: "lineItems" });

  const totalDebit = lineItems?.reduce(
    (sum, item) => sum.plus(new Decimal(item?.debit || "0")),
    new Decimal("0")
  ) ?? new Decimal("0");

  const totalCredit = lineItems?.reduce(
    (sum, item) => sum.plus(new Decimal(item?.credit || "0")),
    new Decimal("0")
  ) ?? new Decimal("0");

  const isBalanced = totalDebit.equals(totalCredit) && !totalDebit.isZero();
  const difference = totalDebit.minus(totalCredit).abs();

  return (
    <>
      <table>
        <thead>
          <tr>
            <th>Account</th>
            <th>Debit</th>
            <th>Credit</th>
            <th>Memo</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {fields.map((field, index) => (
            <tr key={field.id}>
              {/* Account combobox, debit/credit inputs, memo, remove button */}
              {/* Each row uses Controller for the combobox, register for inputs */}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td>Totals</td>
            <td>{totalDebit.toFixed(2)}</td>
            <td>{totalCredit.toFixed(2)}</td>
            <td colSpan={2}>
              {isBalanced ? (
                <span className="text-green-600">Balanced</span>
              ) : (
                <span className="text-red-600">
                  Difference: {difference.toFixed(2)}
                </span>
              )}
            </td>
          </tr>
        </tfoot>
      </table>
      <button
        type="button"
        onClick={() => append({ accountId: "", debit: "0", credit: "0", memo: "" })}
      >
        Add Line
      </button>
    </>
  );
}
```

### Pattern 5: Searchable Account Combobox

**What:** shadcn Combobox (Popover + Command) for account selection in JE line items.
**When:** Each line item row in the JE form.

```typescript
// src/components/journal-entries/account-combobox.tsx
// Built on shadcn's Popover + Command components (cmdk under the hood)
// - Shows account number + name + type badge in dropdown
// - Filters by both number and name as user types
// - Keyboard navigable (arrow keys, enter, escape)
// - Excludes parent accounts (no direct posting) and inactive accounts
```

### Pattern 6: Zod Schema with Cross-Field Validation

**What:** Zod schema that validates debits equal credits at the form/API level.
**When:** Both client-side form validation and server-side API validation.

```typescript
// src/lib/validators/journal-entry.ts
import { z } from "zod";
import { Decimal } from "decimal.js";

const lineItemSchema = z.object({
  accountId: z.string().min(1, "Account is required"),
  debit: z.string().refine(
    (v) => !new Decimal(v || "0").isNegative(),
    "Debit must be non-negative"
  ),
  credit: z.string().refine(
    (v) => !new Decimal(v || "0").isNegative(),
    "Credit must be non-negative"
  ),
  memo: z.string().optional(),
}).refine(
  (line) => {
    const d = new Decimal(line.debit || "0");
    const c = new Decimal(line.credit || "0");
    return !(d.isZero() && c.isZero()); // At least one must be non-zero
  },
  { message: "Each line must have a debit or credit amount" }
);

export const journalEntrySchema = z.object({
  date: z.string().min(1, "Date is required"),
  description: z.string().min(1, "Description is required"),
  lineItems: z.array(lineItemSchema).min(2, "At least 2 line items required"),
}).refine(
  (data) => {
    const totalDebit = data.lineItems.reduce(
      (sum, item) => sum.plus(new Decimal(item.debit || "0")),
      new Decimal("0")
    );
    const totalCredit = data.lineItems.reduce(
      (sum, item) => sum.plus(new Decimal(item.credit || "0")),
      new Decimal("0")
    );
    return totalDebit.equals(totalCredit);
  },
  { message: "Total debits must equal total credits", path: ["lineItems"] }
);
```

### Pattern 7: COA Template Seeding

**What:** Seed a "Family Office Standard" template of ~40 accounts for new or existing entities.
**When:** Entity creation (if user chooses template) or on-demand for existing entities.

```typescript
// src/lib/accounts/template.ts
// Family Office Standard template structure:
// 10000 Assets
//   10100 Cash and Cash Equivalents
//   10200 Investment Accounts
//   10300 Receivables
//   10400 Other Assets
// 20000 Liabilities
//   20100 Accounts Payable
//   20200 Loans Payable
//   20300 Accrued Expenses
// 30000 Equity
//   30100 Partner Capital - LP
//   30200 Partner Capital - GP
//   30300 Retained Earnings
//   30400 Distributions
// 40000 Income
//   40100 Management Fees
//   40200 Realized Gains
//   40300 Unrealized Gains
//   40400 Dividend Income
//   40500 Interest Income
//   40600 K-1 Allocations
// 50000 Expenses
//   50100 Management Fees Expense
//   50200 Fund Administration
//   50300 Legal and Professional
//   50400 Accounting Fees
//   50500 Insurance
//   50600 Office Expenses

// Merge logic for existing entities:
// 1. Load template accounts
// 2. Query existing accounts by entity + number
// 3. Skip any template account whose number already exists
// 4. Insert remaining accounts
// 5. Return count of inserted vs skipped
```

### Recommended Project Structure (Phase 2 additions)

```
src/
  app/
    (auth)/
      accounts/
        page.tsx                      -- COA indented table with search/filter
      journal-entries/
        page.tsx                      -- JE list with Draft/Approved/Posted tabs
        new/
          page.tsx                    -- JE creation form (full page)
        [journalEntryId]/
          page.tsx                    -- JE detail/edit view
    api/
      entities/
        [entityId]/
          accounts/
            route.ts                  -- GET (list), POST (create)
            [accountId]/
              route.ts                -- GET, PUT (edit + deactivate)
            template/
              route.ts                -- POST (apply template)
            next-number/
              route.ts                -- GET (suggest next account number)
          journal-entries/
            route.ts                  -- GET (list with status filter), POST (create)
            [journalEntryId]/
              route.ts                -- GET, PUT (edit draft), DELETE (delete draft)
              approve/
                route.ts              -- POST (approve)
              post/
                route.ts              -- POST (post entry)
              reverse/
                route.ts              -- POST (create reversal draft)
            bulk-post/
              route.ts                -- POST (bulk post selected entries)
            bulk-approve/
              route.ts                -- POST (bulk approve selected entries)
  components/
    accounts/
      account-table.tsx               -- Indented COA table
      account-form.tsx                -- Create/edit form in slide-over
      account-type-chips.tsx          -- Type filter chips
      account-number-input.tsx        -- Auto-suggest number input
    journal-entries/
      je-list.tsx                     -- Tabbed list (Draft/Approved/Posted)
      je-form.tsx                     -- Full JE form with line items
      je-line-items.tsx               -- useFieldArray spreadsheet table
      account-combobox.tsx            -- Searchable account selector
      je-status-badge.tsx             -- Draft/Approved/Posted badge
      je-bulk-action-bar.tsx          -- Floating bar for bulk operations
      je-totals-row.tsx               -- Running totals with balanced indicator
      je-audit-trail.tsx              -- Audit history display
  lib/
    validators/
      account.ts                      -- Zod schemas for Account
      journal-entry.ts                -- Zod schemas for JE with balance validation
    accounts/
      template.ts                     -- FOA Standard template data + merge logic
      next-number.ts                  -- Auto-suggest next account number
    journal-entries/
      post.ts                         -- Posting logic with balance update
      reverse.ts                      -- Reversal creation logic
      auto-number.ts                  -- JE auto-numbering (JE-001 format)
```

### Anti-Patterns to Avoid

- **Floating-point arithmetic for money:** Never use `+`, `-`, `*`, `/` on debit/credit values. Always use decimal.js methods (`.plus()`, `.minus()`, `.times()`, `.dividedBy()`). JavaScript `0.1 + 0.2 !== 0.3` will corrupt financial data.
- **Checking balance only on the client:** Client validation is UX convenience. Server-side Zod validation catches bugs. DB trigger catches everything else. All three layers are required (defense in depth).
- **Allowing direct posting to parent accounts:** Parent accounts are aggregation containers only. The API must reject line items pointing to accounts that have children.
- **Using Prisma `$queryRaw` for Decimal results without conversion:** `$queryRaw` returns JavaScript Number for Decimal columns, losing precision. Use `$queryRawTyped` or explicitly convert results with `new Decimal(result.toString())`.
- **Editing posted entries in the API:** Even if the trigger would catch it, the API should check status first and return a clear 400 error rather than letting the DB trigger fire with a 500.
- **Computing balances on every page load with SUM aggregation:** For COA with 40+ accounts, running SUM queries per account on each load is wasteful. Use the AccountBalance table for O(1) lookups.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Searchable dropdown | Custom autocomplete with keyboard nav | shadcn Combobox (Popover + Command/cmdk) | Keyboard navigation, ARIA combobox pattern, fuzzy search all handled |
| Dynamic form rows | Manual array state management | react-hook-form useFieldArray | Handles add/remove/reorder with stable IDs, proper re-render optimization |
| Decimal arithmetic | `parseFloat()` + JS arithmetic | decimal.js via `new Decimal()` | Precision-safe for financial calculations; Prisma returns Decimal natively |
| Toast notifications | Custom notification system | sonner (shadcn-recommended) | Already in Phase 1 stack; accessible, animated, stacking |
| Slide-over panel | Custom drawer component | shadcn Sheet | Accessible, animated, handles focus trap and escape key |
| Tab navigation | Custom tab state | shadcn Tabs | Accessible, keyboard navigable, composable |
| Debit = credit enforcement | Application-only validation | PostgreSQL deferred constraint trigger + app validation | DB trigger is the safety net; app bugs cannot corrupt the ledger |

## Common Pitfalls

### Pitfall 1: Prisma Decimal Serialization Across Server/Client Boundary
**What goes wrong:** Prisma returns `Decimal` objects from the server. When passed to client components via props or JSON, they serialize incorrectly or lose precision.
**Why it happens:** `Decimal` is a class instance, not a plain value. JSON.stringify converts it to a number, potentially losing precision.
**How to avoid:** Serialize Decimal to string before sending to client. In API responses: `balance: balance.toString()`. On client, reconstruct with `new Decimal(value)` for math.
**Warning signs:** Rounding errors in displayed balances, `[object Object]` in UI.

### Pitfall 2: Race Condition in Balance Updates
**What goes wrong:** Two journal entries posting simultaneously to the same account create a race condition where one balance update overwrites the other.
**Why it happens:** Read-modify-write pattern outside a transaction, or using Prisma `update` with set instead of `increment`.
**How to avoid:** Use Prisma's atomic `increment` operator within an interactive transaction. The `increment` operation is atomic at the database level.
**Warning signs:** Account balance doesn't match SUM of posted line items.

### Pitfall 3: Deferred Trigger Not Deferring
**What goes wrong:** The balance validation trigger fires after each individual line item insert, not at transaction end, causing false "unbalanced" errors.
**Why it happens:** Trigger is created without `DEFERRABLE INITIALLY DEFERRED`, or the application inserts lines outside a transaction.
**How to avoid:** Use `CREATE CONSTRAINT TRIGGER ... DEFERRABLE INITIALLY DEFERRED`. Ensure all line item operations happen within a Prisma interactive transaction.
**Warning signs:** "Unbalanced" errors even when inserting correct matching debit/credit lines.

### Pitfall 4: Parent Account Balance Not Updating
**What goes wrong:** Parent account balance shows 0 even though sub-accounts have balances.
**Why it happens:** AccountBalance is only updated for accounts directly referenced in line items. Parent accounts are never directly posted to.
**How to avoid:** When fetching COA, compute parent balance by summing children's AccountBalance records. Don't store parent balance separately -- compute it at read time from children. This avoids complex cascading trigger updates.
**Warning signs:** Parent account shows $0 while children show non-zero balances.

### Pitfall 5: JE Auto-Numbering Gaps or Duplicates
**What goes wrong:** Concurrent JE creation produces duplicate entry numbers or gaps.
**Why it happens:** Reading MAX(entryNumber) and incrementing is not atomic.
**How to avoid:** Use a PostgreSQL sequence per entity, or use Prisma interactive transaction: read max, increment, insert. The `@@unique([entityId, entryNumber])` constraint catches duplicates at DB level.
**Warning signs:** "Unique constraint violation" errors, or users see JE-001, JE-003 with no JE-002.

### Pitfall 6: Closed Period Check Without Period Close Table
**What goes wrong:** JE-06 requires DB-layer enforcement of closed periods, but Phase 4 delivers the period close UI.
**Why it happens:** Temporal dependency between phases.
**How to avoid:** Create the `period_closes` table in Phase 2 migrations (just the table, no UI). Add the trigger that checks it. With no rows in the table, the trigger always passes. Phase 4 adds the UI to insert rows. This way the enforcement is wired from day one.
**Warning signs:** Forgetting to create the table means retroactively adding the trigger in Phase 4 requires re-testing all posting logic.

## Code Examples

### Account Number Auto-Suggestion

```typescript
// src/lib/accounts/next-number.ts
import { prisma } from "@/lib/db/prisma";

export async function suggestNextAccountNumber(
  entityId: string,
  parentNumber?: string
): Promise<string> {
  if (!parentNumber) {
    // Top-level account: find highest top-level number and add 10000
    const maxAccount = await prisma.account.findFirst({
      where: { entityId, parentId: null },
      orderBy: { number: "desc" },
    });
    if (!maxAccount) return "10000";
    const next = Math.ceil((parseInt(maxAccount.number) + 10000) / 10000) * 10000;
    return next.toString();
  }

  // Sub-account: find siblings and suggest next in 100 increments
  const siblings = await prisma.account.findMany({
    where: {
      entityId,
      parent: { number: parentNumber },
    },
    orderBy: { number: "desc" },
    take: 1,
  });

  if (siblings.length === 0) {
    return (parseInt(parentNumber) + 100).toString();
  }

  return (parseInt(siblings[0].number) + 100).toString();
}
```

### Reversing Entry Creation

```typescript
// src/lib/journal-entries/reverse.ts
import { prisma } from "@/lib/db/prisma";

export async function createReversalDraft(
  journalEntryId: string,
  userId: string
) {
  return prisma.$transaction(async (tx) => {
    const original = await tx.journalEntry.findUniqueOrThrow({
      where: { id: journalEntryId },
      include: { lineItems: true },
    });

    if (original.status !== "POSTED") {
      throw new Error("Can only reverse posted entries");
    }

    // Generate next entry number
    const nextNumber = await generateNextEntryNumber(tx, original.entityId);

    const reversal = await tx.journalEntry.create({
      data: {
        entityId: original.entityId,
        entryNumber: nextNumber,
        date: new Date(),
        description: `Reversal of ${original.entryNumber}`,
        status: "DRAFT",
        createdBy: userId,
        reversalOfId: original.id,
        lineItems: {
          create: original.lineItems.map((line, index) => ({
            accountId: line.accountId,
            debit: line.credit,   // Flip: original credit becomes debit
            credit: line.debit,   // Flip: original debit becomes credit
            memo: `Reversal: ${line.memo || ""}`,
            sortOrder: index,
          })),
        },
      },
      include: { lineItems: true },
    });

    await tx.journalEntryAudit.create({
      data: {
        journalEntryId: original.id,
        action: "REVERSAL_CREATED",
        userId,
        changes: { reversalId: reversal.id },
      },
    });

    return reversal;
  });
}
```

### Bulk Post Operation

```typescript
// src/lib/journal-entries/bulk-post.ts
import { prisma } from "@/lib/db/prisma";

export async function bulkPostEntries(
  journalEntryIds: string[],
  userId: string
) {
  return prisma.$transaction(async (tx) => {
    const results = [];

    for (const id of journalEntryIds) {
      const je = await tx.journalEntry.findUniqueOrThrow({
        where: { id },
        include: { lineItems: true },
      });

      if (je.status === "POSTED") {
        throw new Error(`Entry ${je.entryNumber} is already posted`);
      }

      // Update status
      await tx.journalEntry.update({
        where: { id },
        data: {
          status: "POSTED",
          postedBy: userId,
          postedAt: new Date(),
        },
      });

      // Update balances for each line
      for (const line of je.lineItems) {
        await tx.accountBalance.upsert({
          where: { accountId: line.accountId },
          create: {
            accountId: line.accountId,
            debitTotal: line.debit,
            creditTotal: line.credit,
            balance: line.debit.sub(line.credit),
          },
          update: {
            debitTotal: { increment: line.debit },
            creditTotal: { increment: line.credit },
            balance: { increment: line.debit.sub(line.credit) },
          },
        });
      }

      await tx.journalEntryAudit.create({
        data: {
          journalEntryId: id,
          action: "POSTED",
          userId,
        },
      });

      results.push(je.entryNumber);
    }

    return results;
  });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Compute balances on every read | Materialized balance table with atomic updates | Industry standard | O(1) balance lookups instead of O(n) aggregation |
| Application-only debit=credit check | Defense-in-depth: client + server + DB trigger | Best practice | DB trigger prevents corruption from any source |
| Mutable ledger entries | Immutable posted entries + reversing entries | Accounting standard | Audit trail integrity; no rewriting history |
| PostgreSQL CHECK for cross-row validation | Deferred constraint trigger | PostgreSQL feature | CHECK can't reference other rows; triggers can |

## Open Questions

1. **Prisma `increment` with Decimal type**
   - What we know: Prisma supports `increment` on numeric fields. Decimal fields use decimal.js.
   - What's unclear: Whether `increment` works correctly with `@db.Decimal(19,4)` or requires raw SQL. Prisma docs show `increment` with Int/Float but Decimal examples are sparse.
   - Recommendation: Test during implementation. If `increment` doesn't work with Decimal, fall back to raw SQL within the interactive transaction: `UPDATE account_balances SET debit_total = debit_total + $1 WHERE account_id = $2`.

2. **Closed period table schema**
   - What we know: JE-06 requires DB enforcement now; Phase 4 builds the UI.
   - What's unclear: Exact schema for period_closes table (month granularity? date range? entity-scoped?).
   - Recommendation: Create a minimal table: `period_closes(id, entityId, year, month, closedBy, closedAt)` with unique constraint on `(entityId, year, month)`. The posting trigger checks if the JE date falls in a closed period. Phase 4 may adjust but the trigger contract stays the same.

3. **JE auto-numbering scope and format**
   - What we know: Numbers should be per-entity (JE-001, JE-002, etc.).
   - What's unclear: Whether to use PostgreSQL sequence (per-entity sequences are complex) or application-level MAX + 1.
   - Recommendation: Application-level within interactive transaction: `SELECT MAX(entry_number) FROM journal_entries WHERE entity_id = $1 FOR UPDATE`. The `@@unique` constraint catches any concurrency edge cases. Format as `JE-{padded_number}` (e.g., JE-001, JE-042, JE-1337).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^2.x + @testing-library/react ^16.x (from Phase 1 research) |
| Config file | vitest.config.ts (Phase 1 sets up) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| COA-01 | Create account with valid fields | unit | `npx vitest run src/lib/validators/account.test.ts -t "create"` | Wave 0 |
| COA-02 | Parent/child hierarchy enforced | unit | `npx vitest run src/lib/accounts/hierarchy.test.ts` | Wave 0 |
| COA-03 | Account number auto-suggest | unit | `npx vitest run src/lib/accounts/next-number.test.ts` | Wave 0 |
| COA-04 | Search/filter accounts | unit | `npx vitest run src/lib/accounts/search.test.ts` | Wave 0 |
| COA-05 | Balance reflects posted transactions | integration | `npx vitest run src/lib/journal-entries/post.test.ts -t "balance"` | Wave 0 |
| COA-06 | Soft deactivate (no hard delete) | unit | `npx vitest run src/lib/validators/account.test.ts -t "deactivate"` | Wave 0 |
| COA-07 | Entity scoping on accounts | unit | `npx vitest run src/lib/accounts/scoping.test.ts` | Wave 0 |
| JE-01 | Create JE with 2+ line items | unit | `npx vitest run src/lib/validators/journal-entry.test.ts -t "create"` | Wave 0 |
| JE-02 | Debits = credits validation (Zod) | unit | `npx vitest run src/lib/validators/journal-entry.test.ts -t "balance"` | Wave 0 |
| JE-03 | Status transitions (Draft/Approved/Posted) | unit | `npx vitest run src/lib/journal-entries/status.test.ts` | Wave 0 |
| JE-04 | Draft editable, posted immutable | unit | `npx vitest run src/lib/journal-entries/immutability.test.ts` | Wave 0 |
| JE-05 | Reversal creates linked draft | unit | `npx vitest run src/lib/journal-entries/reverse.test.ts` | Wave 0 |
| JE-06 | Closed period blocks posting | integration | `npx vitest run src/lib/journal-entries/post.test.ts -t "closed period"` | Wave 0 |
| JE-07 | Audit trail recorded | unit | `npx vitest run src/lib/journal-entries/audit.test.ts` | Wave 0 |
| JE-08 | Bulk post multiple entries | integration | `npx vitest run src/lib/journal-entries/bulk-post.test.ts` | Wave 0 |
| DI-03 | Balance table updated atomically | integration | `npx vitest run src/lib/journal-entries/post.test.ts -t "atomic balance"` | Wave 0 |
| DI-04 | DB trigger blocks posted modification | integration | Manual DB test or integration test with real DB | Wave 0 |
| DI-05 | DB trigger validates debit=credit | integration | Manual DB test or integration test with real DB | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/validators/account.test.ts` -- Zod schema validation for accounts (COA-01, COA-06)
- [ ] `src/lib/validators/journal-entry.test.ts` -- Zod schema with debit=credit refinement (JE-01, JE-02)
- [ ] `src/lib/accounts/next-number.test.ts` -- Auto-suggest logic (COA-03)
- [ ] `src/lib/journal-entries/post.test.ts` -- Posting + balance update logic (COA-05, JE-06, DI-03)
- [ ] `src/lib/journal-entries/reverse.test.ts` -- Reversal creation (JE-05)
- [ ] `src/lib/journal-entries/bulk-post.test.ts` -- Bulk posting (JE-08)
- [ ] `src/lib/journal-entries/status.test.ts` -- Status transition validation (JE-03)

Note: DI-04 and DI-05 (PostgreSQL triggers) require integration tests against a real database. These can be tested with a test database connection or verified manually during implementation. Vitest unit tests can mock Prisma for the application-layer logic.

## Sources

### Primary (HIGH confidence)
- [PostgreSQL CREATE TRIGGER Documentation](https://www.postgresql.org/docs/current/sql-createtrigger.html) -- trigger syntax, DEFERRABLE, CONSTRAINT triggers
- [PostgreSQL PL/pgSQL Trigger Functions](https://www.postgresql.org/docs/current/plpgsql-trigger.html) -- trigger function patterns, TG_OP, RETURN
- [Prisma Transactions Documentation](https://www.prisma.io/docs/orm/prisma-client/queries/transactions) -- interactive transactions, atomic operations
- [Prisma Customizing Migrations](https://www.prisma.io/docs/orm/prisma-migrate/workflows/customizing-migrations) -- --create-only workflow for raw SQL
- [Prisma Aggregation Documentation](https://www.prisma.io/docs/orm/prisma-client/queries/aggregation-grouping-summarizing) -- _sum, groupBy for Decimal fields
- [react-hook-form useFieldArray](https://react-hook-form.com/docs/usefieldarray) -- dynamic form array management
- [shadcn/ui Combobox](https://ui.shadcn.com/docs/components/radix/combobox) -- Popover + Command pattern

### Secondary (MEDIUM confidence)
- [Modern Treasury: Enforcing Immutability in Double-Entry Ledger](https://www.moderntreasury.com/journal/enforcing-immutability-in-your-double-entry-ledger) -- pending/posted pattern, industry best practices
- [NYKevin Double-Entry Bookkeeping PostgreSQL Gist](https://gist.github.com/NYKevin/9433376) -- community-validated schema patterns
- [Journalize.io Elegant DB Schema](https://blog.journalize.io/posts/an-elegant-db-schema-for-double-entry-accounting/) -- schema design reference
- [Prisma Decimal Issue #9163](https://github.com/prisma/prisma/issues/9163) -- known precision loss with $queryRaw

### Tertiary (LOW confidence)
- Prisma `increment` with Decimal type -- needs validation during implementation; docs show Int/Float examples but Decimal behavior unconfirmed

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- same Phase 1 stack, no new dependencies, well-documented
- Architecture (schema + triggers): HIGH -- PostgreSQL triggers are mature, well-documented; Prisma migration workflow for raw SQL is documented
- Architecture (JE form UI): HIGH -- react-hook-form useFieldArray + shadcn Combobox are standard patterns
- Pitfalls: HIGH -- documented across multiple sources (Prisma Decimal serialization, race conditions, trigger deferral)
- Balance materialization: MEDIUM -- approach is sound but Prisma Decimal increment needs validation
- Closed period enforcement: MEDIUM -- table/trigger design is straightforward but exact schema deferred to implementation

**Research date:** 2026-03-26
**Valid until:** 2026-04-26 (stable stack, no fast-moving dependencies)
