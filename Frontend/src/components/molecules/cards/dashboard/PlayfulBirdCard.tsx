import React from "react";
import { Link, type To } from "react-router-dom";

type BaseProps = {
    title: string;
    description: string;
    ctaLabel?: string;
    imageSrc?: string;
    imageAlt?: string;
    className?: string;
};

type LinkProps = BaseProps & {
    to: To;
    onClick?: never;
};

type ButtonProps = BaseProps & {
    onClick: () => void;
    to?: never;
};

type Props = LinkProps | ButtonProps;

const isLink = (p: Props): p is LinkProps => "to" in p;

const PlayfulBirdCard: React.FC<Props> = (props) => {
    const { title, description, ctaLabel, imageSrc, imageAlt = "", className } = props;

    const base =
        `
    relative w-full overflow-hidden rounded-3xl
    bg-gradient-to-r from-emerald-400 via-emerald-300 to-sky-300
    px-5 py-4 text-left shadow-lg
    flex items-center gap-3
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500
    hover:shadow-xl hover:-translate-y-0.5 transition-all duration-150
    ` + (className ?? "");

    const content = (
        <>
            <div className="flex-1 space-y-1">
                <h3 className="text-sm font-semibold text-emerald-950">{title}</h3>
                <p className="text-xs text-emerald-950/80 leading-snug">{description}</p>

                {ctaLabel && (
                    <span className="inline-flex items-center mt-2 text-[11px] font-semibold text-emerald-950 bg-white/70 rounded-full px-3 py-1">
                        {ctaLabel}
                    </span>
                )}
            </div>

            {imageSrc ? (
                <div className="shrink-0 relative">
                    <img src={imageSrc} alt={imageAlt} className="w-16 h-auto drop-shadow-md translate-y-1" />
                </div>
            ) : null}
        </>
    );

    if (isLink(props)) {
        return (
            <Link to={props.to} className={base} aria-label={title}>
                {content}
            </Link>
        );
    }

    return (
        <button type="button" onClick={props.onClick} className={base} aria-label={title}>
            {content}
        </button>
    );
};

export default PlayfulBirdCard;
