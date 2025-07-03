import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Step4FormValues } from '@/types/Wizard/Step4FormValues';
import OptionContainer from '@components/molecules/containers/OptionContainer';
import InfoBox from '@/components/molecules/messaging/InfoBox';
import { motion } from 'framer-motion';

/**
 * Gatekeeper for the "Skulder" (debts) step.
 *
 * UX in short:
 *  – Presents a single, crystal‑clear question.
 *  – Two large click‑targets double as buttons.
 *  – Selecting "Nej" lets the wizard skip the debt‑entry flow entirely.
 */
const SubStepGatekeeper: React.FC = () => {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<Step4FormValues>();

  // Current choice (boolean | undefined)
  const selected = watch('intro.hasDebts');

  /**
   * Update form state and (optionally) trigger navigation handled
   * by the parent wizard context.
   */
  const handleChoice = (answer: boolean) => {
    setValue('intro.hasDebts', answer, {
      shouldValidate: true,
      shouldDirty: true,
    });

    // If the user has **no** debts we can safely fast‑forward. The actual
    // navigation happens in the wizard controller, so we simply dispatch an
    // event. Feel free to adapt to your routing setup.
    if (!answer) {
      const skipEvent = new CustomEvent('wizard:skipDebts');
      window.dispatchEvent(skipEvent);
    }
  };

  return (
    <OptionContainer className="p-6 md:p-8">
      <section className="space-y-8 text-white">
        <h3 className="text-2xl md:text-3xl font-extrabold text-center text-darkLimeGreen">
          Har du några befintliga lån eller skulder som du vill hålla koll på?
        </h3>

        <InfoBox>
          Den här delen hjälper dig att samla alla dina skulder så att du enkelt kan följa
          utvecklingen och planera avbetalningar. Om du inte har några kan du hoppa över det här
          steget.
        </InfoBox>

        <div className="grid md:grid-cols-2 gap-6">
          <button
            type="button"
            onClick={() => handleChoice(true)}
            className={`rounded-2xl px-6 py-8 font-semibold transition ring-offset-2 ring-limeGreen/60
              backdrop-blur-md focus:outline-none
              ${
                selected === true
                  ? 'ring-4 bg-darkBlueMenuColor/70'
                  : 'bg-darkBlueMenuColor/40 hover:bg-darkBlueMenuColor/60'
              }`}
          >
            <span className="block text-lg md:text-xl">Ja, lägg till dem</span>
          </button>

          <button
            type="button"
            onClick={() => handleChoice(false)}
            className={`rounded-2xl px-6 py-8 font-semibold transition ring-offset-2 ring-limeGreen/60
              backdrop-blur-md focus:outline-none
              ${
                selected === false
                  ? 'ring-4 bg-darkBlueMenuColor/70'
                  : 'bg-darkBlueMenuColor/40 hover:bg-darkBlueMenuColor/60'
              }`}
          >
            <span className="block text-lg md:text-xl">Nej, jag har inga skulder</span>
          </button>
        </div>

        {/* Hidden input keeps RHF in sync without exposing default radio styling */}
        <input
          type="hidden"
          {...register('intro.hasDebts', { required: 'Välj ett alternativ' })}
          value={selected === undefined ? '' : String(selected)}
        />

        {errors.intro?.hasDebts && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center font-bold text-red-500"
            role="alert"
          >
            {errors.intro.hasDebts.message}
          </motion.p>
        )}


      </section>
    </OptionContainer>
  );
};

export default SubStepGatekeeper;
