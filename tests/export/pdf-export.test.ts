import { describe, it } from 'vitest'

describe('PDF Export - Ledger', () => {
  it.todo('creates landscape PDF document')
  it.todo('includes header with entity name, account name, date range, and Frontier GL branding')
  it.todo('renders beginning balance row and totals footer')
  it.todo('right-aligns Debit, Credit, Balance columns')
})

describe('PDF Export - Trial Balance', () => {
  it.todo('creates portrait PDF document')
  it.todo('includes header with entity name, as-of date, and Frontier GL branding')
  it.todo('groups rows by account type with subtotals')
  it.todo('shows verification status text (in balance / out of balance)')
})
