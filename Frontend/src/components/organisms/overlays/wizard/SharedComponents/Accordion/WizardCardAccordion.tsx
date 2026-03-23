import { Card, CardContent } from "@/components/ui/card";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import React from "react";

type Props = {
  title: string;
  icon?: React.ReactNode;

  isOpen: boolean;
  onToggle: () => void;

  totalText?: string;
  totalSuffix?: string;

  /** shell = on blue overlay, inset = inside a white surface */
  variant?: "shell" | "inset";

  cardClassName?: string;
  headerClassName?: string;
  contentClassName?: string;

  children: React.ReactNode;
};

const SPRING = {
  type: "spring",
  stiffness: 380,
  damping: 30,
  mass: 0.7,
} as const;
const CONTENT_SPRING = {
  type: "spring",
  stiffness: 260,
  damping: 32,
  mass: 0.8,
} as const;

function useAccordionLabels() {
  const locale = useAppLocale();
  const dictLocale = locale.startsWith("sv")
    ? "sv"
    : locale.startsWith("et")
      ? "et"
      : "en";

  return dictLocale === "sv"
    ? { show: "Visa detaljer", hide: "Dölj detaljer" }
    : dictLocale === "et"
      ? { show: "Näita üksikasju", hide: "Peida üksikasjad" }
      : { show: "Show details", hide: "Hide details" };
}

export const WizardCardAccordion: React.FC<Props> = ({
  title,
  icon,
  isOpen,
  onToggle,
  totalText,
  totalSuffix,
  variant = "shell",
  cardClassName,
  headerClassName,
  contentClassName,
  children,
}) => {
  const labels = useAccordionLabels();
  const isInset = variant === "inset";

  return (
    <Card
      className={cn(
        // Collapsed card look (always white-on-blue layering is handled by the parent)
        "rounded-3xl bg-wizard-shell/70 border border-wizard-stroke/30 w-full " +
          "shadow-[0_10px_30px_rgba(2,6,23,0.10)] backdrop-blur-[2px]",
        cardClassName,
      )}
    >
      <motion.button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className={cn(
          "w-full text-left group cursor-pointer select-none",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-wizard-accent/40",
          // ring offset should match the plane behind the white card
          isInset
            ? "focus-visible:ring-offset-2 focus-visible:ring-offset-wizard-surface"
            : "focus-visible:ring-offset-2 focus-visible:ring-offset-wizard-shell",
        )}
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.985 }}
        transition={SPRING}
      >
        <CardContent className={cn("p-6", headerClassName)}>
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center">
            {/* Left */}
            <div className="flex items-center gap-3 justify-center lg:justify-start">
              <div className="opacity-80 group-hover:opacity-100 transition-opacity">
                {icon}
              </div>

              <div className="flex flex-col">
                <span className="font-semibold text-sm lg:text-base text-wizard-text">
                  {title}
                </span>
                <span className="text-xs text-wizard-text/60 group-hover:text-wizard-text/75 transition-colors">
                  {isOpen ? labels.hide : labels.show}
                </span>
              </div>
            </div>

            {/* Right */}
            <div className="flex items-center justify-between w-full lg:w-auto mt-2 lg:mt-0 lg:gap-3">
              <span
                className={cn(
                  "font-semibold text-wizard-accent transition-opacity duration-300",
                  !isOpen && totalText ? "opacity-100" : "opacity-0",
                )}
              >
                {totalText ? (
                  <span className="flex items-baseline gap-1">
                    <span className="text-darkLimeGreen">{totalText}</span>
                    {totalSuffix ? (
                      <span className="text-wizard-text/60 text-sm font-semibold">
                        {totalSuffix}
                      </span>
                    ) : null}
                  </span>
                ) : null}
              </span>

              {/* Chevron pill */}
              <motion.div
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={SPRING}
                className={cn(
                  "grid place-items-center h-9 w-9 rounded-full transition-all",
                  "bg-wizard-surface",
                  "border border-wizard-stroke/20",
                  "group-hover:border-wizard-stroke/30",
                )}
              >
                <ChevronDown className="w-5 h-5 text-wizard-text/60 group-hover:text-wizard-text transition-colors" />
              </motion.div>
            </div>
          </div>
        </CardContent>
      </motion.button>

      <AnimatePresence initial={false} mode="wait">
        {isOpen && (
          <motion.div
            key="wizard-card-accordion-content"
            layout
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={CONTENT_SPRING}
            className={cn("px-6 pb-6 overflow-hidden", contentClassName)}
          >
            {/* Unfolded detail area */}
            <motion.div
              layout
              initial={{ y: -6, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -6, opacity: 0 }}
              transition={CONTENT_SPRING}
              className={cn(
                "pt-4 border-t border-wizard-stroke/35",
                "relative mt-4 rounded-2xl",
                "bg-wizard-shell/55", // stronger than surface-accent/30
                "border border-wizard-stroke/35",
                "shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]",
                "p-4",
                "pl-7",
                "space-y-4",
              )}
            >
              {/* Spine: anchors details to header */}
              <div
                aria-hidden
                className={cn(
                  "absolute left-3 sm:left-3.5 top-4 bottom-4 w-px",
                  "bg-wizard-stroke/35",
                )}
              />

              {children}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
};
