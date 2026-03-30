"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { ChevronsUpDown, Plus } from "lucide-react";
import { TagForm } from "@/components/dimensions/tag-form";

type TagOption = {
  id: string;
  dimensionId: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
};

type DimensionComboboxProps = {
  dimensionId: string;
  dimensionName: string;
  value: string;
  onChange: (tagId: string) => void;
  entityId: string;
  disabled?: boolean;
  /** Pre-fetched tags from parent dimensions fetch to avoid redundant API calls */
  initialTags?: TagOption[];
};

// Module-level cache keyed by dimensionId with TTL (60 seconds)
const tagsCache = new Map<string, { data: TagOption[]; fetchedAt: number }>();
const CACHE_TTL_MS = 60_000;

/**
 * Searchable dimension tag selector built on Popover + Command (cmdk).
 * Follows the AccountCombobox pattern. Supports inline quick-create via TagForm Sheet.
 */
export function DimensionCombobox({
  dimensionId,
  dimensionName,
  value,
  onChange,
  entityId,
  disabled,
  initialTags,
}: DimensionComboboxProps) {
  const [open, setOpen] = useState(false);
  const [tagFormOpen, setTagFormOpen] = useState(false);
  const hasInitialTags = initialTags !== undefined;
  const cached = tagsCache.get(dimensionId);
  const isCacheValid = cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS;
  const [tags, setTags] = useState<TagOption[]>(
    (initialTags && initialTags.length > 0) ? initialTags : (isCacheValid ? cached!.data : [])
  );
  const [isLoading, setIsLoading] = useState(!hasInitialTags && !isCacheValid);

  // Sync from initial tags prop when parent finishes loading
  useEffect(() => {
    if (initialTags && initialTags.length > 0) {
      setTags(initialTags);
      setIsLoading(false);
    }
  }, [initialTags]);

  const fetchTags = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/entities/${entityId}/dimensions/${dimensionId}/tags`
      );
      if (!res.ok) return;
      const json = await res.json();
      if (json.success) {
        const activeTags = (json.data as TagOption[]).filter((t) => t.isActive);
        tagsCache.set(dimensionId, { data: activeTags, fetchedAt: Date.now() });
        setTags(activeTags);
      }
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  }, [entityId, dimensionId]);

  useEffect(() => {
    // Skip fetch if parent provided tags
    if (hasInitialTags) return;

    const cached = tagsCache.get(dimensionId);
    const isCacheValid = cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS;
    if (isCacheValid) {
      setTags(cached.data);
      setIsLoading(false);
      return;
    }

    fetchTags();
  }, [dimensionId, fetchTags, hasInitialTags]);

  const selectedTag = useMemo(
    () => tags.find((t) => t.id === value),
    [tags, value]
  );

  const handleTagCreated = () => {
    // Invalidate cache and refetch
    tagsCache.delete(dimensionId);
    fetchTags().then(() => {
      // After refetch, select the most recently created tag (highest sortOrder or last)
      const latestCached = tagsCache.get(dimensionId);
      if (latestCached && latestCached.data.length > 0) {
        const newest = latestCached.data[latestCached.data.length - 1];
        onChange(newest.id);
      }
    });
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-between font-normal text-left h-8"
              disabled={disabled}
            />
          }
        >
          {selectedTag ? (
            <span className="truncate">
              {selectedTag.code} - {selectedTag.name}
            </span>
          ) : (
            <span className="text-muted-foreground truncate">
              Select {dimensionName}...
            </span>
          )}
          <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
        </PopoverTrigger>
        <PopoverContent className="w-[260px] p-0" align="start">
          <Command>
            <CommandInput placeholder={`Search ${dimensionName}...`} />
            <CommandList>
              <CommandEmpty>
                {isLoading ? "Loading tags..." : "No tags found."}
              </CommandEmpty>
              <CommandGroup>
                {tags.map((tag) => (
                  <CommandItem
                    key={tag.id}
                    value={`${tag.code} ${tag.name}`}
                    onSelect={() => {
                      onChange(tag.id);
                      setOpen(false);
                    }}
                    data-checked={value === tag.id ? "true" : undefined}
                    className="flex items-center gap-2"
                  >
                    <span className="font-mono text-xs">{tag.code}</span>
                    <span className="truncate flex-1">{tag.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    setOpen(false);
                    setTagFormOpen(true);
                  }}
                  className="flex items-center gap-2 text-primary"
                >
                  <Plus className="h-3.5 w-3.5" />
                  New {dimensionName}
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <TagForm
        mode="create"
        entityId={entityId}
        dimensionId={dimensionId}
        open={tagFormOpen}
        onOpenChange={setTagFormOpen}
        onSuccess={handleTagCreated}
      />
    </>
  );
}
