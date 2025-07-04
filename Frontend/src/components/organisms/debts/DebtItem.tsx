import React from "react";
import {
  useFormContext,
  Controller,
  FieldArrayWithId,
} from "react-hook-form";
import { Trash2, Info } from "lucide-react";

// Assuming Step4FormValues imports the final DebtItem type
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

const DebtItem: React.FC<DebtItemProps> = ({ index, onRemove }) => {
  const {
    control,
    watch,
    formState: { errors },
  } = useFormContext<Step4FormValues>();

  const base = `debts.${index}` as const;

  const typeHelpText =
    "Välj den kategori som bäst beskriver din skuld. Detta styr vilka fält som visas och hur beräkningar görs.";

  /* ---------- watch live values ---------- */
  const type = watch(`${base}.type`) as
    | "installment"
    | "revolving"
    | "private"
    | "bank_loan";
  const balance = watch(`${base}.balance`) ?? null;
  const apr = watch(`${base}.apr`) ?? null;
  const termMonths = watch(`${base}.termMonths`) ?? null;
  const monthlyFee = watch(`${base}.monthlyFee`) ?? null;

  /* ---------- calculations ---------- */
  const isAmortizing = type === "installment" || type === "bank_loan";
  const amortizationAmount = isAmortizing
    ? amortize(balance, apr, termMonths) ?? 0
    : 0;
  // The total monthly cost is the amortization plus any fixed fees.
  const totalMonthly =
    isAmortizing && amortizationAmount > 0
      ? amortizationAmount + (monthlyFee ?? 0)
      : null;
  const animatedPay = useAnimatedCounter(totalMonthly ?? 0);

  /* ---------- dynamic placeholders ---------- */
  const namePlaceholder =
    type === "bank_loan"
      ? "SBAB Bolån, Volvofinans Billån..."
      : type === "revolving"
      ? "Bank Norwegian, Amex..."
      : type === "installment"
      ? "Klarna, Elgiganten-köp..."
      : type === "private"
      ? "Lån från Pappa, skuld till vän..."
      : "Skuldens namn";

  return (
    <>
      <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-4">
        {/* ---------- NAME ---------- */}
        <div className="md:col-span-2">
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

        {/* ---------- TYPE SELECT ---------- */}
        <div className="md:col-span-2">
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
                  <option value="bank_loan">Banklån (Bolån, Billån, Privatlån)</option>
                  <option value="revolving">Kreditkort / Kontokredit</option>
                  <option value="installment">Avbetalning (Klarna, Snabblån)</option>
                  <option value="private">Privat lån (Familj, Vänner)</option>
                </select>
              )}
            />
          </HelpSection>
        </div>

        {/* ---------- BALANCE & APR ---------- */}
        <div className="md:col-span-2">
          <label htmlFor={idFromPath(`${base}.balance`)} className="mb-1.5 block text-xs font-medium text-white/70">
            Restbelopp (kr)
          </label>
          <Controller
            name={`${base}.balance`}
            control={control}
            render={({ field }) => (
              <FormattedNumberInput
                id={idFromPath(`${base}.balance`)}
                placeholder="25 000"
                error={errors.debts?.[index]?.balance?.message}
                value={field.value ?? null}
                onValueChange={field.onChange}
                name={field.name}
                ref={field.ref}
              />
            )}
          />
        </div>
        <div className="md:col-span-2">
          <label htmlFor={idFromPath(`${base}.apr`)} className="mb-1.5 block text-xs font-medium text-white/70">
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
        {(type === "installment" || type === "bank_loan") && (
          <div className="md:col-span-2">
            <label htmlFor={idFromPath(`${base}.termMonths`)} className="mb-1.5 block text-xs font-medium text-white/70">
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

        {(type === "installment" || type === "bank_loan") && (
            <div className="md:col-span-2">
                <label htmlFor={idFromPath(`${base}.monthlyFee`)} className="mb-1.5 block text-xs font-medium text-white/70">
                    Månadsavgift (kr)
                </label>
                <Controller
                  name={`${base}.monthlyFee`}
                  control={control}
                  render={({ field }) => (
                    <FormattedNumberInput
                        id={idFromPath(`${base}.monthlyFee`)}
                        placeholder="29"
                        error={errors.debts?.[index]?.monthlyFee?.message}
                        value={field.value ?? null}
                        onValueChange={field.onChange}
                        name={field.name}
                        ref={field.ref}
                    />
                  )}
                />
            </div>
        )}

        {type === "revolving" && (
          <div className="md:col-span-2">
            <label htmlFor={idFromPath(`${base}.minPayment`)} className="mb-1.5 block text-xs font-medium text-white/70">
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
      {totalMonthly !== null && (
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