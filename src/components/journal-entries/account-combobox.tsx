"use client";

import { useState, useEffect, useMemo } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronsUpDown } from "lucide-react";


type AccountOption = {
  id: string;
  number: string;
  name: string;
  type: string;
  parentId: string | null;
  isActive: boolean;
};

type AccountComboboxProps = {
  value: string;
  onChange: (accountId: string) => void;
  entityId: string;
  disabled?: boolean;
};

const TYPE_LABELS: Record<string, string> = {
  ASSET: "Asset",
  LIABILITY: "Liability",
  EQUITY: "Equity",
  INCOME: "Income",
  EXPENSE: "Expense",
};

// Module-level cache keyed by entityId with TTL (30 seconds)
const accountsCache = new Map<string, { data: AccountOption[]; fetchedAt: number }>();
const CACHE_TTL_MS = 30_000;

/**
 * Searchable account selector built on Popover + Command (cmdk).
 * Feels like a command palette: fast, keyboard-driven, search by number or name.
 * Excludes parent accounts (accounts with children) and inactive accounts.
 */
export function AccountCombobox({
  value,
  onChange,
  entityId,
  disabled,
}: AccountComboboxProps) {
  const [open, setOpen] = useState(false);
  const cached = accountsCache.get(entityId);
  const isCacheValid = cached && (Date.now() - cached.fetchedAt) < CACHE_TTL_MS;
  const [accounts, setAccounts] = useState<AccountOption[]>(
    isCacheValid ? cached.data : []
  );
  const [isLoading, setIsLoading] = useState(!isCacheValid);

  useEffect(() => {
    const cached = accountsCache.get(entityId);
    const isCacheValid = cached && (Date.now() - cached.fetchedAt) < CACHE_TTL_MS;
    if (isCacheValid) {
      setAccounts(cached.data);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    async function fetchAccounts() {
      try {
        const res = await fetch(`/api/entities/${entityId}/accounts`);
        if (!res.ok) return;
        const json = await res.json();
        if (json.success && !cancelled) {
          const all = json.data as AccountOption[];
          accountsCache.set(entityId, { data: all, fetchedAt: Date.now() });
          setAccounts(all);
        }
      } catch {
        // silently fail
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchAccounts();
    return () => {
      cancelled = true;
    };
  }, [entityId]);

  // Filter: exclude parent accounts (those with children) and inactive accounts
  const selectableAccounts = useMemo(() => {
    const parentIds = new Set(
      accounts.filter((a) => a.parentId !== null).map((a) => a.parentId!)
    );
    return accounts.filter((a) => a.isActive && !parentIds.has(a.id));
  }, [accounts]);

  const selectedAccount = selectableAccounts.find((a) => a.id === value);

  return (
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
        {selectedAccount ? (
          <span className="truncate">
            {selectedAccount.number} {selectedAccount.name}
          </span>
        ) : (
          <span className="text-muted-foreground">Select account...</span>
        )}
        <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search by number or name..." />
          <CommandList>
            <CommandEmpty>
              {isLoading ? "Loading accounts..." : "No accounts found."}
            </CommandEmpty>
            <CommandGroup>
              {selectableAccounts.map((account) => (
                <CommandItem
                  key={account.id}
                  value={`${account.number} ${account.name}`}
                  onSelect={() => {
                    onChange(account.id);
                    setOpen(false);
                  }}
                  data-checked={value === account.id ? "true" : undefined}
                  className="flex items-center gap-2"
                >
                  <span className="font-mono text-xs">{account.number}</span>
                  <span className="truncate flex-1">{account.name}</span>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {TYPE_LABELS[account.type] || account.type}
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
