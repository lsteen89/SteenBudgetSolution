import { sumArray } from "@/utils/wizard/wizardHelpers";
import type { ExpenditureFormValues } from "@/types/Wizard/ExpenditureFormValues";

export function getExpenditureCategoryTotals(expenditure: Partial<ExpenditureFormValues>) {
    const housing = sumArray([
        expenditure.rent?.monthlyRent,
        expenditure.rent?.rentExtraFees,
        expenditure.rent?.monthlyFee,
        expenditure.rent?.brfExtraFees,
        expenditure.rent?.mortgagePayment,
        expenditure.rent?.houseotherCosts,
        expenditure.rent?.otherCosts,
    ]);

    const transport = sumArray([
        expenditure.transport?.monthlyFuelCost,
        expenditure.transport?.monthlyInsuranceCost,
        expenditure.transport?.monthlyTotalCarCost,
        expenditure.transport?.monthlyTransitCost,
    ]);

    const food = sumArray([
        expenditure.food?.foodStoreExpenses,
        expenditure.food?.takeoutExpenses,
    ]);

    const fixed = sumArray([
        expenditure.fixedExpenses?.electricity,
        expenditure.fixedExpenses?.insurance,
        expenditure.fixedExpenses?.internet,
        expenditure.fixedExpenses?.phone,
        expenditure.fixedExpenses?.unionFees,
        ...(expenditure.fixedExpenses?.customExpenses?.map((e) => e?.cost) ?? []),
    ]);

    const subscriptions = sumArray([
        expenditure.subscriptions?.netflix,
        expenditure.subscriptions?.spotify,
        expenditure.subscriptions?.hbomax,
        expenditure.subscriptions?.viaplay,
        expenditure.subscriptions?.disneyPlus,
        ...(expenditure.subscriptions?.customSubscriptions?.map((s) => s?.cost) ?? []),
    ]);

    // “Rörliga” (right now you only have clothing, so keep it pure)
    const variable = sumArray([
        expenditure.clothing?.monthlyClothingCost,
    ]);

    const total = housing + transport + food + fixed + subscriptions + variable;

    return { housing, transport, food, fixed, subscriptions, variable, total };
}
