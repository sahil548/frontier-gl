/**
 * Fiscal year utilities.
 *
 * Computes month sequences and date ranges based on an entity's
 * fiscal year end (stored as "MM-DD" format).
 */

const MONTH_LABELS = [
  "", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

export interface FiscalYearMonth {
  year: number;
  month: number;
  label: string;
}

/**
 * Returns the 12 calendar months that belong to a fiscal year.
 *
 * For FYE "12-31", fiscal year 2025 = Jan 2025 - Dec 2025.
 * For FYE "03-31", fiscal year 2025 = Apr 2024 - Mar 2025.
 *
 * The first month of the fiscal year is (fyeMonth + 1). If fyeMonth is 12,
 * the first month is January of the same calendar year. Otherwise, the first
 * month starts in the prior calendar year.
 */
export function getFiscalYearMonths(
  fiscalYearEnd: string,
  fiscalYear: number
): FiscalYearMonth[] {
  const fyeMonth = parseInt(fiscalYearEnd.split("-")[0], 10);

  const months: FiscalYearMonth[] = [];

  for (let i = 0; i < 12; i++) {
    // First month of fiscal year is fyeMonth + 1
    const month = ((fyeMonth + i) % 12) + 1;

    // Determine the calendar year for this month
    let year: number;
    if (fyeMonth === 12) {
      // Standard calendar year -- all months in the same year
      year = fiscalYear;
    } else {
      // Non-standard FYE: months after FYE are in prior calendar year
      // until we wrap into the FYE calendar year
      if (month > fyeMonth) {
        year = fiscalYear - 1;
      } else {
        year = fiscalYear;
      }
    }

    months.push({
      year,
      month,
      label: MONTH_LABELS[month],
    });
  }

  return months;
}

/**
 * Returns the start and end dates for a fiscal year.
 *
 * For FYE "12-31", fiscal year 2025 = 2025-01-01 to 2025-12-31.
 * For FYE "03-31", fiscal year 2025 = 2024-04-01 to 2025-03-31.
 */
export function getFiscalYearDateRange(
  fiscalYearEnd: string,
  fiscalYear: number
): { startDate: Date; endDate: Date } {
  const months = getFiscalYearMonths(fiscalYearEnd, fiscalYear);
  const first = months[0];
  const last = months[months.length - 1];

  const startDate = new Date(first.year, first.month - 1, 1);

  // End date is the last day of the last month
  // Month is 0-indexed in JS Date, so last.month gives us the next month's index
  const endDate = new Date(last.year, last.month, 0); // day 0 = last day of previous month

  return { startDate, endDate };
}
