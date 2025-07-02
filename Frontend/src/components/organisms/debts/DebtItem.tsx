/* src/components/organisms/debts/DebtItem.tsx */
import React from "react";
import {
  useFormContext,
  Controller,
  FieldArrayWithId,
} from "react-hook-form";
import { motion } from "framer-motion";
import { Trash2, Info } from "lucide-react";

import { Step4FormValues } from "@/types/Wizard/Step4FormValues";
import { amortize } from "@/utils/budget/financialCalculations";
import TextInput from "@/components/atoms/InputField/TextInput";
import FormattedNumberInput from "@/components/atoms/InputField/FormattedNumberInput";
import useAnimatedCounter from "@/hooks/useAnimatedCounter";
import { idFromPath } from "@/utils/idFromPath";
import HelpSection from "@/components/molecules/helptexts/HelpSection";

interface DebtItemProps {
  index: number;
  item: FieldArrayWithId<Step4FormValues, "debts", "fieldId">;
  onRemove: (i: number) => void;
}

/**
 * DebtItem for constrained spaces.
 * Uses a simple 2x3 grid layout on medium screens and up
 * to ensure fields don't become too cramped.
 * - md: grid-cols-4 for a balanced, vertical layout.
 */
const DebtItem: React.FC<DebtItemProps> = ({ index, onRemove }) => {
  const {
    control,
    watch,
    formState: { errors },
  } = useFormContext<Step4FormValues>();

  /* ---------- derived paths & helpers ---------- */
  const base = `debts.${index}` as const;
  const typeHelpText = "Välj typ av skuld. Avbetalningslån har fast löptid, banklån är flexibla, och privatlån är för informella lån (t.ex. från familj).";

  /* ---------- watch live values ---------- */
  const type = watch(`${base}.type`) as "installment" | "revolving" | "private";
  const balance = watch(`${base}.balance`) ?? null;
  const apr = watch(`${base}.apr`) ?? null;
  const termMonths = watch(`${base}.termMonths`) ?? null;

  const monthly =
    type === "installment" ? amortize(balance, apr, termMonths) : null;
  const animatedPay = useAnimatedCounter(monthly ?? 0);

  const namePlaceholder =
    type === "installment"
      ? "Klarna, privatlån .."
      : type === "revolving"
      ? "Banklån, Billån.."
      : type === "private"
      ? "Anhörig, vän .."
      : "Skuldens namn";
      
  return (
    <>
      {/* ---------------- form grid ---------------- */}

      <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-4">

        {/* ---------- NAME (Corrected) ---------- */}
        <div className="md:col-span-2">
          {/* This label now mimics the structure and padding inside HelpSection */}
          <label
            htmlFor={idFromPath(`${base}.name`)}
            className="block text-sm font-medium flex items-center gap-2 pb-2"
          >
            Skuldens namn
          </label>
          <Controller
            name={`${base}.name`}
            control={control}
            render={({ field }) => (
              <TextInput
                id={idFromPath(`${base}.name`)}
                placeholder={namePlaceholder}
                error={errors.debts?.[index]?.name?.message}
                {...field}
                value={field.value?.toString() ?? ""}
              />
            )}
          />
        </div>

        {/* ---------- TYPE SELECT (Corrected Usage) ---------- */}
        <div className="md:col-span-2">
          {/* Use HelpSection as a wrapper, passing the Controller as a child */}
          <HelpSection label="Typ av skuld" helpText={typeHelpText}>
            <Controller
              name={`${base}.type`}
              control={control}
              render={({ field }) => (
                <select
                  {...field}
                  id={idFromPath(`${base}.type`)}
                  className="h-11 w-full rounded-lg bg-slate-800/60 px-3 text-white"
                >
                  <option value="installment">Avbetalningslån</option>
                  <option value="revolving">Banklån</option>
                  <option value="private">Privatlån</option>
                </select>
              )}
            />
          </HelpSection>
        </div>

        {/* ---------- BALANCE ---------- */}
        {/* Change -> Spans 2 of 4 columns */}
        <div className="md:col-span-2">
          <label
            htmlFor={idFromPath(`${base}.balance`)}
            className="mb-1.5 block text-xs font-medium text-white/70"
          >
            Belopp (kr)
          </label>
          <Controller
            name={`${base}.balance`}
            control={control}
            render={({ field }) => (
              <FormattedNumberInput
                id={idFromPath(`${base}.balance`)}
                placeholder="25 000"
                error={errors.debts?.[index]?.balance?.message}
                value={field.value}
                onValueChange={field.onChange}
                name={field.name}
                ref={field.ref}
              />
            )}
          />
        </div>

        {/* ---------- APR ---------- */}
        {/* Change -> Spans 2 of 4 columns */}
        <div className="md:col-span-2">
          <label
            htmlFor={idFromPath(`${base}.apr`)}
            className="mb-1.5 block text-xs font-medium text-white/70"
          >
            Ränta (%)
          </label>
          <Controller
            name={`${base}.apr`}
            control={control}
            render={({ field }) => (
              <TextInput
                id={idFromPath(`${base}.apr`)}
                type="number"
                step="0.01"
                placeholder="8.5"
                error={errors.debts?.[index]?.apr?.message}
                {...field}
                value={field.value?.toString() ?? ""}
              />
            )}
          />
        </div>

        {/* ---------- CONDITIONAL FIELDS ---------- */}
        {type === "installment" && (
          // Change -> Spans 2 of 4 columns
          <div className="md:col-span-2">
            <label
              htmlFor={idFromPath(`${base}.termMonths`)}
              className="mb-1.5 block text-xs font-medium text-white/70"
            >
              Löptid (mån)
            </label>
            <Controller
              name={`${base}.termMonths`}
              control={control}
              render={({ field }) => (
                <TextInput
                  id={idFromPath(`${base}.termMonths`)}
                  type="number"
                  placeholder="36"
                  error={errors.debts?.[index]?.termMonths?.message}
                  {...field}
                  value={field.value?.toString() ?? ""}
                />
              )}
            />
          </div>
        )}

        {type === "revolving" && (
          // Change -> Spans 2 of 4 columns
          <div className="md:col-span-2">
            <label
              htmlFor={idFromPath(`${base}.minPayment`)}
              className="mb-1.5 block text-xs font-medium text-white/70"
            >
              Minsta betalning (kr)
            </label>
            <Controller
              name={`${base}.minPayment`}
              control={control}
              render={({ field }) => (
                <FormattedNumberInput
                  id={idFromPath(`${base}.minPayment`)}
                  placeholder="500"
                  error={errors.debts?.[index]?.minPayment?.message}
                  value={field.value ?? null}
                  onValueChange={field.onChange}
                  name={field.name}
                  ref={field.ref}
                />
              )}
            />
          </div>
        )}

        {/* ---------- REMOVE BUTTON ---------- */}
        {/* Change -> Spans 2 of 4 columns */}
        <div className="flex items-end md:col-span-2">
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="flex h-11 w-full items-center justify-center rounded-lg bg-red-600/80 transition hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400"
            aria-label="Ta bort skuld"
            title="Ta bort skuld"
          >
            <Trash2 size={18} className="text-white" />
          </button>
        </div>
      </div>

      {/* ---------- INSTALLMENT SUMMARY ---------- */}
      {monthly !== null && (
        <p className="mt-3 text-sm text-white/90">
          Beräknad månadsbetalning:&nbsp;
          <span className="font-semibold text-darkLimeGreen">
            {animatedPay.toLocaleString("sv-SE")} kr
          </span>
        </p>
      )}

      {/* ---------- INLINE INFO ---------- */}
      <div className="mt-4 flex items-center gap-2 border-t border-white/10 pt-3 text-xs text-white/60">
        <Info size={16} className="text-darkLimeGreen/80" />
        <span>Justera fritt – beräknad betalning uppdateras direkt.</span>
      </div>
    </>
  );
};

export default DebtItem;