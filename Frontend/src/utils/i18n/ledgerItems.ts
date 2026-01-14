import type { AppLocale } from "./ledgerText";

const sv: Record<string, string> = {
    Rent: "Hyra",
    RentExtraFees: "Extra avgifter",

    Fuel: "Bränsle",
    Insurance: "Försäkring",
    TotalCarCost: "Övriga bilkostnader",
    Transit: "Kollektivtrafik",

    FoodStore: "Matbutik",
    Takeout: "Uteätande / hämtmat",

    Electricity: "El",
    Internet: "Internet",
    Phone: "Telefon",
    UnionFees: "Fackavgift",

    Clothing: "Kläder",
};

const en: Record<string, string> = {
    Rent: "Rent",
    RentExtraFees: "Extra fees",

    Fuel: "Fuel",
    Insurance: "Insurance",
    TotalCarCost: "Other car costs",
    Transit: "Public transit",

    FoodStore: "Groceries",
    Takeout: "Takeout / eating out",

    Electricity: "Electricity",
    Internet: "Internet",
    Phone: "Phone",
    UnionFees: "Union fees",
    Clothing: "Clothing",
};

export function labelLedgerItem(raw: string, locale: AppLocale) {
    // if user typed custom names like "OnlyFans", keep as-is
    const key = (raw ?? "").trim();
    const dict = locale === "sv-SE" ? sv : en;
    return dict[key] ?? key;
}
