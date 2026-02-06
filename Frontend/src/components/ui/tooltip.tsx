import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";

const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
    React.ElementRef<typeof TooltipPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 8, ...props }, ref) => (
    <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
            ref={ref}
            sideOffset={sideOffset}
            className={cn(
                // must be above wizard z-[9999]
                "z-[100000] pointer-events-auto",
                "overflow-hidden rounded-2xl border",
                "bg-wizard-surface/95 border-wizard-stroke/25",
                "px-4 py-3",
                "text-sm text-wizard-text/85",
                "shadow-xl shadow-black/15",
                "animate-in fade-in zoom-in-95",
                // nice keyboard focus outline when tooltip itself gets focus (rare but harmless)
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-wizard-stroke/45",
                className
            )}
            {...props}
        />
    </TooltipPrimitive.Portal>
));

TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
