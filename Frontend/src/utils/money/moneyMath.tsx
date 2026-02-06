export const safeMoney = (v: number | null | undefined): number =>
    typeof v === "number" && Number.isFinite(v) ? v : 0;

export const sumMoney = (...values: Array<number | null | undefined>): number =>
    values.reduce<number>((acc, v) => acc + safeMoney(v), 0);

/**
 * Sums ALL numeric leaf values in an object/array recursively.
 * Great for totals when the shape grows over time.
 */
export const sumMoneyDeep = (value: unknown): number => {
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;

    if (Array.isArray(value)) {
        return value.reduce<number>((acc, v) => acc + sumMoneyDeep(v), 0);
    }

    if (value && typeof value === "object") {
        return Object.values(value as Record<string, unknown>).reduce<number>(
            (acc, v) => acc + sumMoneyDeep(v),
            0
        );
    }

    return 0;
};
