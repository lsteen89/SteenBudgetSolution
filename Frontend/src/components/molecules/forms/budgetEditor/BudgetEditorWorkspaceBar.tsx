import { CtaButton } from "@/components/atoms/buttons/CtaButton";
import EditorPeriodBadge from "@/components/molecules/forms/budgetEditor/EditorPeriodBadge";
import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import { formatMoneyV2 } from "@/utils/money/moneyV2";

type BudgetEditorWorkspaceMetric = {
  label: string;
  amount: number;
  tone?: "default" | "accent" | "danger";
  prefix?: string;
};

type BudgetEditorWorkspaceBarProps = {
  eyebrow: string;
  title: string;
  description: string;
  readOnlyBadge: string;
  createLabel?: string;
  periodLabel: string;
  periodCaption: string;
  metrics: BudgetEditorWorkspaceMetric[];
  onCreate?: () => void;
  readOnly: boolean;
};

export default function BudgetEditorWorkspaceBar({
  eyebrow,
  title,
  description,
  readOnlyBadge,
  createLabel,
  periodLabel,
  periodCaption,
  metrics,
  onCreate,
  readOnly,
}: BudgetEditorWorkspaceBarProps) {
  const locale = useAppLocale();
  const currency = useAppCurrency();

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
                {eyebrow}
              </p>

              <h1 className="mt-1 text-2xl font-black tracking-tight text-eb-text">
                {title}
              </h1>

              <p className="mt-1 text-sm text-eb-text/60">{description}</p>

              {readOnly ? (
                <div className="mt-3 inline-flex h-9 items-center rounded-full border border-eb-stroke/25 bg-eb-surface px-3 text-sm font-medium text-eb-text/60">
                  {readOnlyBadge}
                </div>
              ) : null}
            </div>

            {createLabel && onCreate ? (
              <div className="relative z-10 flex shrink-0">
                <CtaButton
                  type="button"
                  onClick={onCreate}
                  disabled={readOnly}
                  className="w-full sm:w-auto"
                >
                  {createLabel}
                </CtaButton>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-3">
            <EditorPeriodBadge label={periodCaption} value={periodLabel} />

            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-eb-surface/72 px-3 py-2 text-sm sm:text-base">
              {metrics.map((metric, index) => (
                <div
                  key={`${metric.label}-${index}`}
                  className="contents"
                >
                  {metric.prefix ? (
                    <span className="text-eb-text/35">{metric.prefix}</span>
                  ) : null}
                  <span className="font-semibold text-eb-text/75">
                    {metric.label}
                  </span>
                  <span
                    className={cn(
                      "font-black tabular-nums",
                      metric.tone === "danger"
                        ? "text-eb-danger"
                        : metric.tone === "accent"
                          ? "text-eb-accent"
                          : "text-eb-text",
                    )}
                  >
                    {formatMoneyV2(metric.amount, currency, locale, {
                      fractionDigits: 2,
                    })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
