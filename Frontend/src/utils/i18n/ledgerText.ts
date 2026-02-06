import type { AppLocale } from "@/utils/i18n/locale";
// 1) Define the shape (keys) once
type LedgerText = {
    show: string;
    hide: string;

    income: string;
    expenses: string;
    savings: string;
    debts: string;
    result: string;

    netSalary: string;
    householdTotal: string;
    householdMemberFallback: string;
    sideIncomeTotal: string;
    sideIncomeFallback: string;
    totalIncomePerMonth: string;

    totalExpensesPerMonth: string;
    total: string;

    savingsHabit: string;
    savingsGoals: string;
    totalSavingsPerMonth: string;
    savingsGoalFallback: string;

    debtPaymentsPerMonth: string;
    totalDebtBalance: string;
    debtFallback: string;

    monthlyResult: string;
};

export const svLedgerText = {
    show: "Visa fullständig detaljsummering",
    hide: "Dölj detaljerad summering",

    income: "Inkomster",
    expenses: "Utgifter",
    savings: "Sparande",
    debts: "Skulder",
    result: "Resultat",

    netSalary: "Nettolön",
    householdTotal: "Hushållsinkomster totalt",
    householdMemberFallback: "Hushållsmedlem",
    sideIncomeTotal: "Sidoinkomster totalt",
    sideIncomeFallback: "Sidoinkomst",
    totalIncomePerMonth: "Total inkomst / månad",

    totalExpensesPerMonth: "Totala utgifter / månad",
    total: "Totalt",

    savingsHabit: "Månadssparande (vana)",
    savingsGoals: "Månadssparande (mål)",
    totalSavingsPerMonth: "Totalt sparande / månad",
    savingsGoalFallback: "Sparmål",

    debtPaymentsPerMonth: "Skuldbetalningar / månad",
    totalDebtBalance: "Totalt skuldsaldo",
    debtFallback: "Namnlös skuld",

    monthlyResult: "Månadsresultat",
} satisfies LedgerText;

export const enLedgerText = {
    show: "Show detailed breakdown",
    hide: "Hide detailed breakdown",

    income: "Income",
    expenses: "Expenses",
    savings: "Savings",
    debts: "Debts",
    result: "Result",

    netSalary: "Net salary",
    householdTotal: "Household income total",
    householdMemberFallback: "Household member",
    sideIncomeTotal: "Side income total",
    sideIncomeFallback: "Side income",
    totalIncomePerMonth: "Total income / month",

    totalExpensesPerMonth: "Total expenses / month",
    total: "Total",

    savingsHabit: "Monthly savings (habit)",
    savingsGoals: "Monthly savings (goals)",
    totalSavingsPerMonth: "Total savings / month",
    savingsGoalFallback: "Savings goal",

    debtPaymentsPerMonth: "Debt payments / month",
    totalDebtBalance: "Total debt balance",
    debtFallback: "Unnamed debt",

    monthlyResult: "Monthly result",
} satisfies LedgerText;

// 2) Translator helper
export function tLedger<K extends keyof LedgerText>(key: K, locale: AppLocale) {
    return (locale === "sv-SE" ? svLedgerText : enLedgerText)[key];
}
