import type { AppLocale } from "@/types/i18n/appLocale";
import type { GoalTemplate, GoalTemplateId } from "@/types/modal/savings";

const toYMD = (d: Date) => d.toISOString().slice(0, 10);

const getFutureDate = (yearsToAdd: number): string => {
  const today = new Date();
  today.setFullYear(today.getFullYear() + yearsToAdd);
  return toYMD(today);
};

type GoalTemplateDef = {
  id: GoalTemplateId;
  targetAmount: number;
  targetDate: string;
  label: {
    sv: string;
    en: string;
    et: string;
  };
};

const GOAL_TEMPLATE_DEFS: GoalTemplateDef[] = [
  {
    id: "sun_trip",
    targetAmount: 25_000,
    targetDate: getFutureDate(1),
    label: {
      sv: "Resa till solen",
      en: "Sunny vacation",
      et: "Päikesereis",
    },
  },
  {
    id: "buffer",
    targetAmount: 50_000,
    targetDate: getFutureDate(2),
    label: {
      sv: "Buffert",
      en: "Emergency fund",
      et: "Puhver",
    },
  },
  {
    id: "new_car",
    targetAmount: 75_000,
    targetDate: getFutureDate(3),
    label: {
      sv: "Ny bil",
      en: "New car",
      et: "Uus auto",
    },
  },
  {
    id: "down_payment",
    targetAmount: 150_000,
    targetDate: getFutureDate(5),
    label: {
      sv: "Kontantinsats",
      en: "Down payment",
      et: "Sissemakse",
    },
  },
];

export function getGoalTemplates(locale: AppLocale): GoalTemplate[] {
  const lang = locale.startsWith("sv")
    ? "sv"
    : locale.startsWith("et")
      ? "et"
      : "en";

  return GOAL_TEMPLATE_DEFS.map((template) => ({
    id: template.id,
    name: template.label[lang],
    targetAmount: template.targetAmount,
    targetDate: template.targetDate,
  }));
}
