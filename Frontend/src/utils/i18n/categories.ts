export type CategoryKey =
    | "Rent"
    | "Food"
    | "Transport"
    | "Clothing"
    | "Subscription"
    | "FixedExpense"
    | string;

const sv: Record<string, string> = {
    Rent: "Hyra",
    Food: "Mat",
    Transport: "Transport",
    Clothing: "Kläder",
    Subscription: "Abonnemang",
    FixedExpense: "Fasta kostnader",
};

export function normalizeCategoryKey(raw: string): CategoryKey {
    const k = (raw ?? "").trim();
    const compact = k.replace(/\s+/g, "").toLowerCase();

    const map: Record<string, CategoryKey> = {
        // canonical
        rent: "Rent",
        food: "Food",
        transport: "Transport",
        clothing: "Clothing",
        subscription: "Subscription",
        fixedexpense: "FixedExpense",

        // tolerant aliases
        fixed_expense: "FixedExpense",
        fixedcost: "FixedExpense",
        fixedcosts: "FixedExpense",
        fixedexpenses: "FixedExpense",
        fixed: "FixedExpense",

        subscriptions: "Subscription",
        sub: "Subscription",
    };

    return map[compact] ?? k;
}

export function getCategoryLabel(
    key: CategoryKey,
    locale: "sv-SE" | "en-US" = "sv-SE"
) {
    if (locale === "sv-SE") return sv[key] ?? key;
    return key;
}

/** Convenience for raw backend category strings */
export function labelCategory(raw: string, locale: "sv-SE" | "en-US" = "sv-SE") {
    return getCategoryLabel(normalizeCategoryKey(raw), locale);
}
