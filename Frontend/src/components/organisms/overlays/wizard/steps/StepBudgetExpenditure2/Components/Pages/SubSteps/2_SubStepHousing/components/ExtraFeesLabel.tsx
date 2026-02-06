import React from "react";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export const ExtraFeesLabel = () => (
    <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-wizard-text/80">
            Extra avgifter (frivilligt)
        </span>

        <Tooltip delayDuration={150}>
            <TooltipTrigger asChild>
                <button
                    type="button"
                    className={cn(
                        "inline-flex items-center justify-center rounded-full p-1",
                        "text-wizard-text/55 hover:text-wizard-text/80",
                        "hover:bg-wizard-surface", // stays in-system
                        "transition",
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-wizard-stroke/45"
                    )}
                    aria-label="Info om extra avgifter"
                >
                    <Info className="h-4 w-4" />
                </button>
            </TooltipTrigger>

            <TooltipContent className="max-w-[280px] text-sm">
                <p className="font-semibold text-wizard-text">Vad menas här?</p>
                <p className="mt-1 text-wizard-text/75">
                    Endast obligatoriska boendeavgifter kopplade till hyra/avgift. Inte internet,
                    abonnemang eller parkering som betalas separat.
                </p>
            </TooltipContent>
        </Tooltip>
    </div>
);
