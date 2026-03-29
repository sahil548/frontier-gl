"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  createDimensionSchema,
  type CreateDimensionInput,
} from "@/lib/validators/dimension";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

type DimensionData = {
  id: string;
  entityId: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
};

type DimensionFormProps = {
  mode: "create" | "edit";
  entityId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editDimension?: DimensionData;
};

export function DimensionForm({
  mode,
  entityId,
  open,
  onOpenChange,
  onSuccess,
  editDimension,
}: DimensionFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const isEdit = mode === "edit" && editDimension;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateDimensionInput>({
    resolver: zodResolver(createDimensionSchema),
    defaultValues: {
      name: isEdit ? editDimension.name : "",
    },
  });

  useEffect(() => {
    if (open) {
      if (isEdit) {
        reset({ name: editDimension.name });
        setIsActive(editDimension.isActive);
      } else {
        reset({ name: "" });
        setIsActive(true);
      }
    }
  }, [open, isEdit, editDimension, reset]);

  const onSubmit = async (data: CreateDimensionInput) => {
    setIsSubmitting(true);
    try {
      const url = isEdit
        ? `/api/entities/${entityId}/dimensions/${editDimension.id}`
        : `/api/entities/${entityId}/dimensions`;
      const method = isEdit ? "PUT" : "POST";

      const body = isEdit ? { ...data, isActive } : data;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();

      if (json.success) {
        toast.success(isEdit ? "Dimension updated" : "Dimension created");
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error(json.error || "Something went wrong");
      }
    } catch {
      toast.error("Failed to save dimension");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md overflow-y-auto"
        showOverlay={false}
      >
        <SheetHeader>
          <SheetTitle>
            {isEdit ? "Edit Dimension" : "New Dimension"}
          </SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Update this dimension type or deactivate it."
              : "Create a new dimension type (e.g. Fund, Property, Department)."}
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-5 px-4 pb-4"
        >
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="dimension-name">Dimension Name</Label>
            <Input
              id="dimension-name"
              placeholder="e.g. Fund, Property, Department"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Active toggle (edit mode only) */}
          {isEdit && (
            <div className="flex items-center justify-between">
              <Label htmlFor="dimension-active">Active</Label>
              <Switch
                id="dimension-active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>
          )}

          {/* Submit */}
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting
              ? isEdit
                ? "Saving..."
                : "Creating..."
              : isEdit
                ? "Save Changes"
                : "Create Dimension"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
