import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

type Props = {
    src: string;
    alt?: string;

    size?: number;     // base (mobile)
    smSize?: number;   // from sm
    mdSize?: number;   // from md
    lgSize?: number;   // from lg

    float?: boolean;
    shadow?: boolean;

    className?: string;
    imgClassName?: string;
};

export default function Mascot({
    src,
    alt = "",
    size = 220,
    smSize,
    mdSize,
    lgSize,
    float = true,
    shadow = true,
    className,
    imgClassName,

}: Props) {
    const reduce = useReducedMotion();

    const style = {
        ["--size" as any]: `${size}px`,
        ...(smSize ? ({ ["--smSize" as any]: `${smSize}px` } as any) : {}),
        ...(mdSize ? ({ ["--mdSize" as any]: `${mdSize}px` } as any) : {}),
        ...(lgSize ? ({ ["--lgSize" as any]: `${lgSize}px` } as any) : {}),
    } as React.CSSProperties;

    const idleAnim =
        reduce || !float
            ? {}
            : {
                y: [0, -8, 0],
                rotate: [0, 0.6, 0, -0.6, 0],
            };

    return (
        <div className={cn("flex flex-col items-center select-none", className)}>
            <motion.div
                className={cn(
                    "relative grid place-items-center",
                    "[width:var(--size)] [height:var(--size)]",
                    "sm:[width:var(--smSize,var(--size))] sm:[height:var(--smSize,var(--size))]",
                    "md:[width:var(--mdSize,var(--smSize,var(--size)))] md:[height:var(--mdSize,var(--smSize,var(--size)))]",
                    "lg:[width:var(--lgSize,var(--mdSize,var(--smSize,var(--size))))] lg:[height:var(--lgSize,var(--mdSize,var(--smSize,var(--size))))]"
                )}
                style={style}
                initial={reduce ? { opacity: 1 } : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
            >
                {/* bloom behind mascot (tinted, controllable, not “dirty PNG shadow”) */}
                <div
                    className="pointer-events-none absolute -inset-10 rounded-full blur-2xl opacity-80"
                    style={{
                        background:
                            "radial-gradient(60% 60% at 50% 40%, rgb(var(--eb-accent) / 0.18) 0%, transparent 72%)",
                    }}
                />

                <motion.img
                    src={src}
                    alt={alt}
                    draggable={false}
                    className={cn("relative z-10 h-full w-full object-contain", imgClassName)}
                    animate={idleAnim}
                    transition={
                        reduce || !float
                            ? undefined
                            : { duration: 7.2, repeat: Infinity, ease: "easeInOut" }
                    }
                />

                {/* ground shadow (scales with mascot size) */}
                {shadow && (
                    <motion.div
                        className={cn(
                            "pointer-events-none absolute left-1/2 top-full -translate-x-1/2 rounded-full blur-xl",
                            "mt-2 h-7 w-36 bg-[rgb(var(--eb-text)/0.08)]",
                            "sm:mt-3 sm:h-8 sm:w-44",
                            "lg:h-10 lg:w-56"
                        )}
                        animate={reduce || !float ? {} : { scaleX: [1, 0.9, 1], scaleY: [1, 0.85, 1] }}
                        transition={
                            reduce || !float
                                ? undefined
                                : { duration: 7.2, repeat: Infinity, ease: "easeInOut" }
                        }
                    />
                )}
            </motion.div>
        </div>
    );
}
