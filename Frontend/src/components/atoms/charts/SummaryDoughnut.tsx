import React, { useMemo } from "react";
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
    type TooltipProps,
} from "recharts";
import type { CategoryKey } from "@/utils/i18n/categories";

export type DoughnutSlice = {
    key: CategoryKey;
    label: string;
    value: number;
};

type Props = {
    slices: DoughnutSlice[];
    onSliceClick?: (key: CategoryKey) => void;
    selectedKey?: CategoryKey | null;

    /** Optional: override center text entirely */
    centerLabel?: string;

    /** Money formatter for tooltip */
    formatMoney: (value: number) => string;

    height?: number;
    colors?: string[];
    className?: string;
    ariaLabel?: string;
};

/**
 * Calm, “Nordic fintech” palette.
 * Avoid neon; let the UI breathe.
 */
const DEFAULT_COLORS = [
    "#153B70", // deep blue
    "#2C5AA0", // medium blue
    "#4CB9FE", // bright tropical blue
    "#7FB9E6", // soft blue
    "#A9D4F2", // very soft blue
    "#1F3F82", // alternate deep
];

function pct(value: number, total: number) {
    if (!total) return 0;
    return Math.round((value / total) * 100);
}

const SummaryDoughnut: React.FC<Props> = ({
    slices,
    onSliceClick,
    selectedKey,
    centerLabel,
    formatMoney,
    height = 250,
    colors = DEFAULT_COLORS,
    className,
    ariaLabel = "Utgiftsöversikt, cirkeldiagram",
}) => {
    const safeSlices = useMemo(
        () =>
            (slices ?? [])
                .map((s) => ({ ...s, value: Number(s.value) || 0 }))
                .filter((s) => s.value > 0),
        [slices]
    );

    const total = useMemo(
        () => safeSlices.reduce((a, s) => a + s.value, 0),
        [safeSlices]
    );

    if (!total || safeSlices.length === 0) return null;

    const top2Pct = useMemo(() => {
        const top2 = [...safeSlices].sort((a, b) => b.value - a.value).slice(0, 2);
        const sumTop2 = top2.reduce((a, s) => a + s.value, 0);
        return pct(sumTop2, total);
    }, [safeSlices, total]);

    const selected = selectedKey
        ? safeSlices.find((s) => s.key === selectedKey)
        : undefined;

    const selectedPct = selected ? pct(selected.value, total) : 0;

    const headline = selected ? selected.label : "Top 2";
    const valueLine = selected ? `${selectedPct} %` : `${top2Pct} %`;
    const amountLine = selected ? formatMoney(selected.value) : undefined;

    const clamp = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
    const headlineSafe = clamp(headline, 16);

    // Note: SVG text won't respect Tailwind `text-*` classes for fill.
    // Use inline style with your CSS variable.
    const fillText = "rgb(var(--wizard-text))";

    const CustomTooltip = ({ active, payload }: TooltipProps<number, string>) => {
        if (!active || !payload?.length) return null;

        const p = payload[0];
        const slice = p?.payload as DoughnutSlice | undefined;
        const v = Number(p?.value) || 0;

        return (
            <div
                className="
          rounded-2xl border border-wizard-stroke/25
          bg-wizard-surface px-4 py-3
          text-sm text-wizard-text/85
          shadow-xl shadow-black/15
        "
            >
                <div className="font-semibold text-wizard-text">
                    {slice?.label ?? ""}
                </div>

                <div className="mt-0.5 text-wizard-text/75">
                    {formatMoney(v)}{" "}
                    <span className="text-wizard-text/60">
                        ({pct(v, total)} %)
                    </span>
                </div>
            </div>
        );
    };

    return (
        <div className={className} role="img" aria-label={ariaLabel} title={ariaLabel}>
            <ResponsiveContainer width="100%" height={height}>
                <PieChart>
                    <Pie
                        data={safeSlices}
                        dataKey="value"
                        nameKey="label"
                        innerRadius="60%"
                        outerRadius="85%"
                        paddingAngle={2}
                        onClick={(_, index) => {
                            const clicked = safeSlices[index];
                            if (!clicked) return;
                            onSliceClick?.(clicked.key);
                        }}
                    >
                        {safeSlices.map((s, i) => {
                            const isSelected = !!selectedKey && s.key === selectedKey;
                            return (
                                <Cell
                                    key={s.key}
                                    fill={colors[i % colors.length]}
                                    opacity={!selectedKey || isSelected ? 1 : 0.35} // calmer defocus
                                    // Selected ring should be "felt", not seen
                                    stroke={isSelected ? "rgba(199, 228, 255, 0.75)" : "rgba(0,0,0,0)"}
                                    strokeWidth={isSelected ? 2 : 0}
                                    className={onSliceClick ? "cursor-pointer" : undefined}
                                />
                            );
                        })}
                    </Pie>

                    <Tooltip content={<CustomTooltip />} />

                    {/* Center label */}
                    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
                        <tspan
                            x="50%"
                            dy="-0.6em"
                            style={{ fill: fillText, opacity: 0.65 }}
                            fontSize={12}
                            fontWeight={600}
                        >
                            {headlineSafe}
                        </tspan>

                        <tspan
                            x="50%"
                            dy="1.25em"
                            style={{ fill: fillText, opacity: 1 }}
                            fontSize={22}
                            fontWeight={800}
                        >
                            {valueLine}
                        </tspan>

                        {amountLine ? (
                            <tspan
                                x="50%"
                                dy="1.35em"
                                style={{ fill: fillText, opacity: 0.55 }}
                                fontSize={11}
                                fontWeight={600}
                            >
                                {amountLine}
                            </tspan>
                        ) : null}
                    </text>
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};

export default SummaryDoughnut;
