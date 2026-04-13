import type { KnownExpenseCategoryCode } from "@/types/budget/categoryKeys";
import type { AppLocale } from "@/types/i18n/appLocale";

const sv: Record<KnownExpenseCategoryCode, string> = {
  housing: "Boende",
  food: "Mat",
  transport: "Transport",
  clothing: "Kläder",
  fixed: "Räkningar & nödvändigt",
  subscription: "Prenumerationer",
  other: "Övrigt",
};

const en: Record<KnownExpenseCategoryCode, string> = {
  housing: "Housing",
  food: "Food",
  transport: "Transport",
  clothing: "Clothing",
  fixed: "Bills & essentials",
  subscription: "Subscriptions",
  other: "Other",
};

const et: Record<KnownExpenseCategoryCode, string> = {
  housing: "Eluase",
  food: "Toit",
  transport: "Transport",
  clothing: "Riided",
  fixed: "Arved ja püsikulud",
  subscription: "Tellimused",
  other: "Muu",
};

export function labelCategory(
  key: KnownExpenseCategoryCode,
  locale: AppLocale,
) {
  const maps: Record<AppLocale, Record<KnownExpenseCategoryCode, string>> = {
    "sv-SE": sv,
    "en-US": en,
    "et-EE": et,
  };

  return (maps[locale] || en)[key];
}

const KNOWN: readonly KnownExpenseCategoryCode[] = [
  "housing",
  "food",
  "transport",
  "clothing",
  "fixed",
  "subscription",
  "other",
] as const;

export function asCategoryKey(raw: unknown): KnownExpenseCategoryCode {
  const s = String(raw ?? "")
    .trim()
    .toLowerCase();

  if (s === "fixed_expense" || s === "fixedexpense") {
    return "fixed";
  }

  return (KNOWN as readonly string[]).includes(s)
    ? (s as KnownExpenseCategoryCode)
    : "other";
}
