import React from 'react';
// Import Controller
import { useFormContext, FieldArrayWithId, Controller } from 'react-hook-form'; 
import { motion } from 'framer-motion';
import { Trash2, Info } from 'lucide-react';

import { FormValues } from '@/types/budget/goalTypes';
import { calculateMonthlyContribution, calcProgress } from '@/utils/budget/financialCalculations';
import useAnimatedCounter from '@/hooks/useAnimatedCounter';

import TextInput from '@/components/atoms/InputField/TextInput';
import FormattedNumberInput from "@/components/atoms/InputField/FormattedNumberInput";
import { idFromPath } from '@/utils/idFromPath';

interface GoalItemProps {
    index: number;
    item: FieldArrayWithId<FormValues, "goals", "fieldId">;
    onRemove: (index: number) => void;
}

const GoalItem: React.FC<GoalItemProps> = ({ index, item, onRemove }) => {
    // We only need 'control', 'watch', and 'errors' now. No more 'setValue'!
    const { control, watch, formState: { errors } } = useFormContext<FormValues>();
    const base = `goals.${index}` as const;

    // 'watch' is still the perfect tool for calculations that depend on form values.
    const targetAmount = watch(`${base}.targetAmount`);
    const amountSaved = watch(`${base}.amountSaved`);
    const targetDateString = watch(`${base}.targetDate`);

    const dateObject = targetDateString ? new Date(targetDateString) : null;
    const monthly = calculateMonthlyContribution(targetAmount, amountSaved, dateObject);
    const progress = calcProgress(targetAmount, amountSaved);
    const animatedMonthly = useAnimatedCounter(monthly ?? 0);

    return (
        <>
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-6">
                
                {/* ROW 1: THE NAME. */}
                <div className="md:col-span-6">
                    <label htmlFor={idFromPath(`${base}.name`)} className="block text-xs font-medium text-white/70 mb-1.5">Målets namn</label>
                    <Controller
                        name={`${base}.name`}
                        control={control}
                        render={({ field }) => (
                            <TextInput
                                id={idFromPath(`${base}.name`)}
                                placeholder="T.ex. Resa till Sicilien"
                                error={errors.goals?.[index]?.name?.message}
                                {...field} // Spreads onChange, onBlur, value, ref
                            />
                        )}
                    />
                </div>

                {/* ROW 2: THE MONEY TEAM. */}
                <div className="md:col-span-3">
                    <label htmlFor={idFromPath(`${base}.targetAmount`)} className="block text-xs font-medium text-white/70 mb-1.5">Målbelopp (kr)</label>
                    <Controller
                        name={`${base}.targetAmount`}
                        control={control}
                        render={({ field }) => (
                            <FormattedNumberInput
                                id={idFromPath(`${base}.targetAmount`)}
                                placeholder="50 000"
                                error={errors.goals?.[index]?.targetAmount?.message}
                                // Connect Controller to FormattedNumberInput's specific props
                                value={field.value}
                                onValueChange={field.onChange}
                                name={field.name}
                                ref={field.ref}
                            />
                        )}
                    />
                </div>
                
                <div className="md:col-span-3">
                    <label htmlFor={idFromPath(`${base}.amountSaved`)} className="block text-xs font-medium text-white/70 mb-1.5">Redan sparat (kr)</label>
                    <Controller
                        name={`${base}.amountSaved`}
                        control={control}
                        render={({ field }) => (
                            <FormattedNumberInput
                                id={idFromPath(`${base}.amountSaved`)}
                                placeholder="Valfritt"
                                error={errors.goals?.[index]?.amountSaved?.message}
                                value={field.value}
                                onValueChange={field.onChange}
                                name={field.name}
                                ref={field.ref}
                            />
                        )}
                    />
                </div>

                {/* ROW 3: THE ACTION TEAM - THE FIX IS HERE! */}
                <div className="md:col-span-4">
                    <label htmlFor={idFromPath(`${base}.targetDate`)} className="block text-xs font-medium text-white/70 mb-1.5">Måldatum</label>
                    <Controller
                        name={`${base}.targetDate`}
                        control={control}
                        render={({ field }) => {
                            // Format the date from "YYYY-MM-DDTHH:mm:ss" to "YYYY-MM-DD" for the input
                            const dateValue = field.value ? field.value.split('T')[0] : '';
                            return (
                                <TextInput
                                    id={idFromPath(`${base}.targetDate`)}
                                    type="date"
                                    error={errors.goals?.[index]?.targetDate?.message}
                                    {...field}
                                    value={dateValue}
                                />
                            );
                        }}
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

            {/* --- The rest of your component remains the same --- */}
            <div className="mt-6 space-y-2">
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/20">
                    <motion.div layout className="h-full rounded-full bg-darkLimeGreen" style={{ width: `${progress}%` }} transition={{ type: "spring", stiffness: 100, damping: 20 }} />
                </div>
                <div className="flex items-center justify-between text-sm text-white/80">
                    <span>Sparat: <span className="font-semibold">{amountSaved?.toLocaleString("sv-SE") ?? 0} kr</span></span>
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