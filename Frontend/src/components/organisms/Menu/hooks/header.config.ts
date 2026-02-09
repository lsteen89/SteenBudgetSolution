export type HeaderVariant = "public" | "app";

export type HeaderPreset = {
    /** container */
    maxWidthClass: string; // e.g. max-w-6xl
    paddingClass: string;  // e.g. px-4 sm:px-6
    heightClass: string;   // e.g. h-16

    /** background glass */
    glassClass: string; // applied to HeaderGlass
    shadowClass: string;

    /** clouds */
    clouds: {
        kind: "trim" | "backdrop";
        opacity: number; // 0..1
        translateY: string; // "-38%" etc
        motion: {
            enabled: boolean;
            duration: number; // seconds
            deltaPx: number; // vertical drift amplitude
        };
    };

    /** nav pill */
    pill: {
        wrapClass: string;
        activeClass: string;
        inactiveClass: string;
    };
};

export const HEADER_PRESETS: Record<HeaderVariant, HeaderPreset> = {
    public: {
        maxWidthClass: "max-w-6xl",
        paddingClass: "px-4 sm:px-6",
        heightClass: "h-16",

        glassClass:
            "bg-gradient-to-b from-[rgb(var(--eb-shell)/0.45)] to-[rgb(var(--eb-shell)/0.18)] " +
            "backdrop-blur-md border-b border-eb-stroke/25",
        shadowClass: "shadow-[0_10px_30px_rgba(21,39,81,0.08)]",

        clouds: {
            kind: "trim",
            opacity: 0.80,
            translateY: "-38%",
            motion: { enabled: true, duration: 7, deltaPx: 6 },
        },

        pill: {
            wrapClass:
                "flex items-center gap-1 rounded-full px-2 py-2 " +
                "bg-eb-surface/72 backdrop-blur border border-eb-stroke/25 " +
                "shadow-[0_14px_34px_rgba(21,39,81,0.10)] ring-1 ring-white/30",
            activeClass:
                "bg-eb-surfaceAccent/70 text-eb-text shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]",
            inactiveClass: "hover:bg-eb-surfaceAccent/45",
        },
    },

    app: {
        maxWidthClass: "max-w-6xl",
        paddingClass: "px-4 sm:px-6",
        heightClass: "h-16",

        // slightly more “surface” inside app
        glassClass:
            "bg-eb-surface/35 backdrop-blur-md border-b border-eb-stroke/25",
        shadowClass: "shadow-[0_10px_30px_rgba(21,39,81,0.06)]",

        clouds: {
            kind: "backdrop",
            opacity: 0.65,
            translateY: "-34%",
            motion: { enabled: false, duration: 8, deltaPx: 4 },
        },

        pill: {
            wrapClass:
                "flex items-center gap-1 rounded-full px-2 py-2 " +
                "bg-eb-surface/72 backdrop-blur border border-eb-stroke/25 " +
                "shadow-[0_14px_34px_rgba(21,39,81,0.10)] ring-1 ring-white/30",
            activeClass:
                "bg-eb-surfaceAccent/70 text-eb-text shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]",
            inactiveClass: "hover:bg-eb-surfaceAccent/45",
        },
    },
};
