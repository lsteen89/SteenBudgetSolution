import React from "react";
import { motion, useReducedMotion, useAnimationControls } from "framer-motion";
import { cn } from "@/lib/utils";

type Controls = ReturnType<typeof useAnimationControls>;

type Props = {
    src: string;
    size?: number;
    mdSize?: number;
    showText?: boolean;
    className?: string;

    hello?: boolean;
    float?: boolean;
    tilt?: boolean;

    controls?: Controls;
};

export function WizardMascot({
    src,
    size = 72,
    mdSize,
    showText = false,
    className,

    hello = true,
    float = true,
    tilt = false,

    controls,
}: Props) {
    const reduce = useReducedMotion();
    const isExternallyControlled = !!controls;

    const helloAnim =
        reduce || !hello || isExternallyControlled
            ? {}
            : {
                scale: [0.98, 1.04, 1],
                rotate: tilt ? [0, 3, -3, 2, 0] : [0, 2, -2, 1, 0],
                y: [4, 0, 0],
            };

    const idleAnim =
        reduce || isExternallyControlled
            ? {}
            : {
                y: float ? [0, -6, 0] : 0,
                rotate: tilt ? [0, 1.5, 0, -1.2, 0] : 0,
            };

    const idleTransition = reduce
        ? { duration: 0.2 }
        : { duration: 5.8, repeat: Infinity, ease: "easeInOut" as const };

    const style: React.CSSProperties = {
        width: size,
        height: size,
        ...(typeof mdSize === "number" && mdSize > 0
            ? ({ ["--mdSize" as any]: `${mdSize}px` } as React.CSSProperties)
            : {}),
    };

    return (
        <div className={cn("flex flex-col items-center gap-3", className)}>
            <motion.div
                className={cn(
                    "relative",
                    typeof mdSize === "number" && mdSize > 0 && "md:[width:var(--mdSize)] md:[height:var(--mdSize)]"
                )}
                style={style}
                initial={{ opacity: 0, y: 6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
            >
                <motion.img
                    src={src}
                    alt="eBudget"
                    draggable={false}
                    className="h-full w-full object-contain drop-shadow"
                    animate={controls ?? { ...helloAnim, ...idleAnim }}
                    transition={
                        isExternallyControlled
                            ? undefined
                            : {
                                scale: reduce ? { duration: 0.2 } : { duration: 0.45, ease: "easeOut" },
                                y: idleTransition,
                                rotate: tilt
                                    ? reduce
                                        ? { duration: 0.2 }
                                        : { duration: 7.2, repeat: Infinity, ease: "easeInOut" }
                                    : undefined,
                            }
                    }
                />

                <motion.div
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-black/10 rounded-full blur-[2px]"
                    animate={reduce || !float || isExternallyControlled ? {} : { scale: [1, 0.9, 1] }}
                    transition={reduce ? { duration: 0.2 } : { duration: 5.8, repeat: Infinity, ease: "easeInOut" }}
                />
            </motion.div>

            {showText && (
                <span className="text-sm font-black uppercase tracking-[0.2em] text-wizard-text/40">
                    eBudget
                </span>
            )}
        </div>
    );
}
