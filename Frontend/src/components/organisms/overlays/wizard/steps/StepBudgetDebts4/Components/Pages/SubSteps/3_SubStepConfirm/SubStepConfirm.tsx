import React, { useEffect, useMemo } from "react";
import { useFormContext } from "react-hook-form";
import { motion } from "framer-motion";
import { CircleSlash, Landmark, CreditCard, Receipt, AlertTriangle } from "lucide-react";

import { useWizardDataStore } from "@/stores/Wizard/wizardDataStore";
import { DebtsFormValues } from "@/types/Wizard/DebtFormValues";
import { idFromPath } from "@/utils/idFromPath";
import { summariseDebts } from "@/utils/budget/debtCalculations";
import StatCard from "@/components/molecules/cards/StatCard";
import PathCard from "@/components/organisms/debts/PathCard";
import { DebtCategoryCard } from "@/components/organisms/debts/DebtCategoryCard";

const SubStepConfirm: React.FC = () => {
  const { data } = useWizardDataStore();

  const {
    watch,
    setValue,
    formState: { errors },
    // Optional: use getValues if you prefer reading current values inside effects without causing re-renders
    // getValues,
  } = useFormContext<DebtsFormValues>();

  // ---- Hydrate RHF from store/DB on first render (or when store changes) ----
  useEffect(() => {
    const storeDebts = data.debts?.debts ?? [];
    const storeStrategy = data.debts?.summary?.repaymentStrategy;

    // If the form has no debts yet but store does, hydrate without marking dirty
    const formDebts = watch("debts");
    if ((!formDebts || formDebts.length === 0) && storeDebts.length > 0) {
      setValue("debts", storeDebts, { shouldDirty: false, shouldValidate: true });
    }

    // If the form has no strategy yet but store does, hydrate it
    const formStrategy = watch("summary.repaymentStrategy");
    if (!formStrategy && storeStrategy) {
      setValue("summary.repaymentStrategy", storeStrategy, {
        shouldDirty: false,
        shouldValidate: true,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.debts, setValue]); // <-- don't include watch in deps to avoid loops

  // ---- Always compute metrics from RHF, not from store ----
  const formDebts = watch("debts") ?? [];
  const metrics = useMemo(() => summariseDebts(formDebts), [formDebts]);

  const fieldPath = "summary.repaymentStrategy";
  const fieldId = idFromPath(fieldPath);
  const repaymentStrategy = watch(fieldPath);

  return (
    <section className="mx-auto max-w-5xl space-y-10 py-10">
      {/* I. Grand Tally */}
      <div className="grid grid-cols-1 gap-6 px-4 sm:grid-cols-2 lg:grid-cols-1">
        <StatCard label="Total skuld" value={metrics.total.toLocaleString("sv-SE")} suffix="kr" />
        <StatCard label="Totala månadsbetalningar" value={metrics.totalMonthlyPayment.toLocaleString("sv-SE")} suffix="kr/mån" />
        <StatCard label="Genomsnittlig ränta" value={metrics.avgApr.toFixed(1)} suffix="%" />
      </div>

      {/* II. Lay of the Land */}
      <div className="space-y-6">
        {metrics.revolvingDebts.count > 0 && (
          <DebtCategoryCard icon={<CreditCard />} title="Kontokrediter" summary={metrics.revolvingDebts} />
        )}
        {metrics.bankLoanDebts.count > 0 && (
          <DebtCategoryCard icon={<Landmark />} title="Banklån" summary={metrics.bankLoanDebts} />
        )}
        {metrics.installmentDebts.count > 0 && (
          <DebtCategoryCard icon={<Receipt />} title="Delbetalningar" summary={metrics.installmentDebts} />
        )}
      </div>

      {/* III. Choosing the Path */}
      <div id={fieldId} className="px-4 scroll-mt-24">
        <h3 className="mb-6 text-xl font-bold text-white">Välj din väg framåt</h3>
        <div className="grid gap-6 sm:grid-cols-1">
          <PathCard
            selected={repaymentStrategy === "avalanche"}
            icon="mountain"
            title="Lavinen"
            onSelect={() =>
              setValue("summary.repaymentStrategy", "avalanche", {
                shouldValidate: true,
                shouldDirty: true,
              })
            }
            subtitle="Fokusera extra pengar på högsta räntan först."
            firstTarget={metrics.highestApr?.name ?? "N/A"}
          />
          <PathCard
            selected={repaymentStrategy === "snowball"}
            icon="footsteps"
            title="Snöbollen"
            onSelect={() =>
              setValue("summary.repaymentStrategy", "snowball", {
                shouldValidate: true,
                shouldDirty: true,
              })
            }
            subtitle="Börja med minsta skulden för snabb seger."
            firstTarget={metrics.smallestBalance?.name ?? "N/A"}
          />
          <PathCard
            selected={repaymentStrategy === "noAction"}
            icon="none"
            title="Ingen preferens"
            onSelect={() =>
              setValue("summary.repaymentStrategy", "noAction", {
                shouldValidate: true,
                shouldDirty: true,
              })
            }
            subtitle="Jag vill inte välja en strategi nu och fortsätter med minimibetalningar."
            firstTarget={"Du kan alltid ändra senare"}
          />
        </div>

        {errors.summary?.repaymentStrategy && (
          <div className="mt-4 flex items-center gap-2 text-red-500">
            <AlertTriangle className="h-5 w-5" />
            <p className="text-sm font-medium">{errors.summary.repaymentStrategy.message}</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default SubStepConfirm;