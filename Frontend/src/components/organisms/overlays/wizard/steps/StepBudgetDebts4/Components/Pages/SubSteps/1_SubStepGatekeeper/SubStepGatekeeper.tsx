import React from 'react';
import { useFormContext } from 'react-hook-form';
import { motion } from 'framer-motion';
import OptionContainer from '@components/molecules/containers/OptionContainer';
import InfoBox from '@/components/molecules/messaging/InfoBox';
import { Step4FormValues } from '@/types/Wizard/Step4FormValues';

const SubStepGatekeeper: React.FC = () => {
  const { register, watch, formState: { errors } } = useFormContext<Step4FormValues>();
  const selected = watch('intro.hasDebts');

  return (
    <OptionContainer className="p-4">
      <section className="space-y-6 text-white">
        <h3 className="text-2xl font-bold text-darkLimeGreen text-center">
          Har du några befintliga lån eller skulder?
        </h3>
        <InfoBox>
          Den här delen hjälper dig att hålla koll på dina skulder. Om du inte har några kan du hoppa vidare direkt.
        </InfoBox>
        <div className="flex flex-col gap-4">
          <label
            className={`px-4 py-3 rounded-2xl cursor-pointer bg-darkBlueMenuColor/30 backdrop-blur-md transition ${selected === true ? 'ring-2 ring-limeGreen bg-darkBlueMenuColor/50' : 'hover:bg-darkBlueMenuColor/40'}`}
          >
            <input type="radio" value="true" {...register('intro.hasDebts')} className="hidden" />
            <span className="text-white">Ja, låt oss lägga till dem</span>
          </label>
          <label
            className={`px-4 py-3 rounded-2xl cursor-pointer bg-darkBlueMenuColor/30 backdrop-blur-md transition ${selected === false ? 'ring-2 ring-limeGreen bg-darkBlueMenuColor/50' : 'hover:bg-darkBlueMenuColor/40'}`}
          >
            <input type="radio" value="false" {...register('intro.hasDebts')} className="hidden" />
            <span className="text-white">Nej, jag har inga skulder</span>
          </label>
        </div>
        {errors.intro?.hasDebts && (
          <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center font-bold text-red-600" role="alert">
            {errors.intro?.hasDebts?.message}
          </motion.p>
        )}
        <div className="mt-6 text-sm text-gray-300 space-y-1 text-center">
          <p>[ Steg 4: Skulder ]</p>
          <p> &darr; </p>
          <p>[ Delsteg 1: Start ] --(Nej)--&gt; [ Hoppa till Steg 5 ]</p>
          <p> &darr; </p>
          <p>[ Delsteg 2: Lägg till skulder ]</p>
          <p> &darr; </p>
          <p>[ Delsteg 3: Strategi &amp; sammanfattning ]</p>
        </div>
      </section>
    </OptionContainer>
  );
};

export default SubStepGatekeeper;
