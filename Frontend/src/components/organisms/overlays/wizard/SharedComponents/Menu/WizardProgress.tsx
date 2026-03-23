import clsx from "clsx";
import { motion, useReducedMotion } from "framer-motion";
import React from "react";

interface WizardStep {
  icon: React.ComponentType<{ size: string | number | undefined }>;
  label: string;
}

interface WizardProgressProps {
  step: number;
  totalSteps: number;
  steps: readonly WizardStep[];
  onStepClick: (step: number) => void;
  isDebugMode?: boolean;

  tone?: "default" | "muted";
  showProgressLine?: boolean;

  size?: "default" | "compact" | "tiny";
  progressTone?: "accent" | "muted";
  maxClickableStep?: number; // From BE

  highlightFinal?: boolean; // final summary unlocked
  finalLabel?: string; // e.g. "Sammanfattning"
}

const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(n, max));

const WizardProgressComponent: React.FC<WizardProgressProps> = ({
  step,
  totalSteps,
  steps,
  onStepClick,
  isDebugMode = false,
  tone = "default",
  showProgressLine = true,
  size = "default",
  progressTone = "accent",
  maxClickableStep,
  highlightFinal = false,
  finalLabel = "Sammanfattning",
}) => {
  if (totalSteps <= 1) return null;

  const current = clamp(step, 1, totalSteps);
  const reduceMotion = useReducedMotion();
  const insetPct = 50 / totalSteps;
  const trackSpanPct = 100 - insetPct * 2;

  // step 1 => 0%, step N => 100% (segment-based)
  const progress01 = (current - 1) / (totalSteps - 1);
  const progressPct = clamp(progress01 * 100, 0, 100);
  const barWidthPct = (progressPct / 100) * trackSpanPct;

  const isMuted = tone === "muted";
  const isCompact = size === "compact";

  const isTiny = size === "tiny";
  const iconBox = isTiny ? "w-8 h-8" : isCompact ? "w-9 h-9" : "w-10 h-10";
  const iconSize = isTiny ? 16 : isCompact ? 18 : 20;
  const iconSizeActive = isTiny ? 18 : isCompact ? 20 : 26;
  const trackTop = isTiny ? "top-3.5" : isCompact ? "top-4" : "top-5";

  const progressClass =
    progressTone === "muted" ? "bg-wizard-stroke/70" : "bg-wizard-accent";

  const completedClass = "bg-wizard-accent text-white shadow-sm";
  const futureClass =
    "bg-wizard-surface border border-wizard-stroke/60 text-wizard-text/45";

  const activeClass = isMuted
    ? "bg-wizard-surface border border-wizard-stroke/60 text-wizard-text/70"
    : "bg-wizard-surface border-2 border-wizard-accent text-wizard-accent shadow-[0_10px_30px_rgba(2,6,23,0.12)]";

  return (
    <div className={clsx("relative overflow-visible")}>
      {/* Track + Progress */}
      {showProgressLine && (
        <>
          <div
            className={clsx("absolute h-[2px] bg-wizard-stroke/70", trackTop)}
            style={{ left: `${insetPct}%`, width: `${trackSpanPct}%` }}
          />

          <motion.div
            className={clsx(
              "absolute h-[2px] overflow-hidden",
              trackTop,
              progressClass,
            )}
            style={{ left: `${insetPct}%` }}
            initial={{ width: "0%" }}
            animate={{
              width: `${barWidthPct}%`,
              scaleX: 1,
            }}
            transition={{
              width: { duration: reduceMotion ? 0.18 : 0.3, ease: "easeOut" },
              scaleX: { duration: 0 },
            }}
          />
        </>
      )}

      {/* Steps */}
      <div
        className="relative z-10 grid items-start"
        style={{ gridTemplateColumns: `repeat(${totalSteps}, minmax(0, 1fr))` }}
      >
        {steps.map((item, index) => {
          const stepIndex = index + 1;
          const completed = stepIndex < current;
          const active = stepIndex === current;
          const highlightBox = isTiny
            ? "w-10 h-10"
            : isCompact
              ? "w-11 h-11"
              : "w-12 h-12";
          const highlightIcon = isTiny ? 20 : isCompact ? 22 : 28;
          const isFinal = stepIndex === totalSteps;
          const highlight = !!highlightFinal && isFinal && !active; // don’t fight active styling

          const dimThis = isMuted && !active && !highlight; // keep final + active crisp

          const canClick = isDebugMode
            ? true
            : typeof maxClickableStep === "number"
              ? stepIndex <= maxClickableStep
              : completed;
          const handleClick = () => {
            if (canClick) onStepClick(stepIndex);
          };

          const Icon = item.icon;

          const iconSizeFor = (active: boolean, highlight: boolean) => {
            if (active) return iconSizeActive;
            if (highlight) return iconSizeActive;
            if (highlight) return highlightIcon;
            return iconSize;
          };

          const boxClassFor = (active: boolean, highlight: boolean) =>
            clsx(
              "flex items-center justify-center rounded-full transition-all duration-200",
              highlight ? highlightBox : iconBox,
              active &&
                "scale-[1.18] ring-2 ring-wizard-accent/60 ring-offset-2 ring-offset-transparent",
              highlight && "bg-wizard-surface border-2 border-wizard-accent",
              highlight && "shadow-[0_14px_38px_rgba(2,6,23,0.18)]",
              highlight &&
                "ring-2 ring-wizard-accent/35 ring-offset-2 ring-offset-transparent",
            );

          return (
            <button
              key={item.label}
              type="button"
              onClick={handleClick}
              disabled={!canClick}
              className={clsx(
                "flex flex-col items-center min-w-0 rounded-xl",
                dimThis && "opacity-55",
                canClick ? "cursor-pointer" : "cursor-default",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wizard-accent/35",
              )}
              aria-current={active ? "step" : undefined}
              aria-label={item.label}
            >
              <div
                className={clsx(
                  boxClassFor(active, highlight),
                  completed && completedClass,
                  !completed && !active && futureClass,
                  active && activeClass,
                )}
              >
                <Icon size={iconSizeFor(active, highlight)} />
              </div>

              <span
                className={clsx(
                  "mt-2 text-xs sm:text-sm text-center truncate max-w-full",
                  active
                    ? "font-semibold text-wizard-text"
                    : isMuted
                      ? "font-medium text-wizard-text/50"
                      : "font-medium text-wizard-text/65",
                )}
                title={item.label}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const WizardProgress = React.memo(WizardProgressComponent);
export default WizardProgress;
