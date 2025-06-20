import React from 'react';
import { useFormContext } from 'react-hook-form';
import OptionContainer from '@components/molecules/containers/OptionContainer';
import RangeSlider from '@components/atoms/InputField/RangeSlider';
import SelectDropdown from '@components/atoms/dropdown/SelectDropdown';
import { useWizardDataStore } from '@/stores/Wizard/wizardDataStore';
import { Step3FormValues } from '@/schemas/wizard/step3Schema';
import { calcMonthlyIncome } from '@/utils/wizard/wizardHelpers';

const SubStepHabits: React.FC = () => {
  const { watch, setValue } = useFormContext<Step3FormValues>();
  const income = useWizardDataStore((s) => s.data.income);
  const maxIncome = calcMonthlyIncome(income);

  const monthlySavings = watch('monthlySavings');
  const savingMethod = watch('savingMethod');

  return (
    <OptionContainer>
      <section className="max-w-xl mx-auto sm:px-6 lg:px-12 py-8 pb-safe space-y-8">
        <header className="space-y-2 text-center">
          <h3 className="text-2xl font-bold text-darkLimeGreen">
            Great! To help us give you the best advice, you can tell us about your habits below.
          </h3>
          <p className="text-white">
            This info helps us see if your goals are realistic with your current budget.
          </p>
        </header>

        {/* Monthly Savings Slider */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-standardMenuColor/90 dark:text-standardMenuColor">
            Roughly how much do you set aside for savings each month?
          </label>
          <div className="flex items-center gap-2">
            <RangeSlider
              min={0}
              max={maxIncome}
              value={monthlySavings ?? 0}
              onChange={(val) => setValue('monthlySavings', val, { shouldValidate: false, shouldDirty: true })}
              className="flex-1"
            />
            <span className="text-white w-16 text-right">
              {(monthlySavings ?? 0).toLocaleString('sv-SE')} kr
            </span>
            <button
              type="button"
              onClick={() => setValue('monthlySavings', null, { shouldValidate: false, shouldDirty: true })}
              className="ml-2 text-xs text-gray-300 underline whitespace-nowrap"
            >
              I prefer not to say
            </button>
          </div>
        </div>

        {/* Saving Method Dropdown */}
        <SelectDropdown
          label="How do you usually save?"
          value={savingMethod ?? ''}
          onChange={(e) => setValue('savingMethod', e.target.value, { shouldValidate: false, shouldDirty: true })}
          options={[
            { value: '', label: 'Select...', disabled: true },
            { value: 'auto', label: 'Automatic transfer' },
            { value: 'manual', label: 'Manual transfer' },
            { value: 'invest', label: 'Investments' },
            { value: 'prefer_not', label: 'Prefer not to say' },
          ]}
        />
      </section>
    </OptionContainer>
  );
};

export default SubStepHabits;
