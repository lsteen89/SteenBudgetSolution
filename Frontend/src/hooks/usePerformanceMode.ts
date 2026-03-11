import useMediaQuery from "@/hooks/useMediaQuery";
import { useEffect, useMemo, useState } from "react";

export type PerformanceMode = "normal" | "low";
type Override = PerformanceMode | null;

const KEY = "ebudget.performanceMode";

function readOverride(): Override {
  try {
    const stored = window.localStorage.getItem(KEY);
    return stored === "low" || stored === "normal" ? stored : null;
  } catch {
    return null;
  }
}

function writeOverride(v: Override) {
  try {
    if (v === null) window.localStorage.removeItem(KEY);
    else window.localStorage.setItem(KEY, v);
  } catch {}
}

function autoMode(): PerformanceMode {
  try {
    const prefersReducedMotion =
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;

    const fewCores =
      typeof navigator.hardwareConcurrency === "number" &&
      navigator.hardwareConcurrency > 0 &&
      navigator.hardwareConcurrency <= 6;

    const lowMemory =
      typeof (navigator as any).deviceMemory === "number" &&
      (navigator as any).deviceMemory > 0 &&
      (navigator as any).deviceMemory <= 8;

    return prefersReducedMotion || fewCores || lowMemory ? "low" : "normal";
  } catch {
    return "normal";
  }
}

export function usePerformanceMode() {
  const isPhone = useMediaQuery("(max-width: 767px)");

  const [override, setOverrideState] = useState<Override>(null);
  const [auto, setAuto] = useState<PerformanceMode>("normal");

  useEffect(() => {
    setOverrideState(readOverride());
    setAuto(autoMode());
  }, []);

  // optional: keep auto in sync if OS reduced motion flips
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mql) return;

    const onChange = () => setAuto(autoMode());
    mql.addEventListener?.("change", onChange);
    return () => mql.removeEventListener?.("change", onChange);
  }, []);

  const mode = useMemo<PerformanceMode>(() => {
    // 0) phone => forced low, no debate
    if (isPhone) return "low";

    // 1) user override wins on non-phone
    if (override) return override;

    // 2) otherwise auto
    return auto;
  }, [isPhone, override, auto]);

  const setOverride = (v: PerformanceMode) => {
    // on phone, ignore attempts to override (defensive)
    if (isPhone) return;
    setOverrideState(v);
    writeOverride(v);
  };

  const clearOverride = () => {
    if (isPhone) return;
    setOverrideState(null);
    writeOverride(null);
  };

  return { mode, override, auto, setOverride, clearOverride, isPhone };
}
