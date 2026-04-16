"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { createAccountSchema } from "@/lib/validators/account";
import type { CreateAccountInput } from "@/lib/validators/account";
import { CashFlowCategory } from "@/generated/prisma/enums";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { AccountNumberInput } from "./account-number-input";
import type { SerializedAccount } from "@/types/account";

const ACCOUNT_TYPES = [
  { value: "ASSET", label: "Asset" },
  { value: "LIABILITY", label: "Liability" },
  { value: "EQUITY", label: "Equity" },
  { value: "INCOME", label: "Income" },
  { value: "EXPENSE", label: "Expense" },
];

const CASH_FLOW_CATEGORIES = [
  { value: CashFlowCategory.OPERATING, label: "Operating" },
  { value: CashFlowCategory.INVESTING, label: "Investing" },
  { value: CashFlowCategory.FINANCING, label: "Financing" },
  { value: CashFlowCategory.EXCLUDED, label: "Excluded" },
];

const BALANCE_SHEET_TYPES = ["ASSET", "LIABILITY", "EQUITY"];

type AccountFormProps = {
  mode: "create" | "edit";
  entityId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  /** All accounts for parent selector */
  accounts: SerializedAccount[];
  /** Pre-selected parent ID (for "Add Sub-Account" action) */
  defaultParentId?: string;
  /** Account to edit (edit mode) */
  editAccount?: SerializedAccount;
};

/**
 * Slide-over panel for creating and editing accounts.
 * Uses react-hook-form with Zod validation.
 */
export function AccountForm({
  mode,
  entityId,
  open,
  onOpenChange,
  onSuccess,
  accounts,
  defaultParentId,
  editAccount,
}: AccountFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const isEdit = mode === "edit" && editAccount;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateAccountInput>({
    resolver: zodResolver(createAccountSchema),
    defaultValues: {
      name: isEdit ? editAccount.name : "",
      number: isEdit ? editAccount.number : "",
      type: isEdit ? (editAccount.type as CreateAccountInput["type"]) : undefined,
      description: isEdit ? editAccount.description ?? "" : "",
      parentId: isEdit ? (editAccount.parentId ?? undefined) : defaultParentId,
      cashFlowCategory: isEdit
        ? (editAccount.cashFlowCategory as CreateAccountInput["cashFlowCategory"]) ?? undefined
        : undefined,
      isContra: isEdit ? editAccount.isContra : false,
    },
  });

  // Reset form when mode/account changes
  useEffect(() => {
    if (open) {
      if (isEdit) {
        reset({
          name: editAccount.name,
          number: editAccount.number,
          type: editAccount.type as CreateAccountInput["type"],
          description: editAccount.description ?? "",
          parentId: editAccount.parentId ?? undefined,
          cashFlowCategory:
            (editAccount.cashFlowCategory as CreateAccountInput["cashFlowCategory"]) ?? undefined,
          isContra: editAccount.isContra,
        });
      } else {
        reset({
          name: "",
          number: "",
          type: undefined,
          description: "",
          parentId: defaultParentId,
          cashFlowCategory: undefined,
          isContra: false,
        });
      }
    }
  }, [open, isEdit, editAccount, defaultParentId, reset]);

  const watchParentId = watch("parentId");
  const watchType = watch("type");

  // When parent is selected, auto-set type from parent
  const parentAccount = accounts.find((a) => a.id === watchParentId);
  useEffect(() => {
    if (parentAccount && mode === "create") {
      setValue("type", parentAccount.type as CreateAccountInput["type"], {
        shouldValidate: true,
      });
    }
  }, [parentAccount, setValue, mode]);

  // Parent-eligible accounts: any active account EXCEPT category headers
  // (10000, 20000, 30000, 40000, 50000) and the account being edited.
  // Category headers are section groups determined by type — nobody posts to them.
  const parentOptions = accounts.filter(
    (a) =>
      a.isActive &&
      parseInt(a.number, 10) % 10000 !== 0 &&
      (!isEdit || a.id !== editAccount?.id) // Can't be parent of itself
  );

  const onSubmit = async (data: CreateAccountInput) => {
    setIsSubmitting(true);
    try {
      const url = isEdit
        ? `/api/entities/${entityId}/accounts/${editAccount.id}`
        : `/api/entities/${entityId}/accounts`;
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (json.success) {
        toast.success(isEdit ? "Account updated" : "Account created");
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error(json.error || "Something went wrong");
      }
    } catch {
      toast.error("Failed to save account");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async () => {
    if (!isEdit) return;
    setIsDeactivating(true);
    try {
      const res = await fetch(
        `/api/entities/${entityId}/accounts/${editAccount.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: false }),
        }
      );

      const json = await res.json();

      if (json.success) {
        toast.success("Account deactivated");
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error(json.error || "Failed to deactivate");
      }
    } catch {
      toast.error("Failed to deactivate account");
    } finally {
      setIsDeactivating(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto" showOverlay={false}>
        <SheetHeader>
          <SheetTitle>
            {isEdit ? "Edit Account" : "Create Account"}
          </SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Update account details or deactivate this account."
              : "Add a new account to the chart of accounts."}
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-5 px-4 pb-4"
        >
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="account-name">Account Name</Label>
            <Input
              id="account-name"
              placeholder="e.g. Cash and Cash Equivalents"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Parent Account */}
          <div className="space-y-2">
            <Label htmlFor="account-parent">Parent Account (optional)</Label>
            <Select
              value={watchParentId ?? "__none__"}
              onValueChange={(val) =>
                setValue(
                  "parentId",
                  !val || val === "__none__" ? undefined : val,
                  { shouldValidate: true }
                )
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {parentAccount
                    ? `${parentAccount.number} - ${parentAccount.name}`
                    : "None (top-level)"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="__none__">None (top-level)</SelectItem>
                  {parentOptions.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.number} - {a.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {/* Account Number */}
          <div className="space-y-2">
            <Label htmlFor="account-number">Account Number</Label>
            <AccountNumberInput
              entityId={entityId}
              parentNumber={parentAccount?.number}
              value={watch("number") ?? ""}
              onChange={(val) =>
                setValue("number", val, { shouldValidate: true })
              }
            />
            {errors.number && (
              <p className="text-sm text-destructive">
                {errors.number.message}
              </p>
            )}
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label htmlFor="account-type">Account Type</Label>
            <Select
              value={watchType ?? ""}
              onValueChange={(val) =>
                val &&
                setValue("type", val as CreateAccountInput["type"], {
                  shouldValidate: true,
                })
              }
              disabled={!!parentAccount}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select account type" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {ACCOUNT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            {parentAccount && (
              <p className="text-xs text-muted-foreground">
                Type inherited from parent account
              </p>
            )}
            {errors.type && (
              <p className="text-sm text-destructive">{errors.type.message}</p>
            )}
          </div>

          {/* Cash Flow Category (balance sheet types only) */}
          {watchType && BALANCE_SHEET_TYPES.includes(watchType) && (
            <div className="space-y-2">
              <Label htmlFor="account-cashflow">Cash Flow Category</Label>
              <Select
                value={watch("cashFlowCategory") ?? "__none__"}
                onValueChange={(val) =>
                  setValue(
                    "cashFlowCategory",
                    !val || val === "__none__"
                      ? undefined
                      : (val as CreateAccountInput["cashFlowCategory"]),
                    { shouldValidate: true }
                  )
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Default (Operating)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="__none__">Default (Operating)</SelectItem>
                    {CASH_FLOW_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Controls how this account appears on the cash flow statement
              </p>
            </div>
          )}

          {/* Is Contra (balance sheet types only) */}
          {watchType && BALANCE_SHEET_TYPES.includes(watchType) && (
            <div className="flex items-start gap-3 py-1">
              <Checkbox
                id="account-contra"
                checked={watch("isContra") ?? false}
                onCheckedChange={(checked) =>
                  setValue("isContra", checked === true, {
                    shouldValidate: true,
                  })
                }
              />
              <div className="space-y-1">
                <Label htmlFor="account-contra" className="cursor-pointer">
                  This is a contra account (opposite normal balance)
                </Label>
                <p className="text-xs text-muted-foreground">
                  Contra accounts are displayed with &quot;Less:&quot; prefix on the
                  balance sheet
                </p>
              </div>
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="account-description">Description (optional)</Label>
            <Textarea
              id="account-description"
              placeholder="Brief description of this account"
              {...register("description")}
            />
            {errors.description && (
              <p className="text-sm text-destructive">
                {errors.description.message}
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
                : "Create Account"}
          </Button>

          {/* Deactivate (edit mode only) */}
          {isEdit && editAccount.isActive && (
            <Dialog>
              <DialogTrigger
                render={
                  <Button
                    type="button"
                    variant="destructive"
                    className="w-full"
                  />
                }
              >
                Deactivate Account
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Deactivate Account</DialogTitle>
                  <DialogDescription>
                    This will hide the account from selectors and the chart of
                    accounts. Existing journal entries referencing this account
                    will be preserved.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose render={<Button variant="outline" />}>
                    Cancel
                  </DialogClose>
                  <Button
                    variant="destructive"
                    onClick={handleDeactivate}
                    disabled={isDeactivating}
                  >
                    {isDeactivating
                      ? "Deactivating..."
                      : "Confirm Deactivate"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </form>
      </SheetContent>
    </Sheet>
  );
}
