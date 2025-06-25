import React from 'react';
import { useFormContext } from 'react-hook-form';
import { motion } from 'framer-motion';
import OptionContainer from '@components/molecules/containers/OptionContainer';
import { Step3FormValues } from '@/schemas/wizard/StepSavings/step3Schema';
import BirdIllustration from '@assets/Images/bird_freedom.png';
import InfoBox from "@/components/molecules/messaging/InfoBox";
/**
 * SubStepIntro – Savings introduction step
 * Adds a floating bird illustration in the top‑right corner to create a sense of
 * motion and freedom without taking focus away from the form.
 */
const SubStepIntro: React.FC = () => {
  // We summon formState and extract the errors!
  const { register, watch, formState: { errors } } = useFormContext<Step3FormValues>();
  const selected = watch('savingHabit');

  return (
    <OptionContainer className="p-4">
      {/* Relative wrapper allows absolute positioning of the bird */}
      <section className="relative max-w-xl mx-auto sm:px-6 lg:px-12 py-8 pb-safe space-y-8">
        {/* Floating bird – sits in the corner, gently bobbing */}
        <motion.img
          src={BirdIllustration}
          alt="Färgglad fågel som symboliserar ekonomisk frihet"
          className="absolute -top-6 -right-4 md:-top-8 md:-right-8 w-20 h-20 md:w-28 md:h-28 opacity-90 pointer-events-none select-none drop-shadow-lg"
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: [0, -8, 0] }}
          transition={{ duration: 4, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
        />

        {/* Intro Text */}
        <header className="space-y-2 text-center">
          <h3 className="text-2xl font-bold text-darkLimeGreen">
            Din resa mot ekonomisk frihet börjar här
          </h3>
          <InfoBox>
            Att spara pengar är ett kraftfullt steg mot nya möjligheter. Hur ser dina
            sparvanor ut idag?
          </InfoBox>
        </header>

        {/* Radio Group */}
        <fieldset className="space-y-4">
          <legend className="sr-only">Sparvanor</legend>
          {[
            { value: 'regular', label: 'Ja, jag sparar regelbundet.' },
            { value: 'sometimes', label: 'Jag sparar ibland.' },
            { value: 'start', label: 'Nej, men jag vill börja.' },
            { value: 'no', label: 'Nej, det gör jag inte.' },
          ].map((option) => (
            <label
              key={option.value}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer
                bg-darkBlueMenuColor/30 backdrop-blur-md transition
                ${
                  selected === option.value
                    ? 'ring-2 ring-limeGreen bg-darkBlueMenuColor/50'
                    : 'hover:bg-darkBlueMenuColor/40'
                }`}
            >
              <input
                type="radio"
                value={option.value}
                {...register('savingHabit')}
                className="h-5 w-5 accent-limeGreen"
              />
              <span className="text-white">{option.label}</span>
            </label>
          ))}
        </fieldset>
        
        {/* Our new messenger of truth! It shall appear when needed. */}
        {errors.savingHabit && (
            <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center font-bold text-red-600"
                role="alert"
            >
                {errors.savingHabit.message}
            </motion.p>
        )}

        {/* Conditional Helper Text */}
        {(selected === 'start' || selected === 'no') && (
          <p className="mt-4 text-center text-gray-300">
            Ingen fara! Vi hoppar över dina nuvarande vanor och fokuserar direkt på dina mål.
          </p>
        )}
      </section>
      <div id="savingHabit" style={{ position: 'absolute', top: 0 }} />
    </OptionContainer>
  );
};

export default SubStepIntro;