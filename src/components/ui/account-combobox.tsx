"use client"

import * as React from "react"
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

interface Account {
  id: string
  accountNumber: string
  name: string
}

interface AccountComboboxProps {
  accounts: Account[]
  value: string | null
  onSelect: (accountId: string) => void
  placeholder?: string
}

export function AccountCombobox({
  accounts,
  value,
  onSelect,
  placeholder = "Select account...",
}: AccountComboboxProps) {
  const [open, setOpen] = React.useState(false)

  const selectedAccount = React.useMemo(
    () => accounts.find((a) => a.id === value),
    [accounts, value]
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          />
        }
      >
        {selectedAccount
          ? `${selectedAccount.accountNumber} - ${selectedAccount.name}`
          : placeholder}
        <ChevronsUpDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-[var(--anchor-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search accounts..." />
          <CommandList>
            <CommandEmpty>No account found.</CommandEmpty>
            <CommandGroup>
              {accounts.map((account) => (
                <CommandItem
                  key={account.id}
                  value={`${account.accountNumber} ${account.name}`}
                  onSelect={() => {
                    onSelect(account.id)
                    setOpen(false)
                  }}
                  data-checked={value === account.id}
                >
                  <CheckIcon
                    className={cn(
                      "mr-2 size-4",
                      value === account.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {account.accountNumber} - {account.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
