"use client";

import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { useEntityContext } from "@/providers/entity-provider";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import type { SerializedEntity } from "@/types";

/**
 * Map entity type enum values to readable labels.
 */
const ENTITY_TYPE_LABELS: Record<string, string> = {
  LP: "LPs",
  LLC: "LLCs",
  CORPORATION: "Corporations",
  S_CORP: "S-Corps",
  TRUST: "Trusts",
  FOUNDATION: "Foundations",
  PARTNERSHIP: "Partnerships",
  INDIVIDUAL: "Individuals",
  OTHER: "Other",
};

/**
 * Group entities by type, only including types with active entities.
 */
function groupEntitiesByType(
  entities: SerializedEntity[]
): Record<string, SerializedEntity[]> {
  const groups: Record<string, SerializedEntity[]> = {};
  for (const entity of entities) {
    if (!entity.isActive) continue;
    const key = entity.type;
    if (!groups[key]) groups[key] = [];
    groups[key].push(entity);
  }
  return groups;
}

/**
 * Entity selector dropdown using Popover + Command for searchable switching.
 * "All Entities" pinned at top. Entities grouped by type below.
 * Deactivated entities are completely hidden.
 */
export function EntitySelector() {
  const [open, setOpen] = useState(false);
  const { currentEntityId, setCurrentEntityId, entities, isLoading } =
    useEntityContext();

  const activeEntities = entities.filter((e) => e.isActive);
  const groups = groupEntitiesByType(activeEntities);
  const currentEntity = activeEntities.find((e) => e.id === currentEntityId);
  const displayName = currentEntity ? currentEntity.name : "All Entities";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            className="w-[200px] justify-between font-normal"
          />
        }
      >
        <span className="truncate">{isLoading ? "Loading..." : displayName}</span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search entities..." />
          <CommandList>
            <CommandEmpty>No entities found.</CommandEmpty>

            {/* All Entities - pinned at top */}
            <CommandGroup>
              <CommandItem
                value="all-entities"
                data-checked={currentEntityId === "all"}
                onSelect={() => {
                  setCurrentEntityId("all");
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    currentEntityId === "all" ? "opacity-100" : "opacity-0"
                  )}
                />
                All Entities
              </CommandItem>
            </CommandGroup>

            {Object.keys(groups).length > 0 && <CommandSeparator />}

            {/* Entity groups by type */}
            {Object.entries(groups).map(([type, typeEntities]) => (
              <CommandGroup
                key={type}
                heading={ENTITY_TYPE_LABELS[type] || type}
              >
                {typeEntities.map((entity) => (
                  <CommandItem
                    key={entity.id}
                    value={entity.name}
                    data-checked={currentEntityId === entity.id}
                    onSelect={() => {
                      setCurrentEntityId(entity.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        currentEntityId === entity.id
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    {entity.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
