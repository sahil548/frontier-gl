"use client";

import * as React from "react";
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

// ---- Types ----------------------------------------------------------------

interface PositionOption {
  id: string;
  name: string;
  holdingName: string;
  holdingType: string;
  accountId: string;
  accountNumber: string;
}

interface PositionPickerProps {
  entityId: string;
  value: string | null;
  onChange: (positionId: string | null, accountId: string | null) => void;
  disabled?: boolean;
}

// ---- Cache ----------------------------------------------------------------

const positionsCache = new Map<string, { data: PositionOption[]; time: number }>();
const CACHE_TTL = 60_000;

async function fetchPositionsCached(entityId: string): Promise<PositionOption[]> {
  const cached = positionsCache.get(entityId);
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return cached.data;
  }
  try {
    const res = await fetch(`/api/entities/${entityId}/positions`);
    if (!res.ok) return [];
    const json = await res.json();
    if (!json.success) return [];
    const options: PositionOption[] = (
      json.data as {
        id: string;
        name: string;
        holdingName: string;
        holdingType: string;
        accountId: string;
        accountNumber: string;
      }[]
    ).map((p) => ({
      id: p.id,
      name: p.name,
      holdingName: p.holdingName,
      holdingType: p.holdingType,
      accountId: p.accountId,
      accountNumber: p.accountNumber,
    }));
    positionsCache.set(entityId, { data: options, time: Date.now() });
    return options;
  } catch {
    return [];
  }
}

// ---- Component ------------------------------------------------------------

export function PositionPicker({
  entityId,
  value,
  onChange,
  disabled,
}: PositionPickerProps) {
  const [open, setOpen] = React.useState(false);
  const [positions, setPositions] = React.useState<PositionOption[]>([]);

  React.useEffect(() => {
    if (!entityId) return;
    fetchPositionsCached(entityId).then(setPositions);
  }, [entityId]);

  const selected = React.useMemo(
    () => positions.find((p) => p.id === value) ?? null,
    [positions, value]
  );

  const displayLabel = (p: PositionOption) =>
    `${p.holdingName} -> ${p.name}`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled}
          />
        }
      >
        {selected ? displayLabel(selected) : "Select position..."}
        <ChevronsUpDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-[var(--anchor-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search positions..." />
          <CommandList>
            <CommandEmpty>
              <div className="py-2 text-center text-sm">
                <p>No positions found.</p>
                <p className="text-muted-foreground text-xs mt-1">
                  Create holdings first to see positions here.
                </p>
              </div>
            </CommandEmpty>
            <CommandGroup>
              {positions.map((pos) => (
                <CommandItem
                  key={pos.id}
                  value={`${pos.holdingName} ${pos.name} ${pos.holdingType}`}
                  onSelect={() => {
                    onChange(pos.id, pos.accountId);
                    setOpen(false);
                  }}
                  data-checked={value === pos.id}
                >
                  <CheckIcon
                    className={cn(
                      "mr-2 size-4 shrink-0",
                      value === pos.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="flex-1 truncate">
                    {displayLabel(pos)}
                  </span>
                  <Badge
                    variant="outline"
                    className="ml-2 text-[10px] shrink-0"
                  >
                    {pos.holdingType.replace(/_/g, " ")}
                  </Badge>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
