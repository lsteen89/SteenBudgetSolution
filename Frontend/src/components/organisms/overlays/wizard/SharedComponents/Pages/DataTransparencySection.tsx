import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/utils/cn";
import { tDict } from "@/utils/i18n/translate";
import { wizardDataTransparencyDict } from "@/utils/i18n/wizard/components/DataTransparencySection";
import { ShieldCheck } from "lucide-react";
import React from "react";
import { Link } from "react-router-dom";

type Props = {
  className?: string;
};

const DataTransparencySection: React.FC<Props> = ({ className }) => {
  const locale = useAppLocale();
  const t = <K extends keyof typeof wizardDataTransparencyDict.sv>(k: K) =>
    tDict(k, locale, wizardDataTransparencyDict);
  return (
    <div
      className={cn(
        "relative flex items-center gap-3 rounded-2xl px-4 py-3",
        "bg-wizard-surface2/80",
        "border border-wizard-stroke/12",
        "shadow-[0_6px_18px_rgba(2,6,23,0.06)]",
        "before:absolute before:inset-0 before:rounded-2xl before:pointer-events-none",
        "before:ring-1 before:ring-white/25",
      )}
    >
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-wizard-accentSoft">
          <ShieldCheck className="h-5 w-5 text-wizard-accent" />
        </span>

        <p className="text-sm leading-relaxed text-wizard-muted">
          {t("text")}{" "}
          <Link
            to="/data-policy"
            className={cn(
              "underline underline-offset-2",
              "text-wizard-text hover:text-wizard-brand transition",
            )}
          >
            {t("link")}
          </Link>
          .
        </p>
      </div>
    </div>
  );
};

export default React.memo(DataTransparencySection);
