"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";

const ENTITY_TYPES = [
  { value: "LP", label: "LP" },
  { value: "LLC", label: "LLC" },
  { value: "CORPORATION", label: "Corporation" },
  { value: "S_CORP", label: "S-Corp" },
  { value: "TRUST", label: "Trust" },
  { value: "FOUNDATION", label: "Foundation" },
  { value: "PARTNERSHIP", label: "Partnership" },
  { value: "INDIVIDUAL", label: "Individual" },
  { value: "OTHER", label: "Other" },
];

const COA_TEMPLATES = [
  { value: "TEMPLATE", label: "Start with template" },
  { value: "BLANK", label: "Start blank" },
];

/**
 * Form schema for client-side validation.
 * Mirrors the server-side createEntitySchema.
 */
const entityFormSchema = z.object({
  name: z
    .string()
    .min(1, "Entity name is required")
    .max(200, "Entity name must be 200 characters or fewer"),
  type: z.string().min(1, "Entity type is required"),
  typeOther: z.string().max(100).optional(),
  fiscalYearEnd: z
    .string()
    .regex(
      /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/,
      "Must be in MM-DD format"
    ),
  coaTemplate: z.string().min(1),
});

type EntityFormValues = z.infer<typeof entityFormSchema>;

type EntityFormProps = {
  mode: "create" | "edit";
  defaultValues?: Partial<EntityFormValues> & { id?: string; isActive?: boolean };
  onSuccess?: () => void;
};

/**
 * Reusable entity form for create and edit modes.
 * Uses react-hook-form with Zod validation.
 * On submit: POST or PUT to /api/entities.
 */
export function EntityForm({ mode, defaultValues, onSuccess }: EntityFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EntityFormValues>({
    resolver: zodResolver(entityFormSchema),
    defaultValues: {
      name: defaultValues?.name || "",
      type: defaultValues?.type || "",
      typeOther: defaultValues?.typeOther || "",
      fiscalYearEnd: defaultValues?.fiscalYearEnd || "12-31",
      coaTemplate: defaultValues?.coaTemplate || "BLANK",
    },
  });

  const watchType = watch("type");

  const onSubmit = async (data: EntityFormValues) => {
    setIsSubmitting(true);
    try {
      const url =
        mode === "create"
          ? "/api/entities"
          : `/api/entities/${defaultValues?.id}`;
      const method = mode === "create" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (json.success) {
        toast.success(
          mode === "create" ? "Entity created" : "Entity updated"
        );
        onSuccess?.();
        router.refresh();
      } else {
        toast.error(json.error || "Something went wrong");
      }
    } catch {
      toast.error("Failed to save entity");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async () => {
    if (!defaultValues?.id) return;
    setIsDeactivating(true);
    try {
      const res = await fetch(`/api/entities/${defaultValues.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: false }),
      });

      const json = await res.json();

      if (json.success) {
        toast.success("Entity deactivated");
        router.push("/entities");
        router.refresh();
      } else {
        toast.error(json.error || "Failed to deactivate");
      }
    } catch {
      toast.error("Failed to deactivate entity");
    } finally {
      setIsDeactivating(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Entity Name</Label>
        <Input
          id="name"
          placeholder="e.g. Family Trust"
          {...register("name")}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      {/* Type */}
      <div className="space-y-2">
        <Label htmlFor="type">Entity Type</Label>
        <Select
          value={watchType}
          onValueChange={(val) => val && setValue("type", val, { shouldValidate: true })}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select entity type" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {ENTITY_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        {errors.type && (
          <p className="text-sm text-destructive">{errors.type.message}</p>
        )}
      </div>

      {/* Type Other (conditional) */}
      {watchType === "OTHER" && (
        <div className="space-y-2">
          <Label htmlFor="typeOther">Type Description</Label>
          <Input
            id="typeOther"
            placeholder="Describe the entity type"
            {...register("typeOther")}
          />
          {errors.typeOther && (
            <p className="text-sm text-destructive">
              {errors.typeOther.message}
            </p>
          )}
        </div>
      )}

      {/* Fiscal Year End */}
      <div className="space-y-2">
        <Label htmlFor="fiscalYearEnd">Fiscal Year End</Label>
        <Input
          id="fiscalYearEnd"
          placeholder="MM-DD (e.g. 12-31)"
          {...register("fiscalYearEnd")}
        />
        <p className="text-xs text-muted-foreground">
          Enter the month and day (MM-DD) when the fiscal year ends.
        </p>
        {errors.fiscalYearEnd && (
          <p className="text-sm text-destructive">
            {errors.fiscalYearEnd.message}
          </p>
        )}
      </div>

      {/* COA Template */}
      <div className="space-y-2">
        <Label htmlFor="coaTemplate">Chart of Accounts</Label>
        <Select
          value={watch("coaTemplate")}
          onValueChange={(val) =>
            val && setValue("coaTemplate", val, { shouldValidate: true })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select template" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {COA_TEMPLATES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {/* Submit */}
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting
          ? mode === "create"
            ? "Creating..."
            : "Saving..."
          : mode === "create"
            ? "Create Entity"
            : "Save Changes"}
      </Button>

      {/* Deactivate (edit mode only) */}
      {mode === "edit" && defaultValues?.isActive !== false && (
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
            Deactivate Entity
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Deactivate Entity</DialogTitle>
              <DialogDescription>
                This will hide the entity from the dropdown and prevent new
                transactions. Existing data will be preserved. This action
                can be reversed by an administrator.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose
                render={<Button variant="outline" />}
              >
                Cancel
              </DialogClose>
              <Button
                variant="destructive"
                onClick={handleDeactivate}
                disabled={isDeactivating}
              >
                {isDeactivating ? "Deactivating..." : "Confirm Deactivate"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </form>
  );
}
