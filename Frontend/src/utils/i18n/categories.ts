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
        rent: "Rent",
        food: "Food",
        transport: "Transport",
        clothing: "Clothing",
        subscription: "Subscription",
        fixedexpense: "FixedExpense",
        fixed_expense: "FixedExpense",
    };

    return map[compact] ?? k;
}

export function getCategoryLabel(key: CategoryKey, locale: "sv-SE" | "en-US" = "sv-SE") {
    if (locale === "sv-SE") return sv[key] ?? key;
    return key;
}
