import React from "react";
import { X, ChevronRight, Plus } from "lucide-react";

type TemplateItem = {
    id: string;
    title: string;
    subtitle?: string;
    Icon: React.ComponentType<{ className?: string }>;
    onSelect: () => void;
};

type Props = {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;

    items: TemplateItem[];

    custom?: {
        title: string;
        subtitle?: string;
        ctaLabel?: string;
        onSelect: () => void;
    };
};

export function TemplatePickerModal({
    isOpen,
    onClose,
    title,
    subtitle,
    items,
    custom,
}: Props) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50">
            {/* overlay */}
            <button
                type="button"
                onClick={onClose}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                aria-label="Close modal"
            />

            {/* modal */}
            <div className="absolute inset-0 flex items-center justify-center p-4">
                <div className="w-full max-w-2xl rounded-2xl bg-[#0b1220]/95 ring-1 ring-white/15 shadow-[0_20px_60px_rgba(0,0,0,0.55)]">
                    <div className="flex items-start justify-between p-5 sm:p-6">
                        <div className="space-y-1">
                            <h2 className="text-lg sm:text-xl font-semibold text-white">{title}</h2>
                            {subtitle && <p className="text-sm text-white/65">{subtitle}</p>}
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl p-2 text-white/70 hover:text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/30"
                            aria-label="Close"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="px-5 sm:px-6 pb-6 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {items.map((it) => (
                                <button
                                    key={it.id}
                                    type="button"
                                    onClick={it.onSelect}
                                    className="group w-full rounded-2xl bg-white/[0.06] ring-1 ring-white/10 hover:bg-white/[0.10] hover:ring-white/20 transition p-4 text-left focus:outline-none focus:ring-2 focus:ring-white/30"
                                >
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-2xl bg-white/5 ring-1 ring-white/10 flex items-center justify-center">
                                                <it.Icon className="h-5 w-5 text-darkLimeGreen" />
                                            </div>

                                            <div className="min-w-0">
                                                <div className="text-white font-semibold leading-snug">{it.title}</div>
                                                {it.subtitle && (
                                                    <div className="text-sm text-white/60 leading-snug line-clamp-2">
                                                        {it.subtitle}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 text-sm text-white/60 group-hover:text-white/80">
                                            <span>Välj</span>
                                            <ChevronRight className="h-4 w-4" />
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>

                        {custom && (
                            <button
                                type="button"
                                onClick={custom.onSelect}
                                className="w-full rounded-2xl bg-emerald-500/15 ring-1 ring-emerald-300/25 hover:bg-emerald-500/20 transition p-4 text-left focus:outline-none focus:ring-2 focus:ring-emerald-200/40"
                            >
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-200/20 flex items-center justify-center">
                                            <Plus className="h-5 w-5 text-limeGreen" />
                                        </div>

                                        <div>
                                            <div className="text-white font-semibold">{custom.title}</div>
                                            {custom.subtitle && (
                                                <div className="text-sm text-white/70">{custom.subtitle}</div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 text-sm text-white/75">
                                        <span>{custom.ctaLabel ?? "Fortsätt"}</span>
                                        <ChevronRight className="h-4 w-4" />
                                    </div>
                                </div>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
