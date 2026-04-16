/**
 * Serialized shape of an Account row as returned by /api/entities/:entityId/accounts.
 * Used by all UI consumers (accounts page, account-table, account-form).
 *
 * Decimal money fields are serialized as strings; nullable cashFlowCategory
 * defaults to null when the account has no explicit CF mapping (Phase 12).
 */
export type SerializedAccount = {
  id: string;
  entityId: string;
  number: string;
  name: string;
  type: string;
  description: string | null;
  parentId: string | null;
  isActive: boolean;
  balance: string;
  debitTotal?: string;
  creditTotal?: string;
  cashFlowCategory: string | null;  // Phase 12
  isContra: boolean;                // Phase 12
};
