"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  createTagSchema,
  type CreateTagInput,
} from "@/lib/validators/dimension";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

type DimensionTag = {
  id: string;
  dimensionId: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
};

type TagFormProps = {
  mode: "create" | "edit";
  entityId: string;
  dimensionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editTag?: DimensionTag;
};

export function TagForm({
  mode,
  entityId,
  dimensionId,
  open,
  onOpenChange,
  onSuccess,
  editTag,
}: TagFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const isEdit = mode === "edit" && editTag;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateTagInput>({
    resolver: zodResolver(createTagSchema),
    defaultValues: {
      code: isEdit ? editTag.code : "",
      name: isEdit ? editTag.name : "",
      description: isEdit ? editTag.description ?? "" : "",
    },
  });

  useEffect(() => {
    if (open) {
      if (isEdit) {
        reset({
          code: editTag.code,
          name: editTag.name,
          description: editTag.description ?? "",
        });
        setIsActive(editTag.isActive);
      } else {
        reset({ code: "", name: "", description: "" });
        setIsActive(true);
      }
    }
  }, [open, isEdit, editTag, reset]);

  const onSubmit = async (data: CreateTagInput) => {
    setIsSubmitting(true);
    try {
      const url = isEdit
        ? `/api/entities/${entityId}/dimensions/${dimensionId}/tags/${editTag.id}`
        : `/api/entities/${entityId}/dimensions/${dimensionId}/tags`;
      const method = isEdit ? "PUT" : "POST";

      const body = isEdit ? { ...data, isActive } : data;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();

      if (json.success) {
        toast.success(isEdit ? "Tag updated" : "Tag created");
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error(json.error || "Something went wrong");
      }
    } catch {
      toast.error("Failed to save tag");
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
          <SheetTitle>{isEdit ? "Edit Tag" : "New Tag"}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Update tag details or deactivate it."
              : "Add a new tag to this dimension."}
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-5 px-4 pb-4"
        >
          {/* Code */}
          <div className="space-y-2">
            <Label htmlFor="tag-code">Code</Label>
            <Input
              id="tag-code"
              placeholder="e.g. FND1, PROP2"
              maxLength={10}
              {...register("code")}
            />
            {errors.code && (
              <p className="text-sm text-destructive">{errors.code.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Short alphanumeric identifier (max 10 characters)
            </p>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="tag-name">Name</Label>
            <Input
              id="tag-name"
              placeholder="e.g. Fund I, Main Office"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="tag-description">Description (optional)</Label>
            <Textarea
              id="tag-description"
              placeholder="Brief description of this tag"
              {...register("description")}
            />
          </div>

          {/* Active toggle (edit mode only) */}
          {isEdit && (
            <div className="flex items-center justify-between">
              <Label htmlFor="tag-active">Active</Label>
              <Switch
                id="tag-active"
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
                : "Create Tag"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
