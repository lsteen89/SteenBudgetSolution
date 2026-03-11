import type { AppLocale } from "@/utils/i18n/locale";

export type CategoryKey =
  | "housing"
  | "food"
  | "transport"
  | "clothing"
  | "fixed"
  | "subscription"
  | "other";

const sv: Record<CategoryKey, string> = {
  housing: "Boende",
  food: "Mat",
  transport: "Transport",
  clothing: "Kläder",
  fixed: "Räkningar & nödvändigt",
  subscription: "Prenumerationer",
  other: "Övrigt",
};

const en: Record<CategoryKey, string> = {
  housing: "Housing",
  food: "Food",
  transport: "Transport",
  clothing: "Clothing",
  fixed: "Bills & essentials",
  subscription: "Subscriptions",
  other: "Other",
};
const et: Record<CategoryKey, string> = {
  housing: "Eluase",
  food: "Toit",
  transport: "Transport",
  clothing: "Riided",
  fixed: "Arved ja püsikulud",
  subscription: "Tellimused",
  other: "Muu",
};

export function labelCategory(key: CategoryKey, locale: AppLocale) {
  const maps: Record<AppLocale, Record<CategoryKey, string>> = {
    "sv-SE": sv,
    "en-US": en,
    "et-EE": et,
  };

  return (maps[locale] || en)[key];
}

const KNOWN: readonly CategoryKey[] = [
  "housing",
  "food",
  "transport",
  "clothing",
  "fixed",
  "subscription",
  "other",
] as const;

export function asCategoryKey(raw: unknown): CategoryKey {
  const s = String(raw ?? "").trim();
  return (KNOWN as readonly string[]).includes(s)
    ? (s as CategoryKey)
    : "other";
}
