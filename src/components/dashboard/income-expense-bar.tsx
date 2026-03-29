"use client";

import { useRouter } from "next/navigation";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "@/lib/utils/accounting";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface IncomeExpenseBarProps {
  data: { category: string; amount: number }[];
}

export function IncomeExpenseBar({ data }: IncomeExpenseBarProps) {
  const router = useRouter();

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Income vs Expense</CardTitle>
        </CardHeader>
        <CardContent className="flex h-[250px] items-center justify-center">
          <p className="text-sm text-muted-foreground">No income/expense data</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Income vs Expense</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data}>
            <XAxis dataKey="category" tick={{ fontSize: 12 }} />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={(v) => formatCurrency(Number(v))}
            />
            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
            <Bar
              dataKey="amount"
              fill="#0D7377"
              radius={[4, 4, 0, 0]}
              onClick={() => router.push("/reports")}
              style={{ cursor: "pointer" }}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
