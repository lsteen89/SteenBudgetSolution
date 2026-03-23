import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Info } from "lucide-react";

import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { tDict } from "@/utils/i18n/translate";
import { homeTypeOptionDict } from "@/utils/i18n/wizard/stepExpenditure/HomeTypeOption.i18n";

export const ExtraFeesLabel = () => {
  const locale = useAppLocale();
  const t = <K extends keyof typeof homeTypeOptionDict.sv>(k: K) =>
    tDict(k, locale, homeTypeOptionDict);

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-semibold text-wizard-text/80">
        {t("extraFeesLabel")}
      </span>

      <Tooltip delayDuration={150}>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex items-center justify-center rounded-full p-1",
              "text-wizard-text/55 hover:text-wizard-text/80",
              "hover:bg-wizard-surface",
              "transition",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-wizard-stroke/45",
            )}
            aria-label={t("tooltipAria")}
          >
            <Info className="h-4 w-4" />
          </button>
        </TooltipTrigger>

        <TooltipContent className="max-w-[280px] text-sm">
          <p className="font-semibold text-wizard-text">{t("tooltipTitle")}</p>
          <p className="mt-1 text-wizard-text/75">{t("tooltipBody")}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
};
