"use client";

import { useRouter } from "next/navigation";
import {
  PieChart,
  Pie,
  Cell,
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

const TEAL_PALETTE = [
  "#0D7377",
  "#0A5C5F",
  "#10908F",
  "#14ADAB",
  "#18C9C4",
  "#1CE5DE",
];

interface AssetPieChartProps {
  data: { name: string; value: number }[];
  entityId: string;
}

export function AssetPieChart({ data, entityId }: AssetPieChartProps) {
  const router = useRouter();
  // suppress unused var lint — entityId reserved for future entity-scoped drill-down
  void entityId;

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Asset Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="flex h-[250px] items-center justify-center">
          <p className="text-sm text-muted-foreground">No asset data</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Asset Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={90}
              onClick={(entry) => {
                if (entry.name) {
                  router.push(`/gl-ledger?accountName=${encodeURIComponent(String(entry.name))}`);
                }
              }}
              style={{ cursor: "pointer" }}
            >
              {data.map((_, idx) => (
                <Cell
                  key={`cell-${idx}`}
                  fill={TEAL_PALETTE[idx % TEAL_PALETTE.length]}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => formatCurrency(Number(value))}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
