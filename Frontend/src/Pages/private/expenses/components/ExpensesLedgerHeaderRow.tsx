import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { expensesLedgerHeaderRowDict } from "@/utils/i18n/pages/private/expenses/ExpensesLedgerHeaderRow.i18n";
import { tDict } from "@/utils/i18n/translate";
import { expenseLedgerDesktopGridClass } from "./expenseLedger.layout";

export default function ExpensesLedgerHeaderRow() {
  const locale = useAppLocale();
  const t = <K extends keyof typeof expensesLedgerHeaderRowDict.sv>(key: K) =>
    tDict(key, locale, expensesLedgerHeaderRowDict);

  return (
    <div
      className={[
        "hidden sm:grid",
        expenseLedgerDesktopGridClass,
        "px-6 py-3 text-sm text-eb-text/60",
      ].join(" ")}
    >
      <div>{t("name")}</div>
      <div>{t("category")}</div>
      <div className="text-right">{t("amount")}</div>
      <div aria-hidden="true" />
    </div>
  );
}
