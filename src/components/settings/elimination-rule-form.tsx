"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  createEliminationRuleSchema,
  type CreateEliminationRuleInput,
} from "@/lib/validators/elimination-rule";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import type { SerializedEliminationRule } from "@/types/consolidated";

type EntityOption = { id: string; name: string };
type AccountOption = { id: string; number: string; name: string };

type EliminationRuleFormProps = {
  rule?: SerializedEliminationRule;
  entities: EntityOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

/** Cache for entity accounts to avoid redundant fetches */
const accountCache = new Map<string, { data: AccountOption[]; ts: number }>();
const CACHE_TTL = 60_000;

async function fetchAccountsForEntity(
  entityId: string
): Promise<AccountOption[]> {
  const cached = accountCache.get(entityId);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  const res = await fetch(`/api/entities/${entityId}/accounts`);
  const json = await res.json();
  if (!json.success) return [];

  const accounts: AccountOption[] = (json.data ?? []).map(
    (a: { id: string; number: string; name: string }) => ({
      id: a.id,
      number: a.number,
      name: a.name,
    })
  );
  accountCache.set(entityId, { data: accounts, ts: Date.now() });
  return accounts;
}

/**
 * Slide-over form for creating and editing elimination rules.
 * Entity-scoped account selectors fetch accounts when entity is selected.
 */
export function EliminationRuleForm({
  rule,
  entities,
  open,
  onOpenChange,
  onSuccess,
}: EliminationRuleFormProps) {
  const isEdit = !!rule;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accountsA, setAccountsA] = useState<AccountOption[]>([]);
  const [accountsB, setAccountsB] = useState<AccountOption[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateEliminationRuleInput>({
    resolver: zodResolver(createEliminationRuleSchema),
    defaultValues: {
      label: rule?.label ?? "",
      entityAId: rule?.entityAId ?? "",
      accountAId: rule?.accountAId ?? "",
      entityBId: rule?.entityBId ?? "",
      accountBId: rule?.accountBId ?? "",
    },
  });

  // Reset form when opened/rule changes
  useEffect(() => {
    if (open) {
      reset({
        label: rule?.label ?? "",
        entityAId: rule?.entityAId ?? "",
        accountAId: rule?.accountAId ?? "",
        entityBId: rule?.entityBId ?? "",
        accountBId: rule?.accountBId ?? "",
      });
    }
  }, [open, rule, reset]);

  const entityAId = watch("entityAId");
  const entityBId = watch("entityBId");

  // Fetch accounts when entity A changes
  useEffect(() => {
    if (entityAId) {
      fetchAccountsForEntity(entityAId).then(setAccountsA);
    } else {
      setAccountsA([]);
    }
  }, [entityAId]);

  // Fetch accounts when entity B changes
  useEffect(() => {
    if (entityBId) {
      fetchAccountsForEntity(entityBId).then(setAccountsB);
    } else {
      setAccountsB([]);
    }
  }, [entityBId]);

  const onSubmit = async (data: CreateEliminationRuleInput) => {
    setIsSubmitting(true);
    try {
      const url = isEdit
        ? `/api/consolidated/elimination-rules/${rule.id}`
        : `/api/consolidated/elimination-rules`;
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (json.success) {
        toast.success(isEdit ? "Rule updated" : "Rule created");
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error(json.error || "Something went wrong");
      }
    } catch {
      toast.error("Failed to save rule");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedEntityA = entities.find((e) => e.id === entityAId);
  const selectedEntityB = entities.find((e) => e.id === entityBId);
  const selectedAccountA = accountsA.find(
    (a) => a.id === watch("accountAId")
  );
  const selectedAccountB = accountsB.find(
    (a) => a.id === watch("accountBId")
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md overflow-y-auto"
        showOverlay={false}
      >
        <SheetHeader>
          <SheetTitle>
            {isEdit ? "Edit Elimination Rule" : "Create Elimination Rule"}
          </SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Update the intercompany elimination rule."
              : "Define an entity/account pair for intercompany elimination."}
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-5 px-4 pb-4"
        >
          {/* Label */}
          <div className="space-y-2">
            <Label htmlFor="rule-label">Label</Label>
            <Input
              id="rule-label"
              placeholder="e.g. Intercompany Loan: Holding Co > Fund I"
              {...register("label")}
            />
            {errors.label && (
              <p className="text-sm text-destructive">
                {errors.label.message}
              </p>
            )}
          </div>

          {/* Entity A */}
          <div className="space-y-2">
            <Label>Entity A</Label>
            <Select
              value={entityAId || "__none__"}
              onValueChange={(val) => {
                const v = !val || val === "__none__" ? "" : val;
                setValue("entityAId", v, { shouldValidate: true });
                setValue("accountAId", "", { shouldValidate: false });
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {selectedEntityA?.name ?? "Select entity"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="__none__">Select entity</SelectItem>
                  {entities.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            {errors.entityAId && (
              <p className="text-sm text-destructive">
                {errors.entityAId.message}
              </p>
            )}
          </div>

          {/* Account A */}
          <div className="space-y-2">
            <Label>Account A</Label>
            <Select
              value={watch("accountAId") || "__none__"}
              onValueChange={(val) =>
                setValue("accountAId", !val || val === "__none__" ? "" : val, {
                  shouldValidate: true,
                })
              }
              disabled={!entityAId}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {selectedAccountA
                    ? `${selectedAccountA.number} - ${selectedAccountA.name}`
                    : "Select account"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="__none__">Select account</SelectItem>
                  {accountsA.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.number} - {a.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            {errors.accountAId && (
              <p className="text-sm text-destructive">
                {errors.accountAId.message}
              </p>
            )}
          </div>

          {/* Entity B */}
          <div className="space-y-2">
            <Label>Entity B</Label>
            <Select
              value={entityBId || "__none__"}
              onValueChange={(val) => {
                const v = !val || val === "__none__" ? "" : val;
                setValue("entityBId", v, { shouldValidate: true });
                setValue("accountBId", "", { shouldValidate: false });
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {selectedEntityB?.name ?? "Select entity"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="__none__">Select entity</SelectItem>
                  {entities.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            {errors.entityBId && (
              <p className="text-sm text-destructive">
                {errors.entityBId.message}
              </p>
            )}
          </div>

          {/* Account B */}
          <div className="space-y-2">
            <Label>Account B</Label>
            <Select
              value={watch("accountBId") || "__none__"}
              onValueChange={(val) =>
                setValue("accountBId", !val || val === "__none__" ? "" : val, {
                  shouldValidate: true,
                })
              }
              disabled={!entityBId}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {selectedAccountB
                    ? `${selectedAccountB.number} - ${selectedAccountB.name}`
                    : "Select account"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="__none__">Select account</SelectItem>
                  {accountsB.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.number} - {a.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            {errors.accountBId && (
              <p className="text-sm text-destructive">
                {errors.accountBId.message}
              </p>
            )}
          </div>

          {/* Submit */}
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting
              ? isEdit
                ? "Saving..."
                : "Creating..."
              : isEdit
                ? "Save Changes"
                : "Create Rule"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
