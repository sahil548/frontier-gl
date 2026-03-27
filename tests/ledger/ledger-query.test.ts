import { describe, it } from 'vitest'

describe('Ledger Query - Running Balance', () => {
  it.todo('computes running balance for debit-normal accounts (Assets, Expenses)')
  it.todo('computes running balance for credit-normal accounts (Liabilities, Equity, Income)')
  it.todo('includes beginning balance from transactions before start date')
  it.todo('only includes posted transactions (excludes draft)')
  it.todo('orders transactions by date and JE id')
  it.todo('filters by date range (inclusive both ends)')
  it.todo('returns account summary with current balance and YTD activity')
})
