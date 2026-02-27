import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { HeaderGlass } from "./HeaderGlass";

import CloudTrim from "./CloudTrim";
import CloudBackdrop from "./CloudBackdrop";
import { useHeaderPreset } from "@/components/organisms/Menu/hooks/useHeaderPreset";
import type { HeaderVariant } from "@/components/organisms/Menu/hooks/header.config";

type Props = {
    variant: HeaderVariant;
    className?: string;
    left: React.ReactNode;
    center?: React.ReactNode;
    right?: React.ReactNode;
};

export default function HeaderFrame({
    variant,
    className,
    left,
    center,
    right,
}: Props) {
    const preset = useHeaderPreset(variant);
    const reduceMotion = useReducedMotion();

    const Clouds = preset.clouds.kind === "trim" ? CloudTrim : CloudBackdrop;

    const cloudsEl = (
        <div
            className="absolute inset-0 pointer-events-none"
            style={{ opacity: preset.clouds.opacity }}
            aria-hidden="true"
        >
            <div className="absolute inset-0" style={{ transform: `translateY(${preset.clouds.translateY})` }}>
                {preset.clouds.kind === "trim" ? (
                    <CloudTrim />
                ) : (
                    <CloudBackdrop wash={false} widthClass="w-[min(1200px,100vw)]" />
                )}
            </div>
        </div>
    );

    const animatedCloudsEl =
        preset.clouds.motion.enabled && !reduceMotion ? (
            <motion.div
                className="absolute inset-0 pointer-events-none"
                style={{ opacity: preset.clouds.opacity }}
                animate={{ y: [0, -preset.clouds.motion.deltaPx, 0] }}
                transition={{
                    duration: preset.clouds.motion.duration,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
                aria-hidden="true"
            >
                <div className="absolute inset-0" style={{ transform: `translateY(${preset.clouds.translateY})` }}>
                    {preset.clouds.kind === "trim" ? (
                        <CloudTrim />
                    ) : (
                        <CloudBackdrop wash={false} widthClass="w-[min(1200px,100vw)]" />
                    )}
                </div>
            </motion.div>
        ) : (
            cloudsEl
        );

    return (
        <HeaderGlass
            className={cn(preset.glassClass, preset.shadowClass, className)}
        >
            <div className="relative">
                {animatedCloudsEl}

                <div
                    className={cn(
                        "mx-auto w-full",
                        preset.maxWidthClass,
                        preset.paddingClass,
                        "relative z-10"
                    )}
                >
                    <div className={cn(preset.heightClass, "flex items-center")}>
                        <div className="w-full grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                            <div className="justify-self-start">{left}</div>
                            <div className="justify-self-center">{center}</div>
                            <div className="justify-self-end">{right}</div>
                        </div>
                    </div>
                </div>
            </div>
        </HeaderGlass>
    );
}
