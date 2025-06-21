import React, { useState } from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import { motion } from 'framer-motion';
import { PlusCircle, Trash2 } from 'lucide-react';

import OptionContainer from '@components/molecules/containers/OptionContainer';
import TextInput from '@components/atoms/InputField/TextInput';
import FormattedNumberInput from '@components/atoms/InputField/FormattedNumberInput';
import { idFromPath } from '@/utils/idFromPath';
import { Step3FormValues } from '@/schemas/wizard/StepSavings/step3Schema';

const calcMonthly = (target: number | null, saved: number | null, date: string): number | null => {
  if (!target || !date) return null;
  const remaining = target - (saved ?? 0);
  if (remaining <= 0) return 0;
  const now = new Date();
  const end = new Date(date);
  const months = (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth()) + 1;
  if (months <= 0) return null;
  return Math.ceil(remaining / months);
};

const SubStepGoals: React.FC = () => {
  const { control, watch, setValue, formState: { errors } } = useFormContext<Step3FormValues>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'goals',
    keyName: 'fieldId',
    shouldUnregister: true,
  });

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleAdd = () => {
    append({ id: crypto.randomUUID(), name: '', targetAmount: null, targetDate: '', amountSaved: null });
  };

  return (
    <OptionContainer>
      <section className="w-auto mx-auto sm:px-6 lg:px-12 py-8 pb-safe space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold text-darkLimeGreen">Sparmål</h3>
          <button
            type="button"
            onClick={handleAdd}
            className="flex items-center gap-2 px-3 py-1 bg-limeGreen text-black rounded-md"
          >
            <PlusCircle size={18} /> Lägg till mål
          </button>
        </div>

        <div className="space-y-4">
          {fields.map((item, index) => {
            const base = `goals.${index}`;
            const target = watch(`${base}.targetAmount` as const);
            const saved = watch(`${base}.amountSaved` as const);
            const date = watch(`${base}.targetDate` as const);
            const monthly = calcMonthly(target, saved, date);

            return (
              <motion.div
                key={item.fieldId}
                layout
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={deletingId === item.fieldId ? 'exit' : 'animate'}
                variants={{ animate: { opacity: 1, scale: 1, y: 0 }, exit: { opacity: 0, scale: 0.8, x: -300 } }}
                onAnimationComplete={() => { if (deletingId === item.fieldId) remove(index); }}
                className="bg-white/10 rounded-xl p-4 space-y-3"
              >
                <div className="grid md:grid-cols-5 gap-3">
                  <TextInput
                    id={idFromPath(`${base}.name`)}
                    value={watch(`${base}.name`) || ''}
                    onChange={(e) => setValue(`${base}.name`, e.target.value, { shouldValidate: true, shouldDirty: true })}
                    placeholder="Namn på mål"
                    error={(errors.goals as any)?.[index]?.name?.message}
                    name={`${base}.name`}
                    className="md:col-span-2"
                  />
                  <FormattedNumberInput
                    id={idFromPath(`${base}.targetAmount`)}
                    value={target ?? null}
                    onValueChange={(val) => setValue(`${base}.targetAmount`, val ?? null, { shouldValidate: true, shouldDirty: true })}
                    placeholder="Belopp"
                    error={(errors.goals as any)?.[index]?.targetAmount?.message}
                    name={`${base}.targetAmount`}
                  />
                  <TextInput
                    id={idFromPath(`${base}.targetDate`)}
                    type="date"
                    value={date || ''}
                    onChange={(e) => setValue(`${base}.targetDate`, e.target.value, { shouldValidate: true, shouldDirty: true })}
                    placeholder="Datum"
                    error={(errors.goals as any)?.[index]?.targetDate?.message}
                    name={`${base}.targetDate`}
                  />
                  <FormattedNumberInput
                    id={idFromPath(`${base}.amountSaved`)}
                    value={saved ?? null}
                    onValueChange={(val) => setValue(`${base}.amountSaved`, val ?? null, { shouldValidate: true, shouldDirty: true })}
                    placeholder="Sparat (valfritt)"
                    error={(errors.goals as any)?.[index]?.amountSaved?.message}
                    name={`${base}.amountSaved`}
                  />
                  <button
                    type="button"
                    onClick={() => setDeletingId(item.fieldId)}
                    className="p-2 bg-red-600 hover:bg-red-700 text-white rounded self-center"
                    aria-label="Ta bort mål"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                {monthly !== null && (
                  <p className="text-sm text-white/80">
                    Månadssparande för att nå målet: <span className="font-semibold">{monthly.toLocaleString('sv-SE')} kr/mån</span>
                  </p>
                )}
              </motion.div>
            );
          })}
        </div>
      </section>
    </OptionContainer>
  );
};

export default SubStepGoals;
