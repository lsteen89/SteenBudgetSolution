import React from 'react';
import clsx from 'clsx';

export interface KpiCardProps {
    label: string;
    value: string;
    subtitle?: string;
    tone?: 'positive' | 'warning' | 'neutral';
    onClick?: () => void;
}

const toneClasses: Record<NonNullable<KpiCardProps['tone']>, string> = {
    positive: 'border-emerald-200',
    warning: 'border-amber-200',
    neutral: 'border-slate-100',
};

const KpiCard: React.FC<KpiCardProps> = ({
    label,
    value,
    subtitle,
    tone = 'neutral',
    onClick,
}) => {
    return (
        <button
            type="button"
            onClick={onClick}
            className={clsx(
                'text-left rounded-2xl bg-white/80 px-4 py-3 shadow-sm border',
                'hover:shadow-md hover:-translate-y-0.5 transition-all duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400',
                toneClasses[tone]
            )}
        >
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">
                {label}
            </span>
            <div className="mt-1 text-xl font-semibold text-slate-900">{value}</div>
            {subtitle && (
                <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">{subtitle}</p>
            )}
        </button>
    );
};

export default KpiCard;
