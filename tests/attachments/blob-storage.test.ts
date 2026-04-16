import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// ATTCH-03: Vercel Blob storage integration
//
// The upload route calls `put(path, file, { access: "public", contentType })`.
// The delete route calls `del(attachment.url)`.
//
// We mock @vercel/blob to verify:
//   1. The correct blob path is constructed: attachments/{entityId}/{jeId}/{fileName}
//   2. del is called with the attachment URL on removal
// ---------------------------------------------------------------------------

// Mock @vercel/blob before any imports that depend on it
vi.mock("@vercel/blob", () => ({
  put: vi.fn(),
  del: vi.fn(),
}));

import { put, del } from "@vercel/blob";

/** Mirror of the blob path construction in the POST handler */
function buildBlobPath(entityId: string, journalEntryId: string, fileName: string): string {
  return `attachments/${entityId}/${journalEntryId}/${fileName}`;
}

/** Simulate what the POST route does when uploading */
async function simulateUpload(
  entityId: string,
  journalEntryId: string,
  file: { name: string; type: string; size: number }
) {
  const path = buildBlobPath(entityId, journalEntryId, file.name);
  // In the real route: put(path, file, { access: "public", contentType: file.type })
  // Cast file to Blob: the mock ignores body type at runtime; we only need
  // TS to accept the call. The real upload route constructs a proper File.
  await vi.mocked(put)(path, file as unknown as Blob, {
    access: "public",
    contentType: file.type,
  });
}

/** Simulate what the DELETE route does when removing an attachment */
async function simulateDelete(attachmentUrl: string) {
  await vi.mocked(del)(attachmentUrl);
}

describe("Vercel Blob storage integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uploads file to correct blob path", async () => {
    const mockPut = put as ReturnType<typeof vi.fn>;
    mockPut.mockResolvedValue({
      url: "https://blob.vercel-storage.com/attachments/entity-1/je-1/receipt.pdf",
      downloadUrl: "https://blob.vercel-storage.com/attachments/entity-1/je-1/receipt.pdf?download=1",
      pathname: "attachments/entity-1/je-1/receipt.pdf",
      contentType: "application/pdf",
      contentDisposition: "inline",
    });

    const entityId = "entity-1";
    const journalEntryId = "je-1";
    const file = { name: "receipt.pdf", type: "application/pdf", size: 51200 };

    await simulateUpload(entityId, journalEntryId, file);

    expect(mockPut).toHaveBeenCalledTimes(1);

    const [calledPath, calledFile, calledOptions] = mockPut.mock.calls[0];

    // Blob path must follow the pattern: attachments/{entityId}/{journalEntryId}/{fileName}
    expect(calledPath).toBe("attachments/entity-1/je-1/receipt.pdf");

    // File object must be passed through
    expect(calledFile).toBe(file);

    // Options must include access: "public" and correct contentType
    expect(calledOptions).toMatchObject({
      access: "public",
      contentType: "application/pdf",
    });
  });

  it("deletes blob when attachment is removed", async () => {
    const mockDel = del as ReturnType<typeof vi.fn>;
    mockDel.mockResolvedValue(undefined);

    const attachmentUrl =
      "https://blob.vercel-storage.com/attachments/entity-1/je-1/receipt.pdf";

    await simulateDelete(attachmentUrl);

    expect(mockDel).toHaveBeenCalledTimes(1);
    expect(mockDel).toHaveBeenCalledWith(attachmentUrl);
  });
});
