/**
 * Shared TypeScript types for the Frontier GL application.
 *
 * These types are used across API routes, client components, and utilities.
 * They represent the serialized (JSON-safe) versions of database models.
 */

// ─── Entity Types ────────────────────────────────────────

export type SerializedEntity = {
  id: string;
  name: string;
  type: string;
  typeOther: string | null;
  fiscalYearEnd: string;
  coaTemplate: string;
  isActive: boolean;
  createdAt: string; // ISO 8601 string
  updatedAt: string; // ISO 8601 string
};

// ─── API Response Types ──────────────────────────────────

export type ApiSuccessResponse<T = unknown> = {
  success: true;
  data: T;
};

export type ApiErrorResponse = {
  success: false;
  error: string;
  details?: Record<string, string[]>;
};

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;
