import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// ATTCH-01: Attachment upload validation
//
// The route at attachments/route.ts applies these guards before calling Vercel Blob:
//   - File must be present in FormData
//   - File type must be in ALLOWED_TYPES
//   - File size must be <= MAX_FILE_SIZE (10 MB)
//
// We test the validation logic (mirrored from the route) without hitting
// Prisma or Vercel Blob.
// ---------------------------------------------------------------------------

const ALLOWED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/heic",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB in bytes

/** Mirror of the upload validation logic in the attachments route. */
function validateUpload(
  file: { type: string; size: number } | null
): { valid: true } | { valid: false; error: string; status: number } {
  if (!file) {
    return { valid: false, error: "No file provided", status: 400 };
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: "File type not allowed. Accepted: PDF, PNG, JPG, HEIC.",
      status: 400,
    };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: "File size exceeds 10 MB limit", status: 400 };
  }
  return { valid: true };
}

describe("Attachment upload", () => {
  it("accepts PDF files under 10MB", () => {
    const file = { type: "application/pdf", size: 5 * 1024 * 1024 }; // 5 MB
    const result = validateUpload(file);

    expect(result.valid).toBe(true);
  });

  it("accepts PNG/JPG/HEIC image files", () => {
    const pngFile = { type: "image/png", size: 2 * 1024 * 1024 };
    const jpgFile = { type: "image/jpeg", size: 3 * 1024 * 1024 };
    const heicFile = { type: "image/heic", size: 4 * 1024 * 1024 };

    expect(validateUpload(pngFile).valid).toBe(true);
    expect(validateUpload(jpgFile).valid).toBe(true);
    expect(validateUpload(heicFile).valid).toBe(true);
  });

  it("rejects files over 10MB", () => {
    // Exactly at limit is allowed (10 MB - 1 byte)
    const atLimitFile = { type: "image/png", size: MAX_FILE_SIZE };
    expect(validateUpload(atLimitFile).valid).toBe(true);

    // One byte over the limit must fail
    const overLimitFile = { type: "image/png", size: MAX_FILE_SIZE + 1 };
    const result = validateUpload(overLimitFile);

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.status).toBe(400);
      expect(result.error).toContain("10 MB");
    }
  });

  it("rejects unsupported file types", () => {
    const unsupportedTypes = [
      "text/plain",
      "application/zip",
      "video/mp4",
      "image/gif",
      "application/msword",
      "application/vnd.ms-excel",
    ];

    for (const type of unsupportedTypes) {
      const file = { type, size: 1024 };
      const result = validateUpload(file);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.status).toBe(400);
        expect(result.error).toContain("not allowed");
      }
    }
  });
});
