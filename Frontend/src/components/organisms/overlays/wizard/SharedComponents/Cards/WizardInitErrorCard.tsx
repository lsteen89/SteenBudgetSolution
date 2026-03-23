import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import { appRoutes } from "@/routes/appRoutes";
import { tDict } from "@/utils/i18n/translate";
import { wizardInitErrorDict } from "@/utils/i18n/wizard/stepWelcome/wizardInitErrorDict";
import { XCircle } from "lucide-react";
import { Link } from "react-router-dom";

type WizardInitErrorCardProps = {
  failedAttempts: number;
  onRetry: () => void;
};

export function WizardInitErrorCard({
  failedAttempts,
  onRetry,
}: WizardInitErrorCardProps) {
  const retriesLocked = failedAttempts > 3;
  const locale = useAppLocale();
  const t = <K extends keyof typeof wizardInitErrorDict.sv>(k: K) =>
    tDict(k, locale, wizardInitErrorDict);
  return (
    <div className="mx-auto w-full max-w-xl px-4 py-6">
      <div
        className={cn(
          "rounded-2xl p-4 md:p-5",
          "bg-wizard-surface2 border border-wizard-stroke",
          "shadow-[0_10px_30px_rgba(0,0,0,0.08)]",
        )}
      >
        <div className="flex items-start gap-3">
          <XCircle className="mt-0.5 h-5 w-5 text-rose-500" />

          <div className="space-y-2">
            <p className="font-semibold text-wizard-text">{t("title")}</p>

            <p className="text-sm leading-relaxed text-wizard-muted">
              {t("body")}
            </p>

            <p className="text-sm text-wizard-muted">
              <a
                href="mailto:support@ebudget.se"
                className="underline underline-offset-2"
              >
                {t("contactA")}
              </a>{" "}
              eller{" "}
              <Link
                to={appRoutes.dashboardSupport}
                className="underline underline-offset-2"
              >
                {t("contactB")}
              </Link>
              .
            </p>

            {retriesLocked && (
              <p className="text-sm font-semibold text-rose-600">
                {t("retry")}
              </p>
            )}

            <button
              type="button"
              onClick={onRetry}
              disabled={retriesLocked}
              className={cn(
                "relative flex items-center gap-4 rounded-2xl h-11 px-5",
                "bg-wizard-surface border border-wizard-stroke/25",
                "shadow-[0_1px_6px_rgba(21,39,81,0.04)]",
                "transition",
                "hover:border-wizard-stroke/40 hover:shadow-[0_4px_12px_rgba(21,39,81,0.06)]",
                "disabled:cursor-not-allowed disabled:opacity-60",
              )}
            >
              Försök igen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
