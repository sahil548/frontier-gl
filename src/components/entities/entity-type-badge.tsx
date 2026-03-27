import { Badge } from "@/components/ui/badge";

/**
 * Map entity type enum values to readable labels.
 */
const ENTITY_TYPE_LABELS: Record<string, string> = {
  LP: "LP",
  LLC: "LLC",
  CORPORATION: "Corporation",
  S_CORP: "S-Corp",
  TRUST: "Trust",
  FOUNDATION: "Foundation",
  PARTNERSHIP: "Partnership",
  INDIVIDUAL: "Individual",
  OTHER: "Other",
};

/**
 * Map entity types to badge variant styles.
 */
const ENTITY_TYPE_VARIANT: Record<
  string,
  "default" | "secondary" | "outline"
> = {
  LP: "default",
  LLC: "default",
  CORPORATION: "secondary",
  S_CORP: "secondary",
  TRUST: "outline",
  FOUNDATION: "outline",
  PARTNERSHIP: "secondary",
  INDIVIDUAL: "outline",
  OTHER: "outline",
};

/**
 * Small colored badge displaying entity type with readable label.
 */
export function EntityTypeBadge({ type }: { type: string }) {
  const label = ENTITY_TYPE_LABELS[type] || type;
  const variant = ENTITY_TYPE_VARIANT[type] || "outline";

  return <Badge variant={variant}>{label}</Badge>;
}
