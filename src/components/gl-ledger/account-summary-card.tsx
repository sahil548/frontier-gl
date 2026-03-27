"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils/accounting"
import type { AccountType } from "@/lib/utils/accounting"

const TYPE_LABELS: Record<string, string> = {
  ASSET: "Asset",
  LIABILITY: "Liability",
  EQUITY: "Equity",
  INCOME: "Income",
  EXPENSE: "Expense",
}

interface AccountSummaryCardProps {
  account: {
    accountNumber: string
    name: string
    type: AccountType
  }
  summary: {
    currentBalance: number
    ytdDebits: number
    ytdCredits: number
  }
}

export function AccountSummaryCard({
  account,
  summary,
}: AccountSummaryCardProps) {
  return (
    <Card>
      <CardContent>
        <div className="flex items-start justify-between">
          {/* Left side: account info */}
          <div className="space-y-1">
            <div className="text-2xl font-bold font-mono tracking-tight">
              {account.accountNumber}
            </div>
            <div className="text-lg font-medium">{account.name}</div>
            <Badge variant="outline">
              {TYPE_LABELS[account.type] || account.type}
            </Badge>
          </div>

          {/* Right side: balance and YTD */}
          <div className="text-right space-y-2">
            <div>
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Current Balance
              </div>
              <div className="text-2xl font-bold font-mono">
                {formatCurrency(summary.currentBalance)}
              </div>
            </div>
            <div className="flex gap-6">
              <div>
                <div className="text-xs text-muted-foreground">YTD Debits</div>
                <div className="text-sm font-mono font-medium">
                  {formatCurrency(summary.ytdDebits)}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">
                  YTD Credits
                </div>
                <div className="text-sm font-mono font-medium">
                  {formatCurrency(summary.ytdCredits)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
