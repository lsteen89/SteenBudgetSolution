import type { supportDict } from "@/utils/i18n/pages/private/support/support.i18n";

export type SupportKey = keyof typeof supportDict.sv;

export type SupportT = <K extends SupportKey>(k: K) => string;

export const supportCategoryValues = [
  "budget-help",
  "shared-budget",
  "bug-report",
  "other",
] as const;

export type SupportCategory = (typeof supportCategoryValues)[number];

export type ContactSupportFormValues = {
  category: string;
  subject: string;
  body: string;
};
