import React from 'react';

export interface PlayfulBirdCardProps {
    title: string;
    description: string;
    ctaLabel?: string;
    onClick?: () => void;
    imageSrc?: string;
    imageAlt?: string;
}

const PlayfulBirdCard: React.FC<PlayfulBirdCardProps> = ({
    title,
    description,
    ctaLabel,
    onClick,
    imageSrc,
    imageAlt = '',
}) => {
    const Wrapper: any = onClick ? 'button' : 'div';

    return (
        <Wrapper
            onClick={onClick}
            className="
        relative w-full overflow-hidden rounded-3xl
        bg-gradient-to-r from-emerald-400 via-emerald-300 to-sky-300
        px-5 py-4 text-left shadow-lg
        flex items-center gap-3
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500
        hover:shadow-xl hover:-translate-y-0.5 transition-all duration-150
      "
        >
            <div className="flex-1 space-y-1">
                <h3 className="text-sm font-semibold text-emerald-950">
                    {title}
                </h3>
                <p className="text-xs text-emerald-950/80 leading-snug">
                    {description}
                </p>

                {ctaLabel && (
                    <span className="inline-flex items-center mt-2 text-[11px] font-semibold text-emerald-950 bg-white/70 rounded-full px-3 py-1">
                        {ctaLabel}
                    </span>
                )}
            </div>

            <div className="shrink-0 relative">
                <img
                    src={imageSrc}
                    alt={imageAlt}
                    className="w-16 h-auto drop-shadow-md translate-y-1"
                />
            </div>
        </Wrapper>
    );
};

export default PlayfulBirdCard;
