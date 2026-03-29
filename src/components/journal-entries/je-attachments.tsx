"use client";

import { useState, useEffect, useCallback } from "react";
import { Paperclip, Trash2, FileText, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AttachmentLightbox } from "./attachment-lightbox";

type Attachment = {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  url: string;
  createdAt: string;
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function truncateFileName(name: string, maxLen = 20): string {
  if (name.length <= maxLen) return name;
  const ext = name.lastIndexOf(".");
  if (ext === -1) return name.slice(0, maxLen) + "...";
  const extension = name.slice(ext);
  const base = name.slice(0, maxLen - extension.length - 3);
  return base + "..." + extension;
}

function isImageType(fileType: string): boolean {
  return fileType.startsWith("image/");
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export function JEAttachments({
  entityId,
  journalEntryId,
}: {
  entityId: string;
  journalEntryId: string;
}) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedAttachment, setSelectedAttachment] =
    useState<Attachment | null>(null);

  const fetchAttachments = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/entities/${entityId}/journal-entries/${journalEntryId}/attachments`
      );
      const json = await res.json();
      if (json.success) {
        setAttachments(json.data);
      }
    } catch {
      // Silently fail on list fetch
    }
  }, [entityId, journalEntryId]);

  useEffect(() => {
    fetchAttachments();
  }, [fetchAttachments]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so the same file can be re-selected
    e.target.value = "";

    if (file.size > MAX_FILE_SIZE) {
      toast.error("File size exceeds 10 MB limit");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(
        `/api/entities/${entityId}/journal-entries/${journalEntryId}/attachments`,
        { method: "POST", body: formData }
      );
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success(`Uploaded ${file.name}`);
        await fetchAttachments();
      } else {
        toast.error(json.error ?? "Upload failed");
      }
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(attachment: Attachment) {
    if (!window.confirm(`Delete "${attachment.fileName}"?`)) return;

    try {
      const res = await fetch(
        `/api/entities/${entityId}/journal-entries/${journalEntryId}/attachments?id=${attachment.id}`,
        { method: "DELETE" }
      );
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success("Attachment deleted");
        await fetchAttachments();
      } else {
        toast.error(json.error ?? "Delete failed");
      }
    } catch {
      toast.error("Delete failed");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Attachments</h3>
        <div>
          <input
            type="file"
            id="attachment-upload"
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg,.heic"
            onChange={handleUpload}
            disabled={uploading}
          />
          <Button
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() =>
              document.getElementById("attachment-upload")?.click()
            }
          >
            {uploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Paperclip className="mr-2 h-4 w-4" />
            )}
            {uploading ? "Uploading..." : "Attach File"}
          </Button>
        </div>
      </div>

      {attachments.length === 0 && !uploading && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-8 text-muted-foreground">
          <Upload className="mb-2 h-8 w-8" />
          <p className="text-sm">No attachments yet</p>
          <p className="text-xs">PDF, PNG, JPG, or HEIC up to 10 MB</p>
        </div>
      )}

      {attachments.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="group relative flex cursor-pointer flex-col items-center rounded-lg border p-3 transition-colors hover:bg-muted/50"
              onClick={() => setSelectedAttachment(att)}
            >
              {/* Thumbnail or icon */}
              {isImageType(att.fileType) ? (
                <img
                  src={att.url}
                  alt={att.fileName}
                  className="h-20 w-20 rounded object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded bg-muted">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
              )}

              {/* File info */}
              <p
                className="mt-2 w-full truncate text-center text-xs font-medium"
                title={att.fileName}
              >
                {truncateFileName(att.fileName)}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(att.fileSize)}
              </p>

              {/* Delete button */}
              <button
                type="button"
                className="absolute right-1 top-1 rounded-full bg-background p-1 opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(att);
                }}
                title="Delete attachment"
              >
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      <AttachmentLightbox
        attachment={selectedAttachment}
        onClose={() => setSelectedAttachment(null)}
      />
    </div>
  );
}
