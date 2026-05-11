import { CtaButton } from "@/components/atoms/buttons/CtaButton";
import EditorPeriodBadge from "@/components/molecules/forms/budgetEditor/EditorPeriodBadge";
import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { expensesEditorWorkspaceBarDict } from "@/utils/i18n/pages/private/expenses/ExpensesEditorWorkspaceBar.i18n";
import { tDict } from "@/utils/i18n/translate";
import { formatMoneyV2 } from "@/utils/money/moneyV2";

type ExpensesEditorWorkspaceBarProps = {
  yearMonthLabel: string;
  incomeTotal: number;
  expenseTotal: number;
  remainingTotal: number;
  onCreate: () => void;
  readOnly: boolean;
};

const interpolate = (
  template: string,
  values: Record<string, string | number>,
) => {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));
};

export default function ExpensesEditorWorkspaceBar({
  yearMonthLabel,
  incomeTotal,
  expenseTotal,
  remainingTotal,
  onCreate,
  readOnly,
}: ExpensesEditorWorkspaceBarProps) {
  const locale = useAppLocale();
  const currency = useAppCurrency();
  const remainingIsNegative = remainingTotal < 0;
  const t = <K extends keyof typeof expensesEditorWorkspaceBarDict.sv>(
    key: K,
  ) => tDict(key, locale, expensesEditorWorkspaceBarDict);

  return (
    <section
      className={[
        "sticky top-[72px] z-30 overflow-hidden rounded-[2rem]",
        "border border-eb-stroke/20",
        "bg-[rgb(var(--eb-shell)/0.94)] supports-[backdrop-filter]:bg-[rgb(var(--eb-shell)/0.82)]",
        "shadow-[0_12px_30px_rgba(21,39,81,0.06)] backdrop-blur",
      ].join(" ")}
    >
      <div className="relative mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-6">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-16 left-[8%] h-36 w-36 rounded-full bg-[rgb(var(--eb-shell)/0.36)] blur-2xl" />
          <div className="absolute -top-20 right-[12%] h-44 w-44 rounded-full bg-[rgb(var(--eb-accent)/0.08)] blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 max-w-[720px]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-eb-text/45">
                {t("eyebrow")}
              </p>

              <h1 className="mt-1 text-2xl font-black tracking-tight text-eb-text">
                {interpolate(t("title"), { yearMonthLabel })}
              </h1>

              <p className="mt-1 text-sm text-eb-text/60">
                {interpolate(t("description"), { yearMonthLabel })}
              </p>

              {readOnly ? (
                <div className="mt-3 inline-flex h-9 items-center rounded-full border border-eb-stroke/25 bg-eb-surface px-3 text-sm font-medium text-eb-text/60">
                  {t("readOnlyBadge")}
                </div>
              ) : null}
            </div>

            <div className="relative z-10 flex shrink-0">
              <CtaButton
                type="button"
                onClick={onCreate}
                disabled={readOnly}
                className="w-full sm:w-auto"
              >
                {t("create")}
              </CtaButton>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <EditorPeriodBadge label={t("period")} value={yearMonthLabel} />

            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-eb-surface/72 px-3 py-2 text-sm sm:text-base">
              <span className="font-semibold text-eb-text/75">
                {t("income")}
              </span>
              <span className="font-black tabular-nums text-eb-text">
                {formatMoneyV2(incomeTotal, currency, locale, {
                  fractionDigits: 2,
                })}
              </span>

              <span className="text-eb-text/35">−</span>

              <span className="font-semibold text-eb-text/75">
                {t("expenses")}
              </span>
              <span className="font-black tabular-nums text-eb-text">
                {formatMoneyV2(expenseTotal, currency, locale, {
                  fractionDigits: 2,
                })}
              </span>

              <span className="text-eb-text/35">=</span>

              <span className="font-semibold text-eb-text/75">
                {t("remaining")}
              </span>
              <span
                className={
                  remainingIsNegative
                    ? "font-black tabular-nums text-eb-danger"
                    : "font-black tabular-nums text-eb-accent"
                }
              >
                {formatMoneyV2(remainingTotal, currency, locale, {
                  fractionDigits: 2,
                })}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
