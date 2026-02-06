export type DebtTemplateType = "revolving" | "bank_loan" | "installment" | "private";

export type DebtTemplateName =
    | "Kreditkort"
    | "Bolån"
    | "Billån"
    | "Privatlån"
    | "Avbetalning";

export type DebtTemplate = {
    name: DebtTemplateName;
    type: DebtTemplateType;

    /** Current balance */
    balance: number;

    /** APR percent, e.g. 19.95 */
    apr: number;

    /** Optional monthly fee (some credit products have this) */
    monthlyFee?: number;

    /** Revolving-specific: minimum payment per month */
    minPayment?: number;

    /** Term-based products */
    termMonths?: number;
};
