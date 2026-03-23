import type { AppLocale } from "@/types/i18n/appLocale";
import type { DebtTemplate, DebtTemplateId } from "@/types/modal/debts";

type DebtTemplateDef = {
  id: DebtTemplateId;
  type: DebtTemplate["type"];
  balance: number;
  apr: number;
  termMonths?: number | null;
  monthlyFee?: number | null;
  minPayment?: number | null;
  label: {
    sv: string;
    en: string;
    et: string;
  };
};

const DEBT_TEMPLATE_DEFS: DebtTemplateDef[] = [
  {
    id: "credit_card",
    type: "revolving",
    balance: 25_000,
    apr: 18.9,
    minPayment: 750,
    monthlyFee: 0,
    label: {
      sv: "Kreditkort",
      en: "Credit card",
      et: "Krediitkaart",
    },
  },
  {
    id: "mortgage",
    type: "bank_loan",
    balance: 1_500_000,
    apr: 4.2,
    termMonths: 360,
    monthlyFee: 0,
    label: {
      sv: "Bolån",
      en: "Mortgage",
      et: "Kodulaen",
    },
  },
  {
    id: "car_loan",
    type: "bank_loan",
    balance: 180_000,
    apr: 6.5,
    termMonths: 84,
    monthlyFee: 45,
    label: {
      sv: "Billån",
      en: "Car loan",
      et: "Autolaen",
    },
  },
  {
    id: "personal_loan",
    type: "private",
    balance: 120_000,
    apr: 8.9,
    termMonths: 120,
    monthlyFee: 35,
    label: {
      sv: "Privatlån",
      en: "Personal loan",
      et: "Tarbimislaen",
    },
  },
  {
    id: "installment",
    type: "installment",
    balance: 18_000,
    apr: 0,
    termMonths: 24,
    monthlyFee: 29,
    label: {
      sv: "Avbetalning",
      en: "Installment plan",
      et: "Järelmaks",
    },
  },
];

export function getDebtTemplates(locale: AppLocale): DebtTemplate[] {
  const lang = locale.startsWith("sv")
    ? "sv"
    : locale.startsWith("et")
      ? "et"
      : "en";

  return DEBT_TEMPLATE_DEFS.map((template) => ({
    id: template.id,
    name: template.label[lang],
    type: template.type,
    balance: template.balance,
    apr: template.apr,
    termMonths: template.termMonths ?? null,
    monthlyFee: template.monthlyFee ?? null,
    minPayment: template.minPayment ?? null,
  }));
}
