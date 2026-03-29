"use client";

import { Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type AttachmentInfo = {
  fileName: string;
  fileType: string;
  url: string;
} | null;

function isImageType(fileType: string): boolean {
  return fileType.startsWith("image/");
}

/**
 * Full-size attachment viewer modal.
 * Renders images with object-contain and PDFs in an iframe.
 */
export function AttachmentLightbox({
  attachment,
  onClose,
}: {
  attachment: AttachmentInfo;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!attachment} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="truncate pr-4">
              {attachment?.fileName ?? "Attachment"}
            </DialogTitle>
            {attachment && (
              <a
                href={attachment.url}
                download={attachment.fileName}
                className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
              >
                <Download className="mr-2 h-4 w-4" />
                Download
              </a>
            )}
          </div>
        </DialogHeader>

        {attachment && (
          <div className="flex items-center justify-center">
            {isImageType(attachment.fileType) ? (
              <img
                src={attachment.url}
                alt={attachment.fileName}
                className="max-h-[80vh] rounded object-contain"
              />
            ) : (
              <iframe
                src={attachment.url}
                title={attachment.fileName}
                className="h-[80vh] w-full rounded border"
              />
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
