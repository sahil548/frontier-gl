"use client";

import { formatCurrency } from "@/lib/utils/accounting";
import {
  TableRow,
  TableCell,
} from "@/components/ui/table";
import type { EliminationRow } from "@/types/consolidated";

interface EliminationRowsProps {
  eliminations: EliminationRow[];
  colSpan?: number;
}

export function EliminationRows({ eliminations, colSpan = 4 }: EliminationRowsProps) {
  if (eliminations.length === 0) return null;

  return (
    <>
      {/* Section header */}
      <TableRow className="bg-amber-50 dark:bg-amber-950/20 hover:bg-amber-50 dark:hover:bg-amber-950/20">
        <TableCell colSpan={colSpan} className="py-2 font-semibold text-sm">
          Intercompany Eliminations
        </TableCell>
      </TableRow>

      {/* Elimination rows */}
      {eliminations.map((elim) => (
        <tbody key={elim.ruleId}>
          <TableRow>
            <TableCell />
            <TableCell className="pl-6 text-sm">{elim.label}</TableCell>
            {colSpan === 4 && <TableCell />}
            <TableCell className="text-right font-mono text-sm text-red-600 dark:text-red-400">
              ({formatCurrency(Math.abs(elim.amount))})
            </TableCell>
          </TableRow>
          {elim.mismatchAmount != null && Math.abs(elim.mismatchAmount) > 0.005 && (
            <TableRow>
              <TableCell />
              <TableCell
                colSpan={colSpan - 1}
                className="pl-10 text-sm text-amber-600 dark:text-amber-400"
              >
                Intercompany difference: {formatCurrency(Math.abs(elim.mismatchAmount))}
              </TableCell>
            </TableRow>
          )}
        </tbody>
      ))}
    </>
  );
}
