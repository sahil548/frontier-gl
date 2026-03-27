import Papa from "papaparse";

/**
 * Generates and triggers a CSV file download.
 *
 * The caller is responsible for assembling the data rows (including
 * beginning balance, transactions, and footer/totals rows).
 *
 * - Uses PapaParse for CSV generation
 * - Prepends UTF-8 BOM for Excel compatibility
 * - Triggers browser download via temporary anchor element
 */
export function exportToCsv(
  data: Record<string, unknown>[],
  filename: string
): void {
  const csv = Papa.unparse(data, {
    header: true,
    quotes: true,
  });

  // UTF-8 BOM for Excel compatibility
  const bom = "\ufeff";
  const blob = new Blob([bom + csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  link.style.display = "none";

  document.body.appendChild(link);
  link.click();

  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
