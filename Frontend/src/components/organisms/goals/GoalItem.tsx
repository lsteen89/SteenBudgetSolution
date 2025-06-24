import React from 'react';
import { useFormContext, FieldArrayWithId } from 'react-hook-form';
import { motion } from 'framer-motion';
import { Trash2, Info } from 'lucide-react';

import { FormValues } from '@/types/budget/goalTypes';
import { calcMonthly, calcProgress } from '@/utils/budget/goalCalculations';
import useAnimatedCounter from '@/hooks/useAnimatedCounter';

import TextInput from '@/components/atoms/InputField/TextInput';
import FormattedNumberInput from "@components/atoms/InputField/FormattedNumberInput";
import { idFromPath } from '@/utils/idFromPath';
import GoalContainer from "@/components/molecules/containers/GoalContainer";

interface GoalItemProps {
    index: number;
    item: FieldArrayWithId<FormValues, "goals", "fieldId">;
    onRemove: (index: number) => void;
}

const GoalItem: React.FC<GoalItemProps> = ({ index, item, onRemove }) => {
    const { watch, setValue, formState: { errors } } = useFormContext<FormValues>();
    const base = `goals.${index}` as const;

    const target = watch(`${base}.targetAmount`);
    const saved = watch(`${base}.amountSaved`);
    const date = watch(`${base}.targetDate`);

    const monthly = calcMonthly(target, saved, date);
    const progress = calcProgress(target, saved);
    const animatedMonthly = useAnimatedCounter(monthly ?? 0);

    return (
        <>
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-6">
                
                {/* ROW 1: THE NAME. Gets all 6 columns. */}
                <div className="md:col-span-6">
                    <label htmlFor={idFromPath(`${base}.name`)} className="block text-xs font-medium text-white/70 mb-1.5">Målets namn</label>
                    <TextInput
                        id={idFromPath(`${base}.name`)}
                        value={watch(`${base}.name`) || ""}
                        onChange={(e) => setValue(`${base}.name`, e.target.value, { shouldValidate: true, shouldDirty: true })}
                        placeholder="T.ex. Resa till Sicilien"
                        error={errors.goals?.[index]?.name?.message}
                        name={`${base}.name`}
                    />
                </div>

                {/* ROW 2: THE MONEY TEAM. They split the 6 columns 3 and 3. */}
                <div className="md:col-span-3">
                    <label htmlFor={idFromPath(`${base}.targetAmount`)} className="block text-xs font-medium text-white/70 mb-1.5">Målbelopp (kr)</label>
                    <FormattedNumberInput
                        id={idFromPath(`${base}.targetAmount`)}
                        value={target}
                        onValueChange={(val) => setValue(`${base}.targetAmount`, val, { shouldValidate: true, shouldDirty: true })}
                        placeholder="50 000"
                        error={errors.goals?.[index]?.targetAmount?.message}
                        name={`${base}.targetAmount`}
                    />
                </div>
                
                <div className="md:col-span-3">
                    <label htmlFor={idFromPath(`${base}.amountSaved`)} className="block text-xs font-medium text-white/70 mb-1.5">Redan sparat (kr)</label>
                    <FormattedNumberInput
                        id={idFromPath(`${base}.amountSaved`)}
                        value={saved}
                        onValueChange={(val) => setValue(`${base}.amountSaved`, val, { shouldValidate: true, shouldDirty: true })}
                        placeholder="Valfritt"
                        error={errors.goals?.[index]?.amountSaved?.message}
                        name={`${base}.amountSaved`}
                    />
                </div>

                {/* ROW 3: THE ACTION TEAM. We split this 4 and 2. */}
                <div className="md:col-span-4">
                    <label htmlFor={idFromPath(`${base}.targetDate`)} className="block text-xs font-medium text-white/70 mb-1.5">Måldatum</label>
                    <TextInput
                        id={idFromPath(`${base}.targetDate`)}
                        type="date"
                        value={date || ""}
                        onChange={(e) => setValue(`${base}.targetDate`, e.target.value, { shouldValidate: true, shouldDirty: true })}
                        error={errors.goals?.[index]?.targetDate?.message}
                        name={`${base}.targetDate`}
                    />
                </div>
                
                <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-white/70 mb-1.5 opacity-0">Ta bort</label>
                    <button 
                        type="button" 
                        onClick={() => onRemove(index)} 
                        className="flex h-11 w-full items-center justify-center rounded-lg bg-red-600/80 transition hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400" 
                        aria-label="Ta bort mål"
                    >
                        <Trash2 size={18} className="text-white" />
                    </button>
                </div>
            </div>

            <div className="mt-6 space-y-2">
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/20">
                    <motion.div layout className="h-full rounded-full bg-darkLimeGreen" style={{ width: `${progress}%` }} transition={{ type: "spring", stiffness: 100, damping: 20 }} />
                </div>
                <div className="flex items-center justify-between text-sm text-white/80">
                    <span>Sparat: <span className="font-semibold">{saved?.toLocaleString("sv-SE") ?? 0} kr</span></span>
                    <span>{progress}% klart</span>
                </div>
                {monthly !== null && (
                    <p className="text-sm text-white/90">Månadssparande: <span className="ml-1.5 font-semibold text-darkLimeGreen">{animatedMonthly.toLocaleString("sv-SE")} kr/mån</span></p>
                )}
            </div>
            <div className="mt-4 border-t border-white/10 pt-3">
                <div className="flex items-center gap-2 text-xs text-white/60">
                    <Info size={16} className="text-darkLimeGreen/80" />
                    <span>Glöm inte, du kan närsomhelst justera ditt mål senare.</span>
                </div>
            </div>
        </>
    );
};

export default GoalItem;