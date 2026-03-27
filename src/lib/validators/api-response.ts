import { z } from "zod";

/**
 * Standardized API response helpers.
 *
 * All API routes should use these helpers to ensure consistent
 * response format: { success: true/false, data/error }.
 */

/**
 * Create a success response with the standard envelope.
 *
 * @param data - The response payload
 * @param status - HTTP status code (default: 200)
 * @returns Response with { success: true, data: T }
 */
export function successResponse<T>(data: T, status = 200): Response {
  return Response.json({ success: true, data }, { status });
}

/**
 * Create an error response with the standard envelope.
 *
 * @param message - Human-readable error message
 * @param status - HTTP status code (default: 400)
 * @param errors - Optional ZodError for field-level validation errors
 * @returns Response with { success: false, error: string, details?: Record<string, string[]> }
 */
export function errorResponse(
  message: string,
  status = 400,
  errors?: z.ZodError
): Response {
  const body: {
    success: false;
    error: string;
    details?: Record<string, string[]>;
  } = {
    success: false,
    error: message,
  };

  if (errors) {
    body.details = errors.flatten().fieldErrors as Record<string, string[]>;
  }

  return Response.json(body, { status });
}
