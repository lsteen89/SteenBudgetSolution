import React from "react";

export function renderEmphasis(text: string) {
    // Splits on **bold**
    const parts = text.split(/(\*\*.*?\*\*)/g);

    return parts.map((p, i) => {
        const isBold = p.startsWith("**") && p.endsWith("**");
        if (!isBold) return <span key={i}>{p}</span>;

        const content = p.slice(2, -2);
        return (
            <strong key={i} className="font-semibold text-wizard-text/90">
                {content}
            </strong>
        );
    });
}
