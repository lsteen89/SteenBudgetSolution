import React from "react";
import OptionContainer from "@components/molecules/containers/OptionContainer";
import { useWizardDataStore } from "@/stores/Wizard/wizardDataStore";

const numberFormat = (val: number | null | undefined) =>
  typeof val === "number" && !isNaN(val) ? val.toLocaleString("sv-SE") + " kr" : "0 kr";

const SubStepConfirm: React.FC = () => {
  const expenditure = useWizardDataStore((s) => s.data.expenditure);

  const rent = expenditure.rent || {};
  const food = expenditure.food || {};
  const utilities = expenditure.utilities || {};
  const fixedExpenses = expenditure.fixedExpenses || {};
  const transport = expenditure.transport || {};
  const clothing = expenditure.clothing || {};
  const subscriptions = expenditure.subscriptions || {};

  const sumArray = (arr: (number | null | undefined)[]) =>
    arr.reduce((acc, n) => acc + (typeof n === "number" && !isNaN(n) ? n : 0), 0);

  const rentTotal = sumArray([
    rent.monthlyRent,
    rent.rentExtraFees,
    rent.monthlyFee,
    rent.brfExtraFees,
    rent.mortgagePayment,
    rent.houseotherCosts,
    rent.otherCosts,
  ]);
  const foodTotal = sumArray([food.foodStoreExpenses, food.takeoutExpenses]);
  const utilitiesTotal = sumArray([utilities.electricity, utilities.water]);
  const fixedExpensesTotal = sumArray([
    fixedExpenses.insurance,
    fixedExpenses.electricity,
    fixedExpenses.internet,
    fixedExpenses.phone,
    fixedExpenses.unionFees,
    ...(fixedExpenses.customExpenses?.map((e: any) => e?.fee) || []),
  ]);
  const transportTotal = sumArray([
    transport.monthlyFuelCost,
    transport.monthlyInsuranceCost,
    transport.monthlyTotalCarCost,
    transport.monthlyTransitCost,
  ]);
  const clothingTotal = sumArray([clothing.monthlyClothingCost]);
  const subscriptionsTotal = sumArray([
    subscriptions.netflix,
    subscriptions.spotify,
    subscriptions.hbomax,
    subscriptions.viaplay,
    subscriptions.disneyPlus,
    ...(subscriptions.customSubscriptions?.map((s: any) => s?.cost) || []),
  ]);
  const grandTotal = sumArray([
    rentTotal,
    foodTotal,
    utilitiesTotal,
    fixedExpensesTotal,
    transportTotal,
    clothingTotal,
    subscriptionsTotal,
  ]);

  return (
    <OptionContainer>
      <section className="space-y-6 text-white">
        <h3 className="text-2xl font-bold text-center text-darkLimeGreen">
          Sammanfattning av utgifter
        </h3>
        <div className="space-y-4">
          <div className="bg-white/10 p-4 rounded-xl">
            <h4 className="font-semibold mb-1">Boende</h4>
            <p>Totalt: {numberFormat(rentTotal)}</p>
          </div>
          <div className="bg-white/10 p-4 rounded-xl">
            <h4 className="font-semibold mb-1">Mat</h4>
            <p>Totalt: {numberFormat(foodTotal)}</p>
          </div>
          <div className="bg-white/10 p-4 rounded-xl">
            <h4 className="font-semibold mb-1">Fasta utgifter</h4>
            <p>Totalt: {numberFormat(fixedExpensesTotal)}</p>
          </div>
          <div className="bg-white/10 p-4 rounded-xl">
            <h4 className="font-semibold mb-1">Rörliga kostnader</h4>
            <p>Transport: {numberFormat(transportTotal)}</p>
            <p>Kläder: {numberFormat(clothingTotal)}</p>
            <p>Prenumerationer: {numberFormat(subscriptionsTotal)}</p>
          </div>
        </div>
        <div className="text-center pt-4 border-t border-white/20">
          <p className="text-lg font-bold">Totala utgifter per månad: {numberFormat(grandTotal)}</p>
        </div>
      </section>
    </OptionContainer>
  );
};

export default SubStepConfirm;
