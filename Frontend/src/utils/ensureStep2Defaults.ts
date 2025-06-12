import { Step2FormValues } from "@/schemas/wizard/step2Schema";

export function ensureStep2Defaults(
  src: Partial<Step2FormValues> | undefined
): Step2FormValues {
  return {
    /* ---------- rent ---------- */
    rent: {
      homeType       : src?.rent?.homeType        ?? "",
      monthlyRent    : src?.rent?.monthlyRent     ?? 0,
      rentExtraFees  : src?.rent?.rentExtraFees   ?? null,
      monthlyFee     : src?.rent?.monthlyFee      ?? 0,
      brfExtraFees   : src?.rent?.brfExtraFees    ?? null,
      mortgagePayment: src?.rent?.mortgagePayment ?? 0,
      houseotherCosts: src?.rent?.houseotherCosts ?? null,
      otherCosts     : src?.rent?.otherCosts      ?? null,
    },

    /* ---------- food ---------- */
    food: {
      foodStoreExpenses: src?.food?.foodStoreExpenses ?? 0,
      takeoutExpenses  : src?.food?.takeoutExpenses   ?? 0,
    },

    /* ---------- utilities ---------- */
    utilities: {
      electricity: src?.utilities?.electricity ?? 0,
      water      : src?.utilities?.water       ?? 0,
    },

    /* ---------- fixed expenses ---------- */
    fixedExpenses: {
      electricity : src?.fixedExpenses?.electricity  ?? null,
      insurance   : src?.fixedExpenses?.insurance    ?? null,
      internet    : src?.fixedExpenses?.internet     ?? null,
      phone       : src?.fixedExpenses?.phone        ?? null,
      unionFees   : src?.fixedExpenses?.unionFees    ?? null,
      customExpenses:
        src?.fixedExpenses?.customExpenses?.map(e => ({
          id  : e?.id  ?? crypto.randomUUID(),
          name: e?.name ?? "",
          fee : e?.fee ?? null,
        })) ?? [],
    },

    /* ---------- transport ---------- */
    transport: {
      monthlyFuelCost: src?.transport?.monthlyFuelCost ?? 0,
      monthlyInsuranceCost: src?.transport?.monthlyInsuranceCost ?? 0,
      monthlyTotalCarCost: src?.transport?.monthlyTotalCarCost ?? 0,
      monthlyTransitCost: src?.transport?.monthlyTransitCost ?? 0,

    },

    /* ---------- clothing ---------- */
    clothing: {
      monthlyClothingCost: src?.clothing?.monthlyClothingCost ?? 0,
    },
  };
}
