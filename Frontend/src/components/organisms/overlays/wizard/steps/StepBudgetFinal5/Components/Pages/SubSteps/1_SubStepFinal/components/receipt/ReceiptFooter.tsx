import React from "react";

export function ReceiptFooter({
    leftSummary,
    rightSummary,
    hint,
    editLabel,
    onEdit,
    extraRight,
}: {
    leftSummary?: React.ReactNode;      // e.g. "6 kategorier"
    rightSummary?: React.ReactNode;     // e.g. "25 586 /mån"
    hint?: React.ReactNode;            // e.g. "Stämmer det här ungefär?"
    editLabel?: string;                // e.g. "Ändra utgifter"
    onEdit?: () => void;
    extraRight?: React.ReactNode;      // optional: "Visa alla mål (5)"
}) {
    return (
        <div className="space-y-3">
            {/* Summary */}
            {(leftSummary || rightSummary || extraRight) && (
                <div className="flex items-center justify-between gap-3">
                    <div className="text-xs font-semibold text-wizard-text/55">
                        {leftSummary}
                    </div>

                    <div className="flex items-center gap-3">
                        {extraRight ? (
                            <div className="text-xs font-semibold text-wizard-text/55">
                                {extraRight}
                            </div>
                        ) : null}

                        {rightSummary ? (
                            <div className="font-mono tabular-nums font-semibold text-wizard-text whitespace-nowrap">
                                {rightSummary}
                            </div>
                        ) : null}
                    </div>
                </div>
            )}

            {/* Hint + action */}
            {(hint || onEdit) && (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    {hint ? (
                        <p className="text-xs text-wizard-text/60 leading-relaxed">
                            {hint}
                        </p>
                    ) : (
                        <span />
                    )}

                    {onEdit ? (
                        <button
                            type="button"
                            onClick={onEdit}
                            className="
                inline-flex items-center justify-center
                rounded-xl px-3 py-2
                text-xs font-semibold
                text-wizard-text
                bg-wizard-surface
                border border-wizard-stroke/25
                shadow-sm shadow-black/5
                transition-colors
                hover:bg-wizard-stroke/10 hover:border-wizard-stroke/35
                focus:outline-none focus-visible:ring-2 focus-visible:ring-wizard-accent/35
              "
                        >
                            {editLabel ?? "Ändra"}
                        </button>
                    ) : null}
                </div>
            )}
        </div>
    );
}
