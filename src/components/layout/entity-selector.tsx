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
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

export function EntitySelector() {
  const [open, setOpen] = useState(false);
  const { currentEntityId, setCurrentEntityId, entities, isLoading } =
    useEntityContext();

  if (isLoading || entities.length === 0) return null;

  const activeEntities = entities.filter((e) => e.isActive);
  const currentEntity = activeEntities.find((e) => e.id === currentEntityId);
  const displayName = currentEntity ? currentEntity.name : "All Entities";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            className="w-[180px] justify-between font-normal"
          />
        }
      >
        <span className="truncate">{displayName}</span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search entities..." />
          <CommandList>
            <CommandEmpty>No entities found.</CommandEmpty>
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
              {activeEntities.map((entity) => (
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
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
