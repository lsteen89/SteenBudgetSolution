import { create } from "zustand";

const SNOOZE_KEY = "budget.newMonthBanner.snoozeUntil";

type Store = {
    selectedYearMonth: string | null;
    setSelectedYearMonth: (ym: string | null) => void;

    snoozeUntil: number | null;
    snooze24h: () => void;
    isSnoozed: () => boolean;
};

export const useBudgetMonthStore = create<Store>((set, get) => ({
    selectedYearMonth: null,
    setSelectedYearMonth: (ym) => set({ selectedYearMonth: ym }),

    snoozeUntil: (() => {
        const v = localStorage.getItem(SNOOZE_KEY);
        const n = v ? Number(v) : null;
        return Number.isFinite(n as number) ? (n as number) : null;
    })(),

    snooze24h: () => {
        const until = Date.now() + 24 * 60 * 60 * 1000;
        localStorage.setItem(SNOOZE_KEY, String(until));
        set({ snoozeUntil: until });
    },

    isSnoozed: () => {
        const until = get().snoozeUntil;
        return !!until && Date.now() < until;
    },
}));
