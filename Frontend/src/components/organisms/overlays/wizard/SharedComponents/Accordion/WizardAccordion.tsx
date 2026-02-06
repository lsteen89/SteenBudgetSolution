import React from "react";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { ChevronDown, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
    value: string;
    title: React.ReactNode;
    icon?: React.ReactNode;

    subtitle?: React.ReactNode;
    meta?: React.ReactNode;
    children: React.ReactNode;

    actions?: React.ReactNode;

    totalText?: string;
    totalSuffix?: string;

    variant?: "shell" | "inset";
    isActive?: boolean;

    className?: string;
    triggerClassName?: string;
    contentClassName?: string;

    count?: number;

    addLabel?: string;
    onAdd?: () => void;
    addPlacement?: "inside" | "header";

    /** ✅ New: control mobile total placement */
    mobileTotal?: "hidden" | "inline" | "below";
};

export const WizardAccordion: React.FC<Props> = ({
    value,
    title,
    icon,
    children,
    subtitle,
    meta,
    actions,
    totalText,
    totalSuffix,
    variant = "shell",
    isActive,
    count,
    addLabel,
    onAdd,
    className,
    triggerClassName,
    contentClassName,
    addPlacement = "inside",
    mobileTotal = "inline",
}) => {
    const isInset = variant === "inset";
    const addText = addLabel ?? "Lägg till";

    const headerAction: React.ReactNode =
        actions ??
        (onAdd && addPlacement === "header" ? (
            <button
                type="button"
                onClick={(e) => {
                    e.preventDefault();
                    onAdd();
                }}
                className={cn(
                    "inline-flex items-center gap-2",
                    "h-10 rounded-xl px-3",
                    "bg-wizard-accent text-wizard-accent-foreground",
                    "hover:brightness-95 shadow-sm",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-wizard-accent/30"
                )}
            >
                <PlusCircle size={18} />
                {addText}
            </button>
        ) : null);

    const TotalPill = ({ size = "default" }: { size?: "default" | "compact" }) =>
        totalText ? (
            <div
                className={cn(
                    "inline-flex items-center",
                    "rounded-full bg-wizard-surface",
                    "border border-wizard-stroke/25",
                    "shadow-[0_6px_14px_rgba(2,6,23,0.06)]",
                    size === "compact" ? "px-2.5 py-1" : "px-3 py-1.5"
                )}
            >
                <span className={cn("money font-semibold text-wizard-accent", size === "compact" ? "text-sm" : "")}>
                    {totalText}
                </span>
                {totalSuffix ? (
                    <span className={cn("ml-1 font-semibold text-wizard-text/60", size === "compact" ? "text-[11px]" : "text-sm")}>
                        {totalSuffix}
                    </span>
                ) : null}
            </div>
        ) : null;

    return (
        <AccordionItem
            value={value}
            className={cn(
                "group overflow-hidden rounded-3xl transition-colors",
                "shadow-[0_10px_30px_rgba(2,6,23,0.10)] backdrop-blur-[2px]",
                isInset
                    ? "bg-wizard-surface border border-wizard-stroke/20"
                    : "bg-wizard-shell/70 border border-wizard-stroke/30",
                isActive ? "border-wizard-stroke/45" : "hover:border-wizard-stroke/40",
                className
            )}
        >
            <div className="flex items-stretch gap-2">
                {/* Trigger */}
                <div className="flex-1 min-w-0">
                    <AccordionTrigger
                        className={cn(
                            "group/trigger w-full px-6 py-5 hover:no-underline text-left",
                            "focus:outline-none focus-visible:ring-2 focus-visible:ring-wizard-stroke/40",
                            isInset
                                ? "focus-visible:ring-offset-2 focus-visible:ring-offset-wizard-surface"
                                : "focus-visible:ring-offset-2 focus-visible:ring-offset-wizard-shell",
                            triggerClassName
                        )}
                    >
                        {/* ✅ Mobile-first: two rows */}
                        <div className="w-full min-w-0">
                            {/* Row 1 */}
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="flex items-center gap-3 min-w-0">
                                    {icon ? (
                                        <div className="opacity-80 group-hover/trigger:opacity-100 transition-opacity shrink-0">
                                            {icon}
                                        </div>
                                    ) : null}

                                    <div className="min-w-0">
                                        <div className="text-sm lg:text-base font-semibold text-wizard-text truncate">
                                            {title}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1" />

                                {/* Right side: actions + chevron */}
                                <div className="flex items-center gap-2 shrink-0">
                                    {/* count chip stays small */}
                                    {typeof count === "number" ? (
                                        <span
                                            className={cn(
                                                "text-xs font-semibold text-wizard-text/65 rounded-full px-2 py-1",
                                                "border border-wizard-stroke/25",
                                                isInset ? "bg-wizard-shell/35" : "bg-wizard-surface/70"
                                            )}
                                        >
                                            {count} st
                                        </span>
                                    ) : null}

                                    {/* Desktop total pill (clean header, hide when open) */}
                                    {totalText ? (
                                        <div className="hidden sm:flex group-data-[state=open]:opacity-0 transition-opacity duration-200">
                                            <TotalPill />
                                        </div>
                                    ) : null}

                                    {/* Chevron */}
                                    <div
                                        className={cn(
                                            "grid place-items-center h-9 w-9 rounded-full transition-transform shrink-0",
                                            "bg-wizard-surface border border-wizard-stroke/20",
                                            "group-hover/trigger:border-wizard-stroke/30",
                                            "group-data-[state=open]:rotate-180"
                                        )}
                                    >
                                        <ChevronDown className="w-5 h-5 text-wizard-text/60 group-hover/trigger:text-wizard-text transition-colors" />
                                    </div>

                                    {/* Actions (trash etc.) — keep last so it doesn’t squeeze title */}

                                </div>
                            </div>

                            {/* Row 2 */}
                            <div className="mt-2 flex items-center gap-3 min-w-0">
                                <div className="min-w-0 text-xs text-wizard-text/60">
                                    {subtitle ? (
                                        subtitle
                                    ) : (
                                        <>
                                            <span className="group-data-[state=closed]:inline group-data-[state=open]:hidden">
                                                Visa detaljer
                                            </span>
                                            <span className="group-data-[state=open]:inline group-data-[state=closed]:hidden">
                                                Dölj detaljer
                                            </span>
                                        </>
                                    )}
                                    {meta ? (
                                        <div className="mt-1 text-[11px] font-medium text-wizard-text/55 truncate">
                                            {meta}
                                        </div>
                                    ) : null}
                                </div>

                                <div className="flex-1" />

                                {/* ✅ Mobile total placement (no duplication) */}
                                {totalText && mobileTotal === "inline" ? (
                                    <div className={cn("sm:hidden", "group-data-[state=open]:hidden")}>
                                        <TotalPill size="compact" />
                                    </div>
                                ) : null}
                            </div>

                            {/* ✅ Optional: mobile pill below row 2 (even calmer) */}
                            {totalText && mobileTotal === "below" ? (
                                <div className={cn("sm:hidden mt-3", "group-data-[state=open]:hidden")}>
                                    <TotalPill />
                                </div>
                            ) : null}
                        </div>
                    </AccordionTrigger>
                </div>

                {/* Actions OUTSIDE trigger => no nested button */}
                {headerAction ? (
                    <div className="shrink-0 pr-4 sm:pr-5 flex items-center">
                        <div
                            // keep clicks from toggling accordion by accident
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center"
                        >
                            {headerAction}
                        </div>
                    </div>
                ) : null}

            </div>

            <AccordionContent
                className={cn(
                    "px-6 pb-6 overflow-hidden",
                    "border-t border-wizard-stroke/25",
                    contentClassName
                )}
            >
                <div
                    className={cn(
                        "relative mt-4 rounded-2xl",
                        isInset ? "bg-wizard-shell/55" : "bg-wizard-surface-accent/35",
                        "border border-wizard-stroke/25",
                        "shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]",
                        "p-4 pl-7 space-y-4"
                    )}
                >
                    <div
                        aria-hidden
                        className="absolute left-3 sm:left-3.5 top-4 bottom-4 w-px bg-wizard-stroke/40"
                    />

                    {onAdd && addPlacement === "inside" ? (
                        <div className="flex items-center justify-between gap-3">
                            <div className="text-xs font-semibold text-wizard-text/70">Lägg till en rad</div>
                            <button
                                type="button"
                                onClick={onAdd}
                                className={cn(
                                    "inline-flex items-center gap-2",
                                    "h-10 rounded-xl px-3",
                                    "bg-wizard-accent-soft text-wizard-text",
                                    "border border-wizard-stroke/30",
                                    "shadow-[0_6px_14px_rgba(2,6,23,0.06)]",
                                    "hover:bg-wizard-accent hover:text-wizard-accent-foreground hover:border-wizard-accent/40",
                                    "active:translate-y-[1px]",
                                    "transition-colors",
                                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-wizard-accent/25"
                                )}
                            >
                                <PlusCircle size={18} />
                                {addText}
                            </button>
                        </div>
                    ) : null}

                    {onAdd && addPlacement === "inside" ? <div className="h-px bg-wizard-stroke/20" /> : null}

                    {children}
                </div>
            </AccordionContent>
        </AccordionItem>
    );
};

export const WizardAccordionRoot = Accordion;
