import { Step2FormValues } from "@/schemas/wizard/StepExpenditures/step2Schema";

const toNumberOrNull = (v: unknown): number | null => {
  if (v === "" || v === undefined || v === null) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

const toNumberOrZero = (v: unknown): number => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

export function ensureStep2Defaults(
  src: Partial<Step2FormValues> | undefined
): Step2FormValues {
  const s = src ?? {};

  return {
    housing: {
      homeType: s.housing?.homeType ?? "rent",

      payment: {
        monthlyRent: toNumberOrNull(s.housing?.payment?.monthlyRent),
        monthlyFee: toNumberOrNull(s.housing?.payment?.monthlyFee),
        extraFees: toNumberOrNull(s.housing?.payment?.extraFees),
      },

      runningCosts: {
        electricity: toNumberOrNull(s.housing?.runningCosts?.electricity),
        heating: toNumberOrNull(s.housing?.runningCosts?.heating),
        water: toNumberOrNull(s.housing?.runningCosts?.water),
        waste: toNumberOrNull(s.housing?.runningCosts?.waste),
        other: toNumberOrNull(s.housing?.runningCosts?.other),
      },
    },

    food: {
      foodStoreExpenses: toNumberOrZero(s.food?.foodStoreExpenses),
      takeoutExpenses: toNumberOrZero(s.food?.takeoutExpenses),
    },

    fixedExpenses: {
      electricity: toNumberOrNull(s.fixedExpenses?.electricity),
      insurance: toNumberOrNull(s.fixedExpenses?.insurance),
      internet: toNumberOrNull(s.fixedExpenses?.internet),
      phone: toNumberOrNull(s.fixedExpenses?.phone),

      customExpenses:
        s.fixedExpenses?.customExpenses?.map((e) => ({
          id: e?.id ?? crypto.randomUUID(),
          name: e?.name ?? "",
          cost: toNumberOrNull(e?.cost),
        })) ?? [],
    },

    transport: {
      fuelOrCharging: src?.transport?.fuelOrCharging ?? null,
      carInsurance: src?.transport?.carInsurance ?? null,
      parkingFee: src?.transport?.parkingFee ?? null,
      otherCarCosts: src?.transport?.otherCarCosts ?? null,
      publicTransit: src?.transport?.publicTransit ?? null,
    },

    clothing: {
      monthlyClothingCost: toNumberOrZero(s.clothing?.monthlyClothingCost),
    },

    subscriptions: {
      netflix: toNumberOrNull(s.subscriptions?.netflix),
      spotify: toNumberOrNull(s.subscriptions?.spotify),
      hbomax: toNumberOrNull(s.subscriptions?.hbomax),
      viaplay: toNumberOrNull(s.subscriptions?.viaplay),
      disneyPlus: toNumberOrNull(s.subscriptions?.disneyPlus),

      // ✅ cost must be number (not null)
      customSubscriptions:
        s.subscriptions?.customSubscriptions?.map((x) => ({
          id: x?.id ?? crypto.randomUUID(),
          name: x?.name ?? "",
          cost: toNumberOrNull(x?.cost), // ✅ null is the only safe empty state
        })) ?? [],
    },
  };
}
