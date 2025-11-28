import { useEffect, useState } from 'react';

export type PerformanceMode = 'normal' | 'low';

export const usePerformanceMode = (): PerformanceMode => {
    const [mode, setMode] = useState<PerformanceMode>('normal');

    useEffect(() => {
        try {
            // 1) User explicit override
            const stored = window.localStorage.getItem('ebudget.performanceMode');
            if (stored === 'low' || stored === 'normal') {
                setMode(stored);
                return;
            }

            // 2) Respect OS setting
            const prefersReducedMotion =
                window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

            // 3) Heuristic: weak CPU
            const fewCores =
                typeof navigator.hardwareConcurrency === 'number' &&
                navigator.hardwareConcurrency > 0 &&
                navigator.hardwareConcurrency <= 4;

            if (prefersReducedMotion || fewCores) {
                setMode('low');
            }
        } catch {
            // fail safe: stay 'normal'
        }
    }, []);

    return mode;
};
