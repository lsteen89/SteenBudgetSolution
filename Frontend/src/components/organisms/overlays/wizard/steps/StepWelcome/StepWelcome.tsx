import { useAuth } from "@/hooks/auth/useAuth";
import {
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Landmark,
  PiggyBank,
  Receipt,
  Wallet,
} from "lucide-react";
import React from "react";

import logo from "@/assets/Images/eBudgetLogo.png";
import { WizardMascot } from "@/components/atoms/animation/WizardMascot";
import { BudgetGuideSkeleton } from "@/components/atoms/loading/BudgetGuideSkeleton";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import { CURRENCIES, type CurrencyCode } from "@/types/i18n/currency";
import { tDict } from "@/utils/i18n/translate";
import {
  wizardWelcomeDict,
  wizardWelcomeSteps,
} from "@/utils/i18n/wizard/stepWelcome/StepWelcome.i18n";
import GlassPane from "@components/layout/GlassPane";

interface StepWelcomeProps {
  loading: boolean;
  currency: CurrencyCode;
  isPersistingPreferences: boolean;
  onCurrencyChange: (value: CurrencyCode) => void;
}

const steps = [
  { key: "income", Icon: Wallet },
  { key: "expenses", Icon: Receipt },
  { key: "savings", Icon: PiggyBank },
  { key: "debts", Icon: Landmark },
  { key: "confirm", Icon: CheckCircle },
] as const;

type CurrencyOption = { value: CurrencyCode; label: string };

const currencyOptions: CurrencyOption[] = CURRENCIES.map((c) => ({
  value: c,
  label:
    c === "EUR"
      ? "Euro (EUR)"
      : c === "SEK"
        ? "Swedish krona (SEK)"
        : "US dollar (USD)",
}));

const StepWelcome: React.FC<StepWelcomeProps> = ({
  loading,
  currency,
  isPersistingPreferences,
  onCurrencyChange,
}) => {
  const { user } = useAuth();
  const [showAllSteps, setShowAllSteps] = React.useState(false);
  const locale = useAppLocale();
  const t = <K extends keyof typeof wizardWelcomeDict.sv>(k: K) =>
    tDict(k, locale, wizardWelcomeDict);
  const dictLocale = locale.startsWith("sv")
    ? "sv"
    : locale.startsWith("et")
      ? "et"
      : "en";
  const visibleSteps = showAllSteps ? steps : steps.slice(0, 2);

  if (loading) {
    return (
      <GlassPane>
        <div className="min-h-48 flex items-center justify-center">
          <BudgetGuideSkeleton />
        </div>
      </GlassPane>
    );
  }

  return (
    <div className="relative">
      <img
        src={logo}
        alt=""
        aria-hidden="true"
        className="pointer-events-none select-none absolute left-1/2 top-32 -translate-x-1/2 w-[780px] max-w-[115%] opacity-[0.07] blur-[0.8px]"
      />

      <section className="mx-auto w-full max-w-xl px-4 sm:px-6 pt-1 pb-5 md:pt-4 md:pb-safe md:py-8">
        <div className="space-y-4 md:space-y-6">
          <div className="text-center space-y-3">
            <div className="flex justify-center">
              <WizardMascot
                src={logo}
                size={64}
                showText={false}
                className="md:hidden"
                hello
                float
              />
              <WizardMascot
                src={logo}
                size={92}
                showText
                className="hidden md:flex"
                hello
                float
              />
            </div>

            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-wizard-text">
              {t("title")}
            </h2>

            <p className="mx-auto max-w-md text-sm leading-relaxed text-wizard-muted">
              {user?.firstName
                ? t("welcomeWithName").replace("{name}", user.firstName)
                : t("welcomeGeneric")}
            </p>

            <p className="text-sm text-wizard-muted">
              <span className="font-semibold text-wizard-text">
                {t("time")}
              </span>{" "}
              • {t("pause")} • {t("autosave")}
            </p>
          </div>

          <div
            className={cn(
              "rounded-2xl p-4 md:p-5",
              "bg-wizard-surface border border-wizard-stroke/25",
              "shadow-[0_1px_6px_rgba(21,39,81,0.04)]",
            )}
          >
            <div className="space-y-2">
              <label
                htmlFor="budget-currency"
                className="block text-sm font-semibold text-wizard-text"
              >
                {t("currencyLabel")}
              </label>
              <p className="text-sm leading-relaxed text-wizard-muted">
                {t("currencyDesc")}
              </p>
              <select
                id="budget-currency"
                value={currency}
                disabled={isPersistingPreferences}
                onChange={(e) =>
                  onCurrencyChange(e.target.value as CurrencyCode)
                }
                className={cn(
                  "mt-2 w-full rounded-2xl px-4 py-3",
                  "bg-white/90 border border-wizard-stroke/40",
                  "text-sm font-medium text-wizard-text",
                  "shadow-[0_8px_30px_rgba(21,39,81,0.06)]",
                  "outline-none transition",
                  "focus:border-wizard-accent focus:ring-4 focus:ring-wizard-accent/10",
                  "disabled:cursor-not-allowed disabled:opacity-60",
                )}
              >
                {currencyOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>{" "}
              {isPersistingPreferences ? (
                <p className="text-xs text-wizard-muted">{t("saving")}</p>
              ) : null}
            </div>
          </div>

          <div className="mx-auto max-w-xl">
            <p className="text-center text-sm font-semibold text-wizard-text">
              {t("whatHappens")}
            </p>

            <ul className="mt-4 grid gap-2.5">
              {visibleSteps.map(({ key, Icon }) => {
                const step = wizardWelcomeSteps[dictLocale][key];

                return (
                  <li
                    key={key}
                    className={cn(
                      "relative flex items-center gap-3 rounded-2xl px-4 py-3",
                      "bg-wizard-surface border border-wizard-stroke/25",
                      "shadow-[0_1px_6px_rgba(21,39,81,0.04)]",
                      "transition",
                      "hover:border-wizard-stroke/40 hover:shadow-[0_4px_12px_rgba(21,39,81,0.06)]",
                    )}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-wizard-accentSoft text-wizard-accent">
                      <Icon className="h-4.5 w-4.5 stroke-[2.25px]" />
                    </div>

                    <div className="flex min-w-0 flex-col">
                      <span className="text-sm font-extrabold tracking-tight text-wizard-text">
                        {step.title}
                      </span>
                      <span className="text-sm leading-snug text-wizard-text/70">
                        {step.desc}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>

            {steps.length > 2 ? (
              <button
                type="button"
                onClick={() => setShowAllSteps((v) => !v)}
                aria-expanded={showAllSteps}
                className={cn(
                  "mx-auto mt-3 inline-flex items-center gap-1.5 rounded-xl px-2 py-1",
                  "text-sm font-semibold text-wizard-accent",
                  "transition hover:bg-wizard-accentSoft/60 hover:underline underline-offset-4",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-wizard-accent/20",
                )}
              >
                <span>
                  {showAllSteps
                    ? t("showLess")
                    : t("showAll").replace("{count}", String(steps.length))}
                </span>
                {showAllSteps ? (
                  <ChevronUp className="h-4 w-4 shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 shrink-0" />
                )}
              </button>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
};

export default StepWelcome;
