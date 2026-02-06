import React, { useMemo } from "react";
import { Slider } from "@/components/ui/slider";

type SliderMarker = {
  value: number;
  label?: string;
  className?: string;
};

export interface RangeSliderProps {
  value: number;
  onChange: (value: number) => void;

  min?: number;
  max?: number;
  step?: number;

  showValueLabel?: boolean;
  formatValueLabel?: (value: number) => string;

  className?: string;

  markers?: SliderMarker[];
  valueLabel?: string;
}

function toFinite(x: unknown, fallback: number) {
  const n = typeof x === "number" ? x : Number(x);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(n: unknown, min: number, max: number) {
  const v = toFinite(n, min);
  return Math.min(Math.max(v, min), max);
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

// “money green”: gets deeper/richer as you save more
function moneyGreen(t: number) {
  const x = Math.max(0, Math.min(1, t));
  const h = lerp(110, 135, x); // hue shifts slightly towards richer green
  const s = lerp(75, 90, x);   // more saturated
  const l = lerp(55, 40, x);   // darker
  return `hsl(${h} ${s}% ${l}%)`;
}

export default function RangeSlider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  showValueLabel = true,
  formatValueLabel,
  className = "",
  markers: propsMarkers = [],
  valueLabel,
}: RangeSliderProps) {
  const numericMin = toFinite(min, 0);
  const numericMax = toFinite(max, 100);
  const safeMax = Math.max(numericMax, numericMin);

  const safeValue = useMemo(
    () => clamp(value, numericMin, safeMax),
    [value, numericMin, safeMax]
  );

  const percent = useMemo(() => {
    const range = safeMax - numericMin;
    if (range <= 0) return 0;
    const p = ((Number(safeValue) - numericMin) / range) * 100;
    return Number.isFinite(p) ? Math.max(0, Math.min(100, p)) : 0;
  }, [safeValue, numericMin, safeMax]);

  const markers = useMemo(() => {
    const range = safeMax - numericMin;
    if (!range || range <= 0) return [];

    return (propsMarkers ?? []).map((m) => {
      const safeVal = clamp(m.value, numericMin, safeMax);
      const p = ((Number(safeVal) - numericMin) / range) * 100;
      const pct = Number.isFinite(p) ? Math.max(0, Math.min(100, p)) : 0;
      return { ...m, pct };
    });
  }, [numericMin, safeMax, propsMarkers]);

  // ✅ Thumb-center correction (fix bubble drift)
  const bubbleLeft = useMemo(() => {
    const p = Math.max(0, Math.min(100, percent));

    // Must roughly match thumb size in slider.tsx
    // If your thumb is 18px, set 18. If 22px, set 22.
    const thumbPx = 20;

    // move left at left side, right at right side = centers perfectly
    const pxOffset = ((p - 50) / 100) * thumbPx;

    return `calc(${p}% + ${pxOffset}px)`;
  }, [percent]);

  // ✅ Money-green based on percent
  const bubbleColor = useMemo(() => moneyGreen(percent / 100), [percent]);

  let labelText = String(Math.round(Number(safeValue)));
  try {
    labelText = formatValueLabel
      ? formatValueLabel(Number(safeValue))
      : Math.round(Number(safeValue)).toLocaleString("sv-SE");
  } catch { }

  return (
    <div
      className={`relative w-full ${className}`}
      style={{
        // Used by shadcn slider range fill
        ["--money-green" as any]: bubbleColor,
      }}
    >
      {/* Marker overlay */}
      {markers.length > 0 && (
        <div className="pointer-events-none absolute left-0 right-0 top-1.5">
          {markers.map((m, idx) => (
            <div
              key={`${m.value}-${idx}`}
              className="absolute -translate-x-1/2"
              style={{ left: `${m.pct}%` }}
            >
              <div className={`h-4 w-[2px] rounded-full ${m.className ?? "bg-sky-400/80"}`} />

              {m.label ? (
                <div className="absolute top-5 left-1/2 -translate-x-1/2">
                  <span className="rounded-md bg-white/10 border border-white/10 px-2 py-1 text-[10px] text-wizard-text/85 whitespace-nowrap shadow-sm">
                    {m.label}
                  </span>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      <Slider
        value={[Number(safeValue)]}
        min={numericMin}
        max={safeMax}
        step={toFinite(step, 1)}
        onValueChange={(arr) => onChange(clamp(arr?.[0], numericMin, safeMax))}
        className="w-full"
      />

      {showValueLabel && (
        <div className="pointer-events-none absolute -top-10" style={{ left: bubbleLeft }}>
          <div className="-translate-x-1/2 flex flex-col items-center">
            <span
              className="whitespace-nowrap rounded-lg px-2 py-1 text-xs font-semibold text-wizard-text shadow-lg"
              style={{ backgroundColor: bubbleColor }}
            >
              {valueLabel ?? labelText}
            </span>

            <span
              className="-mt-[1px] block h-0 w-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent"
              style={{ borderTopColor: bubbleColor }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
