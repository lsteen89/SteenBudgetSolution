import { useEffect, useState } from "react";

/**
 * Ease-out cubic count-up driven by requestAnimationFrame.
 *
 * The hook keeps a single piece of state and updates it on every RAF tick
 * until the target is reached. Passing `enabled=false` snaps the value to
 * the target immediately — that is the prefers-reduced-motion path, and
 * the call site is expected to derive `enabled` from
 * `useReducedMotion()` (or any other source of "should we animate").
 *
 * Both the close-month review modal hero amount and the closed-month
 * handoff takeover number panels rely on this hook; keep it presentational
 * and side-effect free beyond the RAF loop.
 */
export function useCountUp(
  target: number,
  durationMs: number,
  enabled: boolean,
): number {
  const [value, setValue] = useState(enabled ? 0 : target);

  useEffect(() => {
    if (!enabled) {
      setValue(target);
      return;
    }

    let raf = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(target * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs, enabled]);

  return value;
}
