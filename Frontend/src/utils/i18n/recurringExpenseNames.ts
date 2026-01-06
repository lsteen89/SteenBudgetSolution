const svRecurringExpenseNames: Record<string, string> = {
    Rent: "Hyra",
    FoodStore: "Matbutik",
    Takeout: "Hämtmat",
};

// Normalize so you survive backend variants later
function normalizeKey(raw: string) {
    return (raw ?? "").trim().replace(/\s+/g, "");
}

export function getRecurringExpenseNameLabel(nameKey: string, locale: "sv-SE" | "en-US" = "sv-SE") {
    const key = normalizeKey(nameKey);

    // Only translate known system keys. Otherwise keep user text untouched.
    if (locale === "sv-SE") return svRecurringExpenseNames[key] ?? nameKey;

    return nameKey;
}
