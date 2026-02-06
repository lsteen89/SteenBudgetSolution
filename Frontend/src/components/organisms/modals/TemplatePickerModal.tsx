import React, { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import { X, PlusCircle, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type TemplateBase<Name extends string = string> = {
    name: Name;
};

type IconMap<Name extends string> = Partial<Record<Name, React.ReactNode>>;

type Props<T extends TemplateBase<Name>, Name extends string = T["name"]> = {
    templates: T[];
    isOpen: boolean;
    onClose: () => void;

    title: string;
    description?: string;
    ariaLabel: string;

    iconMap?: IconMap<Name>;

    onSelect: (template: T) => void;
    onSelectBlank: () => void;

    blankTitle: string;
    blankDescription?: string;

    renderMeta?: (t: T) => React.ReactNode;
    defaultIcon?: React.ReactNode;
};

const SPRING = { type: "spring", stiffness: 360, damping: 32, mass: 0.8 } as const;

const tileBase =
    "group w-full rounded-2xl text-left transition " +
    "bg-wizard-surface border border-wizard-stroke/20 shadow-sm shadow-black/5 " +
    "hover:border-wizard-stroke/35 hover:bg-wizard-stroke/10 " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wizard-stroke/45 " +
    "active:scale-[0.99]";

const iconWrap =
    "grid h-11 w-11 place-items-center rounded-2xl " +
    "bg-wizard-accent-soft border border-wizard-stroke/20";

const chevronHint =
    "flex items-center gap-2 text-sm text-wizard-text/55 group-hover:text-wizard-text/75";

export function TemplatePickerModal<
    T extends TemplateBase<Name>,
    Name extends string = T["name"]
>(props: Props<T, Name>) {
    const {
        isOpen,
        onClose,
        title,
        description,
        ariaLabel,
        templates,
        iconMap,
        onSelect,
        onSelectBlank,
        blankTitle,
        blankDescription,
        renderMeta,
        defaultIcon,
    } = props;

    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [isOpen, onClose]);

    if (typeof window === "undefined") return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    key="template-picker-modal"
                    className="fixed inset-0 z-[9999] grid place-items-center p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) onClose();
                    }}
                    role="dialog"
                    aria-modal="true"
                    aria-label={ariaLabel}
                >
                    {/* Scrim (Floor) */}
                    <div className="absolute inset-0 bg-wizard-overlay" />

                    {/* Shell */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98, y: 12 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.985, y: 12 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                        className={cn(
                            "relative w-full max-w-2xl overflow-hidden rounded-3xl",
                            "bg-wizard-shell border border-wizard-stroke/25",
                            "shadow-2xl shadow-black/35"
                        )}
                    >
                        <div className="p-6 md:p-8">
                            <button
                                type="button"
                                onClick={onClose}
                                className={cn(
                                    "absolute right-4 top-4 rounded-full p-2",
                                    "text-wizard-text/55 hover:text-wizard-text hover:bg-wizard-stroke/10",
                                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wizard-stroke/45"
                                )}
                                aria-label="Stäng"
                            >
                                <X size={20} />
                            </button>

                            <h3 className="text-2xl font-extrabold tracking-tight text-wizard-text">
                                {title}
                            </h3>
                            {description ? (
                                <p className="mt-1 text-sm text-wizard-text/70">{description}</p>
                            ) : null}

                            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                                {templates.map((t) => {
                                    const icon = iconMap?.[t.name as Name] ?? defaultIcon ?? null;

                                    return (
                                        <motion.button
                                            key={t.name}
                                            type="button"
                                            onClick={() => onSelect(t)}
                                            className={tileBase}
                                            whileHover={{ y: -1 }}
                                            whileTap={{ scale: 0.99 }}
                                            transition={SPRING}
                                        >
                                            <div className="flex items-center gap-4 p-5">
                                                <div className={iconWrap}>
                                                    {/* Keep icon calm; if you want it green, do it inside the icon */}
                                                    {icon}
                                                </div>

                                                <div className="min-w-0 flex-1">
                                                    <h4 className="font-semibold leading-tight text-wizard-text">
                                                        {t.name}
                                                    </h4>

                                                    {renderMeta ? (
                                                        <div className="mt-1 text-sm tabular-nums text-wizard-text/65">
                                                            {renderMeta(t)}
                                                        </div>
                                                    ) : null}
                                                </div>

                                                <div className={chevronHint}>
                                                    <span className="hidden sm:inline">Välj</span>
                                                    <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                                                </div>
                                            </div>
                                        </motion.button>
                                    );
                                })}

                                {/* Blank / create custom */}
                                <div className="md:col-span-2 mt-2">
                                    <motion.button
                                        type="button"
                                        onClick={onSelectBlank}
                                        className={cn(
                                            tileBase,
                                            // give it a *slightly* stronger presence, not green fill
                                            "border-wizard-accent/25 hover:border-wizard-accent/35"
                                        )}
                                        whileHover={{ y: -1 }}
                                        whileTap={{ scale: 0.99 }}
                                        transition={SPRING}
                                    >
                                        <div className="flex items-center gap-4 p-5">
                                            <div
                                                className={cn(
                                                    "grid h-11 w-11 place-items-center rounded-2xl",
                                                    "bg-wizard-accent-soft border border-wizard-accent/20"
                                                )}
                                            >
                                                <PlusCircle size={26} className="text-wizard-accent" />
                                            </div>

                                            <div className="flex-1">
                                                <div className="font-semibold text-wizard-text">
                                                    {blankTitle}
                                                </div>
                                                {blankDescription ? (
                                                    <div className="text-sm text-wizard-text/70">
                                                        {blankDescription}
                                                    </div>
                                                ) : null}
                                            </div>

                                            <div className={chevronHint}>
                                                <span>Fortsätt</span>
                                                <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                                            </div>
                                        </div>
                                    </motion.button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
}
