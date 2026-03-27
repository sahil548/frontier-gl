"use client";

import { Badge } from "@/components/ui/badge";

type JEStatusBadgeProps = {
  status: string;
};

const STATUS_CONFIG: Record<string, { label: string; variant: "outline" | "secondary" | "default" }> = {
  DRAFT: { label: "Draft", variant: "outline" },
  APPROVED: { label: "Approved", variant: "secondary" },
  POSTED: { label: "Posted", variant: "default" },
};

/**
 * Small badge showing journal entry status with color coding.
 * DRAFT: gray/outline, APPROVED: blue/secondary, POSTED: green/default.
 */
export function JEStatusBadge({ status }: JEStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? { label: status, variant: "outline" as const };

  return (
    <Badge variant={config.variant}>
      {config.label}
    </Badge>
  );
}
