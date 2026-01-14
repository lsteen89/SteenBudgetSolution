import React from "react";
import { Link, type To } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import clsx from "clsx";

type BaseProps = {
    title: string;
    description: string;
    ctaLabel?: string;
    imageSrc?: string;
    imageAlt?: string;
    className?: string;
};

type LinkProps = BaseProps & { to: To; onClick?: never };
type ButtonProps = BaseProps & { onClick: () => void; to?: never };
type StaticProps = BaseProps & { to?: never; onClick?: never };
type Props = LinkProps | ButtonProps | StaticProps;

const isLink = (p: Props): p is LinkProps => "to" in p;
const isButton = (p: Props): p is ButtonProps => "onClick" in p;

const PlayfulBirdCard: React.FC<Props> = (props) => {
    const { title, description, ctaLabel, imageSrc, imageAlt = "", className } = props;

    const isInteractive = isLink(props) || isButton(props);
    const hasCta = Boolean(ctaLabel);

    const base = clsx(
        "group relative w-full h-full overflow-hidden rounded-3xl text-left",
        "bg-white/70 backdrop-blur border border-white/50 shadow-lg transition-all duration-150",
        isInteractive && "hover:shadow-xl hover:-translate-y-0.5",
        isInteractive && "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
        !isInteractive && "cursor-default",
        className
    );

    const content = (
        <>
            {/* playful blobs */}
            <div className="pointer-events-none absolute -right-12 -top-10 h-28 w-28 rounded-full bg-emerald-200/45 blur-2xl group-hover:bg-emerald-200/65 transition" />
            <div className="pointer-events-none absolute -left-14 -bottom-14 h-28 w-28 rounded-full bg-sky-200/45 blur-2xl group-hover:bg-sky-200/65 transition" />

            <div
                className={clsx(
                    "relative flex h-full items-center gap-3 px-5", // <- h-full is the key
                    hasCta ? "py-4" : "py-5",
                    !hasCta && "min-h-[120px]"
                )}
            >
                <div className={clsx("flex-1 min-w-0", hasCta ? "space-y-1" : "space-y-1.5")}>
                    <h3 className="text-sm font-semibold text-emerald-950 truncate">{title}</h3>
                    <p className="text-xs text-emerald-950/80 leading-snug">{description}</p>

                    {hasCta ? (
                        <span
                            className="
                inline-flex items-center gap-1 mt-2 text-[11px] font-semibold
                text-emerald-950 bg-emerald-900/10 rounded-full px-3 py-1
                group-hover:bg-emerald-900/15 transition
              "
                        >
                            {ctaLabel}
                            <ArrowRight className="h-3.5 w-3.5 opacity-70 group-hover:translate-x-[2px] transition-transform" />
                        </span>
                    ) : null}
                </div>

                {imageSrc ? (
                    <div className="shrink-0 relative self-center">
                        <div className="relative rounded-2xl bg-white/40 border border-white/50 p-2">
                            <img
                                src={imageSrc}
                                alt={imageAlt}
                                className={clsx(
                                    "h-auto drop-shadow-sm",
                                    hasCta ? "w-14 md:w-16 translate-y-[2px]" : "w-16 md:w-[68px] translate-y-0"
                                )}
                                loading="lazy"
                            />
                        </div>
                    </div>
                ) : null}
            </div>
        </>
    );

    if (isLink(props)) {
        return (
            <Link to={props.to} className={base} aria-label={title}>
                {content}
            </Link>
        );
    }

    if (isButton(props)) {
        return (
            <button type="button" onClick={props.onClick} className={base} aria-label={title}>
                {content}
            </button>
        );
    }

    return (
        <div className={base} aria-label={title}>
            {content}
        </div>
    );
};

export default PlayfulBirdCard;
