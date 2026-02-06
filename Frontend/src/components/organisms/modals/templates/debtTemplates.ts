import type { DebtTemplate } from "@/types/modal/debts";

export const debtTemplates: DebtTemplate[] = [
    {
        name: "Kreditkort",
        type: "revolving",
        balance: 15_000,
        apr: 19.95,
        monthlyFee: 0,
        minPayment: 500,
    },
    {
        name: "Bolån",
        type: "bank_loan",
        balance: 2_500_000,
        apr: 4.25,
        monthlyFee: 0,
        termMonths: 360,
    },
    {
        name: "Billån",
        type: "installment",
        balance: 220_000,
        apr: 6.95,
        monthlyFee: 0,
        termMonths: 84,
    },
    {
        name: "Privatlån",
        type: "bank_loan",
        balance: 80_000,
        apr: 9.9,
        monthlyFee: 0,
        termMonths: 60,
    },
    {
        name: "Avbetalning",
        type: "installment",
        balance: 25_000,
        apr: 12.9,
        monthlyFee: 39,
        termMonths: 24,
    },
];
