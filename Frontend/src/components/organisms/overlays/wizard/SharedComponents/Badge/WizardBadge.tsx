import React from "react";

export default function WizardBadge({
    icon,
    text,
}: {
    icon: React.ReactNode;
    text: string;
}) {
    return (
        <div className="inline-flex items-center gap-2 rounded-xl bg-wizard-shell px-3 py-1.5">
            {icon}
            <span className="text-xs font-semibold text-wizard-text/80">{text}</span>
        </div>
    );
}
