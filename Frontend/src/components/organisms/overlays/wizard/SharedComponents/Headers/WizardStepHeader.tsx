import React from "react";
import { motion } from "framer-motion";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { renderEmphasis } from "@/utils/ui/renderEmphasis";
import { WizardStepPill } from "@/components/organisms/overlays/wizard/SharedComponents/Headers/WizardStepPill";
import { ChevronDown } from "lucide-react";

type Props = {
    title: string;
    subtitle?: string;

    guardrailTitle?: string;
    guardrails?: Array<{
        emphasis: string;
        detail?: string;
        to?: string;
    }>;

    helpTitle?: string;
    helpItems?: string[];

    stepPill?: { stepNumber?: number; majorLabel: string; subLabel?: string };
    decoration?: React.ReactNode;

    /** Use sparingly: progress/success vibes only */
    withGlow?: boolean;
};

export const WizardStepHeader: React.FC<Props> = ({
    title,
    subtitle,
    guardrailTitle = "Obs",
    guardrails,
    helpTitle,
    helpItems,
    stepPill,
    decoration,
    withGlow = false,
}) => {
    return (
        <header className="relative mb-10">
            {/* decoration */}
            {decoration ? (
                <div className="pointer-events-none absolute right-3 top-2">
                    {decoration}
                </div>
            ) : null}

            {/* subtle glow (accent only) */}
            {withGlow ? (
                <motion.div
                    aria-hidden
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 0.12, y: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="
            pointer-events-none absolute left-1/2 top-1
            h-16 w-56 -translate-x-1/2
            rounded-full bg-wizard-accent blur-2xl shadow-lg shadow-wizard-accent/40
          "
                />
            ) : null}

            {/* Title block */}
            <div className="mx-auto max-w-xl text-center">
                {stepPill ? (
                    <div className="mb-3 flex justify-center">
                        <WizardStepPill
                            stepNumber={stepPill.stepNumber}
                            majorLabel={stepPill.majorLabel}
                            subLabel={stepPill.subLabel}
                        />
                    </div>
                ) : null}

                <h3 className="pt-3 text-3xl font-extrabold tracking-tight text-wizard-text md:text-4xl">
                    {title}
                </h3>

                {subtitle ? (
                    <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-wizard-text/70">
                        {subtitle}
                    </p>
                ) : null}
            </div>

            {/* Stack below title block */}
            <div className="mt-7 space-y-4">
                {/* Guardrails */}
                {guardrails?.length ? (
                    <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mx-auto max-w-xl"
                    >
                        <div
                            className="
                rounded-2xl bg-wizard-shell/50  
                border border-wizard-stroke/20
                px-5 py-4
                shadow-lg shadow-black/10
              "
                        >
                            <p className="text-center text-sm font-semibold text-wizard-text">
                                {guardrailTitle}
                            </p>

                            <div className="mt-3 grid gap-2">
                                {guardrails.map((g, idx) => (
                                    <div
                                        key={idx}
                                        className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-wizard-text/75"
                                    >
                                        <span className="h-2 w-2 rounded-full bg-wizard-text/25" />
                                        <span className="font-semibold text-wizard-text">
                                            {g.emphasis}
                                        </span>

                                        {g.to ? (
                                            <>
                                                <span className="text-wizard-text/35">→</span>
                                                <span className="font-semibold text-wizard-text">
                                                    {g.to}
                                                </span>
                                            </>
                                        ) : null}

                                        {g.detail ? (
                                            <span className="text-wizard-text/55">{g.detail}</span>
                                        ) : null}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                ) : null}

                {/* Help accordion */}
                {helpTitle && helpItems?.length ? (
                    <Accordion type="single" collapsible className="mx-auto max-w-xl">
                        <AccordionItem
                            value="help"
                            className="
                group overflow-hidden rounded-2xl
                border border-wizard-stroke/20
                bg-wizard-shell/50
                shadow-lg shadow-black/10
              "
                        >
                            <AccordionTrigger
                                className="
    group flex w-full items-center justify-between
    px-4 py-3 text-sm font-semibold text-wizard-text
    hover:no-underline
    focus:outline-none focus-visible:ring-2 focus-visible:ring-wizard-stroke/40
  "
                            >
                                <span>{helpTitle}</span>

                                <span
                                    className="
      grid h-9 w-9 place-items-center rounded-full
      border border-wizard-stroke/20 bg-wizard-surface
      shadow-sm shadow-black/5
      transition-transform duration-200
      group-data-[state=open]:rotate-180
    "
                                >
                                    <ChevronDown className="h-5 w-5 text-wizard-text/60" />
                                </span>
                            </AccordionTrigger>

                            <div className="h-px bg-wizard-stroke/20 group-data-[state=closed]:hidden" />

                            <AccordionContent className="px-4 pb-4 pt-3">
                                <div className="space-y-2 text-sm text-wizard-text/70">
                                    {helpItems.map((text, idx) => (
                                        <div key={idx} className="flex items-start gap-2">
                                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-wizard-text/35" />
                                            <p>{renderEmphasis(text)}</p>
                                        </div>
                                    ))}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                ) : null}
            </div>
        </header>
    );
};
