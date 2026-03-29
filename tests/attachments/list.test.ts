import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// ATTCH-02: Attachment listing contract
//
// The GET handler for attachments queries prisma.attachment.findMany ordered
// by createdAt desc and returns the array.
//
// We test the ordering and empty-state logic without Prisma by operating on
// in-memory attachment arrays that match the schema shape.
// ---------------------------------------------------------------------------

type Attachment = {
  id: string;
  journalEntryId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  url: string;
  uploadedBy: string;
  createdAt: Date;
};

/**
 * Mirror of the ordering behaviour applied by prisma.attachment.findMany
 * with orderBy: { createdAt: "desc" }.
 * Returns a new array sorted newest-first.
 */
function sortAttachmentsDesc(attachments: Attachment[]): Attachment[] {
  return [...attachments].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );
}

const JOURNAL_ENTRY_ID = "je-test-001";

function makeAttachment(overrides: Partial<Attachment> & { id: string }): Attachment {
  return {
    journalEntryId: JOURNAL_ENTRY_ID,
    fileName: "receipt.pdf",
    fileType: "application/pdf",
    fileSize: 102400,
    url: "https://blob.vercel-storage.com/attachments/test/receipt.pdf",
    uploadedBy: "user-001",
    createdAt: new Date("2026-03-01T10:00:00Z"),
    ...overrides,
  };
}

describe("Attachment listing", () => {
  it("returns attachments for a journal entry ordered by createdAt desc", () => {
    const oldest = makeAttachment({
      id: "att-1",
      createdAt: new Date("2026-01-10T08:00:00Z"),
      fileName: "invoice_jan.pdf",
    });
    const middle = makeAttachment({
      id: "att-2",
      createdAt: new Date("2026-02-15T12:30:00Z"),
      fileName: "receipt_feb.png",
      fileType: "image/png",
    });
    const newest = makeAttachment({
      id: "att-3",
      createdAt: new Date("2026-03-20T16:00:00Z"),
      fileName: "statement_mar.pdf",
    });

    // Simulate unsorted data as it might arrive from DB
    const unsorted = [oldest, newest, middle];
    const sorted = sortAttachmentsDesc(unsorted);

    expect(sorted).toHaveLength(3);

    // Newest first
    expect(sorted[0].id).toBe("att-3");
    expect(sorted[1].id).toBe("att-2");
    expect(sorted[2].id).toBe("att-1");

    // Verify strict descending order
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].createdAt.getTime()).toBeLessThan(
        sorted[i - 1].createdAt.getTime()
      );
    }

    // All belong to the correct journal entry
    for (const att of sorted) {
      expect(att.journalEntryId).toBe(JOURNAL_ENTRY_ID);
    }
  });

  it("returns empty array when no attachments exist", () => {
    const sorted = sortAttachmentsDesc([]);

    expect(Array.isArray(sorted)).toBe(true);
    expect(sorted).toHaveLength(0);
  });
});
