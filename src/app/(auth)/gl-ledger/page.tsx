"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

/**
 * Redirect /gl-ledger to /accounts.
 * The GL Ledger detail view is accessed by clicking accounts from any page.
 */
export default function GLLedgerRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/accounts")
  }, [router])

  return (
    <div className="flex items-center justify-center py-20">
      <p className="text-muted-foreground">Redirecting to Chart of Accounts...</p>
    </div>
  )
}
