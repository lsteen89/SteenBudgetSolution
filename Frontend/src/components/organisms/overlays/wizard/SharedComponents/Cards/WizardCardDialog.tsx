import React from "react";
import { motion } from "framer-motion";
import { ChevronDown, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogClose,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

type Props = {
    title: string;
    icon?: React.ReactNode;

    isOpen: boolean;
    onToggle: () => void;

    totalText?: string;
    totalSuffix?: string;

    variant?: "shell" | "inset";

    cardClassName?: string;
    headerClassName?: string;
    contentClassName?: string;

    children: React.ReactNode;
};

const SPRING = { type: "spring", stiffness: 380, damping: 30, mass: 0.7 } as const;

export const WizardCardDialog: React.FC<Props> = ({
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
    const isInset = variant === "inset";

    return (
        <>
            {/* Collapsed card (no layout shift ever) */}
            <Card
                className={cn(
                    "rounded-3xl bg-wizard-shell/70 border border-wizard-stroke/30 " +
                    "shadow-[0_10px_30px_rgba(2,6,23,0.10)] backdrop-blur-[2px]",
                    cardClassName
                )}
            >
                <motion.button
                    type="button"
                    onClick={onToggle}
                    aria-expanded={isOpen}
                    className={cn(
                        "w-full text-left group cursor-pointer select-none",
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-wizard-accent/40",
                        isInset
                            ? "focus-visible:ring-offset-2 focus-visible:ring-offset-wizard-surface"
                            : "focus-visible:ring-offset-2 focus-visible:ring-offset-wizard-shell"
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
                                        {isOpen ? "Dölj detaljer" : "Visa detaljer"}
                                    </span>
                                </div>
                            </div>

                            {/* Right */}
                            <div className="flex items-center justify-between w-full lg:w-auto mt-2 lg:mt-0 lg:gap-3">
                                <span
                                    className={cn(
                                        "font-semibold text-wizard-accent transition-opacity duration-300",
                                        !isOpen && totalText ? "opacity-100" : "opacity-0"
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
                                        "group-hover:border-wizard-stroke/30"
                                    )}
                                >
                                    <ChevronDown className="w-5 h-5 text-wizard-text/60 group-hover:text-wizard-text transition-colors" />
                                </motion.div>
                            </div>
                        </div>
                    </CardContent>
                </motion.button>
            </Card>

            {/* Dialog editor (scrolls inside, no page expansion) */}
            <Dialog open={isOpen} onOpenChange={() => onToggle()}>
                <DialogContent
                    className={cn(
                        "max-w-3xl p-0 overflow-hidden",
                        // keep your “glass” vibe
                        "bg-wizard-shell/80 border border-wizard-stroke/30 backdrop-blur-md",
                        contentClassName
                    )}
                >
                    <DialogHeader className="px-6 py-4 border-b border-wizard-stroke/25">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="opacity-90">{icon}</div>
                                <div className="min-w-0">
                                    <DialogTitle className="text-base text-wizard-text truncate">
                                        {title}
                                    </DialogTitle>
                                    <div className="text-xs text-wizard-text/60 truncate">
                                        Redigera detaljer
                                    </div>
                                </div>
                            </div>

                            <DialogClose asChild>
                                <button
                                    type="button"
                                    className={cn(
                                        "h-9 w-9 rounded-full grid place-items-center shrink-0",
                                        "bg-wizard-surface border border-wizard-stroke/20",
                                        "text-wizard-text/60 hover:text-wizard-text hover:border-wizard-stroke/35",
                                        "transition",
                                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-wizard-accent/30"
                                    )}
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </DialogClose>
                        </div>
                    </DialogHeader>

                    <ScrollArea className="max-h-[70vh]">
                        {/* This replaces your “unfolded detail area” slab */}
                        <div className="px-6 py-5">
                            <div
                                className={cn(
                                    "relative rounded-2xl",
                                    "bg-wizard-shell/55",
                                    "border border-wizard-stroke/35",
                                    "shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]",
                                    "p-4 sm:p-4.5",
                                    "pl-7",
                                    "space-y-4"
                                )}
                            >
                                {/* Spine */}
                                <div
                                    aria-hidden
                                    className={cn(
                                        "absolute left-3 sm:left-3.5 top-4 bottom-4 w-px",
                                        "bg-wizard-stroke/35"
                                    )}
                                />
                                <div
                                    aria-hidden
                                    className={cn(
                                        "absolute left-[10px] sm:left-[11px] top-6 h-2.5 w-2.5 rounded-full",
                                        "bg-darkLimeGreen",
                                        "border border-wizard-stroke/35"
                                    )}
                                />

                                {children}
                            </div>
                        </div>
                    </ScrollArea>
                </DialogContent>
            </Dialog>
        </>
    );
};
