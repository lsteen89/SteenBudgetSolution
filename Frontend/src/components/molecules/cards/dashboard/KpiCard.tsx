import React from "react";
import { Link, type To } from "react-router-dom";

type Tone = "positive" | "warning" | "neutral";

type BaseProps = {
    label: string;
    value: string;
    subtitle?: string;
    tone?: Tone;
    className?: string;
};

type LinkProps = BaseProps & {
    to: To;              // <-- use To for correctness
};

type ButtonProps = BaseProps & {
    onClick: () => void;
};

type Props = LinkProps | ButtonProps;

const toneStyles: Record<Tone, string> = {
    positive: "border-emerald-100",
    warning: "border-rose-100",
    neutral: "border-slate-100",
};

const isLink = (p: Props): p is LinkProps => "to" in p; // or p as any

const KpiCard: React.FC<Props> = (props) => {
    const tone = props.tone ?? "neutral";

    const content = (
        <div className="flex flex-col gap-1">
            <div className="text-sm text-slate-600">{props.label}</div>
            <div className="text-2xl font-semibold text-slate-900">{props.value}</div>
            {props.subtitle ? <div className="text-xs text-slate-500">{props.subtitle}</div> : null}
        </div>
    );

    const base =
        `rounded-3xl bg-white/80 border shadow-sm p-5 transition block ` +
        `${toneStyles[tone]} hover:bg-white ${props.className ?? ""}`;

    if (isLink(props)) {
        return (
            <Link to={props.to} className={base} aria-label={props.label}>
                {content}
            </Link>
        );
    }

    return (
        <button type="button" onClick={props.onClick} className={base} aria-label={props.label}>
            {content}
        </button>
    );
};

export default KpiCard;
