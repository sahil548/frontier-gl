"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

import { useEntityContext } from "@/providers/entity-provider"
import { AccountCombobox } from "@/components/ui/account-combobox"

interface AccountOption {
  id: string
  accountNumber: string
  name: string
}

/**
 * GL Ledger standalone page.
 * Shows a searchable account combobox to select an account,
 * then navigates to the account-specific ledger view.
 */
export default function GLLedgerPage() {
  const router = useRouter()
  const { currentEntityId, isLoading: entitiesLoading } = useEntityContext()
  const [accounts, setAccounts] = useState<AccountOption[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchAccounts = useCallback(async () => {
    if (!currentEntityId || currentEntityId === "all") return
    setIsLoading(true)
    try {
      const res = await fetch(`/api/entities/${currentEntityId}/accounts`)
      if (res.ok) {
        const json = await res.json()
        if (json.success) {
          setAccounts(
            json.data.map(
              (a: { id: string; number: string; name: string }) => ({
                id: a.id,
                accountNumber: a.number,
                name: a.name,
              })
            )
          )
        }
      }
    } catch {
      // Silently fail
    } finally {
      setIsLoading(false)
    }
  }, [currentEntityId])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  const handleAccountSelect = (accountId: string) => {
    router.push(`/gl-ledger/${accountId}`)
  }

  if (entitiesLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          General Ledger
        </h1>
        <p className="text-sm text-muted-foreground">
          Select an account to view its transaction ledger.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <p className="text-muted-foreground">Loading accounts...</p>
        </div>
      ) : accounts.length === 0 ? (
        <div className="rounded-md border p-8 text-center">
          <p className="text-muted-foreground">
            No accounts found. Create accounts in{" "}
            <Link href="/accounts" className="text-primary underline underline-offset-4">
              Chart of Accounts
            </Link>{" "}
            first.
          </p>
        </div>
      ) : (
        <div className="max-w-md">
          <AccountCombobox
            accounts={accounts}
            value={null}
            onSelect={handleAccountSelect}
            placeholder="Search and select an account..."
          />
        </div>
      )}
    </div>
  )
}
