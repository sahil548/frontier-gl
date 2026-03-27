import { describe, it } from 'vitest'

describe('Ledger Filters', () => {
  it.todo('filters by memo text (case-insensitive search on description and line_memo)')
  it.todo('filters by minimum amount (debit OR credit >= min)')
  it.todo('filters by maximum amount (debit OR credit <= max)')
  it.todo('filters by amount range (min AND max together)')
  it.todo('combines date range with text and amount filters')
  it.todo('returns empty array when no transactions match filters')
})
