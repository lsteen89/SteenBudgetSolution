import type { CategoryKey } from "@/utils/i18n/categories";

export type WizardExpenseConfirmPreview = {
    incomeTotal: number;
    grandTotal: number;
    remaining: number;
    categories: WizardExpenseConfirmCategory[];
};

export type WizardExpenseConfirmCategory = {
    key: CategoryKey;
    title: string;
    total: number;
    items: WizardExpenseConfirmLineItem[];
};

export type WizardExpenseConfirmLineItem = {
    title: string;
    amount: number;
};
