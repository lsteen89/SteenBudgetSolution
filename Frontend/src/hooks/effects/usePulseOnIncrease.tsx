import { useEffect, useRef, useState } from "react";

function useDebouncedValue<T>(value: T, delayMs: number) {
    const [debounced, setDebounced] = useState(value);

    useEffect(() => {
        const id = window.setTimeout(() => setDebounced(value), delayMs);
        return () => window.clearTimeout(id);
    }, [value, delayMs]);

    return debounced;
}

type Options = {
    debounceMs?: number;                // wait until user stops typing
    cooldownMs?: number;                // hard rate-limit pulses
    pulseOnMount?: boolean;             // default false (non-gimmicky)
    minDelta?: number | ((total: number) => number); // dynamic threshold
};

export function usePulseOnIncrease(total: number, opts?: Options) {
    const {
        debounceMs = 450,
        cooldownMs = 900,
        pulseOnMount = false,
        minDelta = (t: number) => Math.max(50, Math.round(t * 0.01)), // 1% or 50
    } = opts ?? {};

    const safe = Number.isFinite(total) ? total : 0;
    const debounced = useDebouncedValue(safe, debounceMs);

    const prev = useRef(debounced);
    const mounted = useRef(false);
    const lastPulseAt = useRef(0);
    const [pulseKey, setPulseKey] = useState(0);

    useEffect(() => {
        const now = Date.now();
        const threshold = typeof minDelta === "function" ? minDelta(debounced) : minDelta;

        // first render
        if (!mounted.current) {
            mounted.current = true;
            prev.current = debounced;

            if (pulseOnMount && debounced > 0) {
                lastPulseAt.current = now;
                setPulseKey((k) => k + 1);
            }
            return;
        }

        // cooldown gate
        if (now - lastPulseAt.current < cooldownMs) {
            prev.current = debounced;
            return;
        }

        const delta = debounced - (prev.current ?? 0);

        // pulse only on meaningful increase
        if (delta >= threshold) {
            lastPulseAt.current = now;
            setPulseKey((k) => k + 1);
        }

        prev.current = debounced;
    }, [debounced, cooldownMs, pulseOnMount, minDelta]);

    return pulseKey;
}
