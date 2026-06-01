// Map the backend `DebtTypes` constants (`revolving`, `installment`, `bank_loan`,
// `private`) onto the three buckets the design uses for the payment/balance
// type-split meter (Lån / Kreditkort / Avbetalning). `private` and `bank_loan`
// both fall into the generic "loan" bucket — the design only renders three
// segments and the planning brief does not call for a fourth.
//
// Unknown / blank types fall back to "loan" rather than dropping the row, so
// the meter cannot silently lose totals if a future migration introduces a
// new type the FE has not been updated for yet.

import type { DebtEditorRowDto } from "@/types/budget/DebtEditorDto";

export type DebtTypeBucket = "loan" | "credit" | "installment";

export const DEBT_TYPE_BUCKET_ORDER: readonly DebtTypeBucket[] = [
  "loan",
  "credit",
  "installment",
] as const;

export function bucketDebtType(type: string | null | undefined): DebtTypeBucket {
  const normalized = (type ?? "").toLowerCase().trim();
  switch (normalized) {
    case "revolving":
      return "credit";
    case "installment":
      return "installment";
    case "bank_loan":
    case "private":
    default:
      return "loan";
  }
}

export type DebtTypeSplit = Record<DebtTypeBucket, number>;

const emptySplit = (): DebtTypeSplit => ({ loan: 0, credit: 0, installment: 0 });

/**
 * Sum a numeric row field, grouped by mapped debt-type bucket. The selector
 * controls whether the meter shows monthly-payment totals or balance totals.
 *
 * Counts only the rows the caller passes in — the page chooses which group
 * to feed (typically the `active` group's planned payments, or the union of
 * active+skipped balances for the snapshot card).
 */
export function splitDebtRowsBy<TRow extends Pick<DebtEditorRowDto, "type">>(
  rows: readonly TRow[],
  selector: (row: TRow) => number,
): DebtTypeSplit {
  const result = emptySplit();
  for (const row of rows) {
    result[bucketDebtType(row.type)] += selector(row);
  }
  return result;
}

/** Total of all buckets — handy when the meter needs to compute percentages. */
export function debtTypeSplitTotal(split: DebtTypeSplit): number {
  return split.loan + split.credit + split.installment;
}
