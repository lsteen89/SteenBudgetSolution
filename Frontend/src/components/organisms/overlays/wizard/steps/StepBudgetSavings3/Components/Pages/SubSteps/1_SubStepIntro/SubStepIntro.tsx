import React from 'react';
import { useFormContext } from 'react-hook-form';
import OptionContainer from '@components/molecules/containers/OptionContainer';
import { Step3FormValues } from '@/schemas/wizard/step3Schema';

const SubStepIntro: React.FC = () => {
  const { register, watch } = useFormContext<Step3FormValues>();
  const selected = watch('savingHabit');

  return (
    <OptionContainer>
      <section className="w-auto mx-auto sm:px-6 lg:px-12 py-8 pb-safe space-y-6">
        <h3 className="text-2xl font-bold text-darkLimeGreen text-center">
          Låt oss prata om ditt sparande.
        </h3>
        <p className="text-center text-white">Sparar du pengar just nu?</p>
        <div className="space-y-4">
          <label className="flex items-center gap-2 text-white">
            <input type="radio" value="regular" {...register('savingHabit')} className="h-4 w-4" />
            Ja, jag sparar regelbundet.
          </label>
          <label className="flex items-center gap-2 text-white">
            <input type="radio" value="sometimes" {...register('savingHabit')} className="h-4 w-4" />
            Jag sparar ibland.
          </label>
          <label className="flex items-center gap-2 text-white">
            <input type="radio" value="start" {...register('savingHabit')} className="h-4 w-4" />
            Nej, men jag vill börja.
          </label>
          <label className="flex items-center gap-2 text-white">
            <input type="radio" value="no" {...register('savingHabit')} className="h-4 w-4" />
            Nej, det gör jag inte.
          </label>
        </div>
        {(selected === 'start' || selected === 'no') && (
          <p className="mt-4 text-center text-darkLimeGreen">
            Vi hoppar över nuvarande vanor och går direkt till dina mål!
          </p>
        )}
      </section>
    </OptionContainer>
  );
};

export default SubStepIntro;
