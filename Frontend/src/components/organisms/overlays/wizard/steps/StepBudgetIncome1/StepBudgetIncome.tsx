import React, {
  useEffect,
  useMemo, // Make sure useMemo is imported
} from "react";
import Lottie from "lottie-react";
import { useFormContext, useFieldArray, get, FieldPath } from 'react-hook-form';

// Components, Hooks and assets
import GlassPane from "@components/layout/GlassPane";
import OptionContainer from "@components/molecules/containers/OptionContainer";
import SalaryField from "@components/organisms/overlays/wizard/steps/StepBudgetIncome1/Components/SalaryField";
import HouseholdMemberField from "@components/organisms/overlays/wizard/steps/StepBudgetIncome1/Components/HouseholdMemberField";
import SideHustleField from "@components/organisms/overlays/wizard/steps/StepBudgetIncome1/Components/SideHustleField";
import RemovalButton from "@components/atoms/buttons/RemovalButton";
import AcceptButton from "@components/atoms/buttons/AcceptButton";
import coinsAnimation from "@assets/lottie/coins.json";
import useYearlyIncome from "@hooks/wizard/useYearlyIncome";
import { useToast } from "@context/ToastContext";
import useScrollToFirstError from "@/hooks/useScrollToFirstError";
import LoadingScreen from "@components/molecules/feedback/LoadingScreen";
import DataTransparencySection from "@components/organisms/overlays/wizard/SharedComponents/Pages/DataTransparencySection";
import HelpSectionDark from "@components/molecules/helptexts/HelpSectionDark";
import { IncomeFormValues } from '@myTypes/Wizard/IncomeFormValues';



interface StepBudgetIncomeProps {
  onNext: () => void;
  onPrev: () => void;
  loading: boolean;
  stepNumber?: number;
}

function calculateYearlyIncome(income: number | null, frequency: string): number {
  if (income === null || isNaN(income)) return 0;
  let total = income;
  switch (frequency) {
    case "weekly": total *= 52; break;
    case "quarterly": total *= 4; break;
    case "annually": break;
    case "monthly": default: total *= 12; break;
  }
  return total;
}

const StepBudgetIncome: React.FC<StepBudgetIncomeProps> = ({
  onNext,
  onPrev,
  loading,
}) => {
const {
  control, watch, setValue, getValues,
  formState: { errors },
} = useFormContext<IncomeFormValues>();

  // Scroll to the first validation error when present
  useScrollToFirstError(errors);



  const watchedNetSalary = watch('netSalary');
  const watchedSalaryFrequency = watch('salaryFrequency');
  const watchedShowSideIncome = watch('showSideIncome');
  const watchedShowHouseholdMembers = watch('showHouseholdMembers');
  const watchedHouseholdMembers = watch('householdMembers');
  const watchedSideHustles = watch('sideHustles');

  const { fields: householdMemberFields, append: appendHouseholdMember, remove: removeHouseholdMember } = useFieldArray({
    control, name: "householdMembers",
  });
  const { fields: sideHustleFields, append: appendSideHustle, remove: removeSideHustle } = useFieldArray({
    control, name: "sideHustles",
  });

  useEffect(() => {
    const householdErrorEntry = get(errors, 'householdMembers' as FieldPath<IncomeFormValues>);
    const hasErrorsInHousehold = Array.isArray(householdErrorEntry)
      ? householdErrorEntry.some(e => e && Object.keys(e).length > 0)
      : !!(householdErrorEntry && typeof householdErrorEntry === 'object' && Object.keys(householdErrorEntry).length > 0);

    if (hasErrorsInHousehold && !watchedShowHouseholdMembers) {
      setValue('showHouseholdMembers', true, { shouldValidate: false, shouldDirty: false });
    }

    const sideHustleErrorEntry = get(errors, 'sideHustles' as FieldPath<IncomeFormValues>);
    const hasErrorsInSideHustles = Array.isArray(sideHustleErrorEntry)
      ? sideHustleErrorEntry.some(e => e && Object.keys(e).length > 0)
      : !!(sideHustleErrorEntry && typeof sideHustleErrorEntry === 'object' && Object.keys(sideHustleErrorEntry).length > 0);

    if (hasErrorsInSideHustles && !watchedShowSideIncome) {
      setValue('showSideIncome', true, { shouldValidate: false, shouldDirty: false });
    }
  }, [errors, watchedShowHouseholdMembers, watchedShowSideIncome, setValue, get]);

  const yearlySalary = useYearlyIncome({
    amount: watchedNetSalary,
    frequency: watchedSalaryFrequency,
  });


  useEffect(() => {
    const members = getValues('householdMembers');
    if (members) {
      members.forEach((member, index) => {
        if (member) {
          const calculatedYearly = calculateYearlyIncome(member.income, member.frequency);
          const currentYearlyIncomeInState = getValues(`householdMembers.${index}.yearlyIncome`);
          if (currentYearlyIncomeInState !== calculatedYearly) {
            setValue(`householdMembers.${index}.yearlyIncome`, calculatedYearly, {
              shouldValidate: false,
              shouldDirty: false,
            });
          }
        }
      });
    }
  }, [
    JSON.stringify(watchedHouseholdMembers?.map(m => ({ income: m?.income, frequency: m?.frequency }))),
    getValues,
    setValue,
    calculateYearlyIncome 
  ]);

  const totalHouseholdYearlyIncome = React.useMemo(() => {
    if (watchedHouseholdMembers && watchedHouseholdMembers.length > 0) {
      return watchedHouseholdMembers.reduce((sum, member) => {
        const yearlyIncomeVal = (member && typeof member.yearlyIncome === 'number' && !isNaN(member.yearlyIncome))
          ? member.yearlyIncome
          : 0;
        return sum + yearlyIncomeVal;
      }, 0);
    }
    return 0;
  }, [JSON.stringify(watchedHouseholdMembers?.map(member => member?.yearlyIncome))]);
  

  useEffect(() => {
    const hustles = getValues('sideHustles');
    if (hustles) {
      hustles.forEach((hustle, index) => {
        if (hustle) {
          const calculatedYearly = calculateYearlyIncome(hustle.income, hustle.frequency);
          const currentYearlyIncomeInState = getValues(`sideHustles.${index}.yearlyIncome`);
          if (currentYearlyIncomeInState !== calculatedYearly) {
            setValue(`sideHustles.${index}.yearlyIncome`, calculatedYearly, {
              shouldValidate: false,
              shouldDirty: false,
            });
          }
        }
      });
    }
  }, [
    JSON.stringify(watchedSideHustles?.map(h => ({ income: h?.income, frequency: h?.frequency }))),
    getValues,
    setValue,
    calculateYearlyIncome
  ]);

  const totalSideHustleYearlyIncome = React.useMemo(() => {
    if (watchedSideHustles && watchedSideHustles.length > 0) {
      return watchedSideHustles.reduce((sum, hustle) => {
        const yearlyIncomeVal = (hustle && typeof hustle.yearlyIncome === 'number' && !isNaN(hustle.yearlyIncome))
          ? hustle.yearlyIncome
          : 0;
        return sum + yearlyIncomeVal;
      }, 0);
    }
    return 0;
  }, [JSON.stringify(watchedSideHustles?.map(hustle => hustle?.yearlyIncome))]);

  // Grand Total Yearly Income
  const grandTotalYearlyIncome = React.useMemo(() => {
    const mainSalaryNum = (typeof yearlySalary === 'number' && !isNaN(yearlySalary)) ? yearlySalary : 0;
    return mainSalaryNum + totalHouseholdYearlyIncome + totalSideHustleYearlyIncome;
  }, [yearlySalary, totalHouseholdYearlyIncome, totalSideHustleYearlyIncome]);

  const { showToast } = useToast();

  const handleAddHouseholdMember = () => {
    appendHouseholdMember({ name: "", income: null, frequency: "monthly", yearlyIncome: 0 });
    showToast(<>Person tillagd! <br />Fyll i uppgifter eller ta bort för att gå vidare.</>, "success");
  };
  const handleRemoveHouseholdMember = (index: number) => {
    removeHouseholdMember(index);
    showToast("Person borttagen!", "error");
  };
  const handleAddSideHustle = () => {
    appendSideHustle({ name: "", income: null, frequency: "monthly", yearlyIncome: 0 });
    showToast(<>Sidoinkomst tillagd! <br />Fyll i uppgifter eller ta bort för att gå vidare.</>, "success");
  };
  const handleRemoveSideHustle = (index: number) => {
    removeSideHustle(index);
    showToast("Sidoinkomst borttagen!", "error");
  };

  // Removed duplicate useEffects for calculating yearly incomes (older versions)

  const householdMembersHelpContent = (
    <>
      <p>Alla personer i ditt hushåll vars ekonomi påverkar din budget.</p>
      <p className="mt-2">
        Hushållsmedlemmar inkluderar alla personer vars ekonomi påverkar den gemensamma budgeten,
        t.ex. partner, barn eller andra samboende. Du kan ange deras inkomster och utgifter
        separat för att få en mer komplett budgetöversikt.
      </p>
    </>
  );
  const sideHustlesHelpContent = (
    <>
      <p>Andra inkomster som inte är din huvudsakliga lön.</p>
      <p className="mt-2">
        Här kan du lägga till exempelvis frilansarbete, hobbyverksamhet eller olika bidrag
        som inte är din huvudsakliga lön. Detta hjälper dig att få en mer
        komplett bild av din ekonomi.
      </p>
    </>
  );

  if (loading) {
    return <GlassPane><LoadingScreen /></GlassPane>;
  }

  const _hasActualHouseholdErrors = Array.isArray(get(errors, 'householdMembers' as FieldPath<IncomeFormValues>))
    ? get(errors, 'householdMembers' as FieldPath<IncomeFormValues>).some((e: any) => e && Object.keys(e).length > 0)
    : !!get(errors, 'householdMembers' as FieldPath<IncomeFormValues>);

  const _hasActualSideHustleErrors = Array.isArray(get(errors, 'sideHustles' as FieldPath<IncomeFormValues>))
    ? get(errors, 'sideHustles' as FieldPath<IncomeFormValues>).some((e: any) => e && Object.keys(e).length > 0)
    : !!get(errors, 'sideHustles' as FieldPath<IncomeFormValues>);

  return (
    <GlassPane>
      <h3 className="text-3xl font-bold mb-6 text-darkLimeGreen text-center">
        Din ekonomi börjar här! 🚀
      </h3>
      <div className="text-center space-y-2 mb-6 text-lg text-customBlue1 font-medium">
        <p>📌 Ange din huvudinkomst.</p>
        <p>👥 Har du delad ekonomi? Lägg till en person med knappen <strong>"Lägg till person"</strong>.</p>
        <p>💰 Har du andra inkomster vid sidan av? Lägg till dem med knappen <strong>"Lägg till sidoinkomst"</strong>.</p>
      </div>
      <div className="flex justify-center my-6">
        <Lottie animationData={coinsAnimation} className="w-24 h-24" loop />
      </div>

      <OptionContainer>
        <SalaryField
          netSalaryFieldName="netSalary"
          salaryFrequencyFieldName="salaryFrequency"
          yearlySalaryCalculated={yearlySalary}
        />
        {errors.netSalary && <p className="text-red-500 text-sm mt-1">{errors.netSalary.message}</p>}
        {errors.salaryFrequency && <p className="text-red-500 text-sm mt-1">{errors.salaryFrequency.message}</p>}
        {yearlySalary != null && yearlySalary > 0 && (
          <p className="text-customBlue1 text-sm mt-2 bg-white/20 p-2 rounded-lg shadow-md inline-block">
            🏦 <strong>Månadsinkomst: </strong>
            <span className="text-black font-semibold">
              {(yearlySalary / 12).toLocaleString('sv-SE', { style: 'currency', currency: 'SEK', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
          </p>
        )}
      </OptionContainer>

      {/* Optional Household Members Section */}
      <OptionContainer>
        <div className="flex items-center justify-center mt-4 gap-x-2 mb-3">
          <h4 className="text-lg font-semibold">Hushålls&shy;medlemmar&nbsp;(valfritt)</h4>
          <HelpSectionDark
            label="Hushållsmedlemmar (valfritt)" 
            helpText={householdMembersHelpContent}
            idSuffix="household-section-title" 
          />
        </div>
        <button
          type="button"
          onClick={() => setValue('showHouseholdMembers', !watchedShowHouseholdMembers, { shouldDirty: true, shouldValidate: false })}
          className="block mx-auto mt-2 bg-darkLimeGreen hover:bg-darkBlueMenuColor text-white font-bold py-3 px-6 rounded-xl shadow-md transform hover:scale-105 transition-all"
        >
          {watchedShowHouseholdMembers ? `Dölj hushålls\u00admedlemmar ❌` : `Visa hushålls\u00admedlemmar`}
        </button>
        {watchedShowHouseholdMembers && (
          <div className="mt-4 text-center">
            <AcceptButton onClick={handleAddHouseholdMember} >
              ➕ Lägg till person
            </AcceptButton>
          </div>
        )}
        {watchedShowHouseholdMembers && householdMemberFields.length === 0 && !_hasActualHouseholdErrors && (
          <p className="text-customBlue1 text-sm mt-4 text-center bg-white/20 p-2 rounded-lg shadow-md">
            🏠 Inga hushållsmedlemmar angivna. Klicka ovan för att lägga till.
          </p>
        )}
        {watchedShowHouseholdMembers && householdMemberFields.map((fieldItem, index) => {
          const memberIncome = watch(`householdMembers.${index}.income`);
          const memberFrequency = watch(`householdMembers.${index}.frequency` as FieldPath<IncomeFormValues>);
          const memberYearlyIncome = watch(`householdMembers.${index}.yearlyIncome`) ?? calculateYearlyIncome(memberIncome, memberFrequency as string);
          return (
            <div key={fieldItem.id} className="my-6 border-b border-gray-300 dark:border-gray-700 pb-6 last:border-b-0 last:pb-0">
              <HouseholdMemberField
                label="Namn:"
                fieldName={`householdMembers.${index}.name`}
                type="text"
                placeholder="T.ex. Partner, Barn"
              />
              <HouseholdMemberField
                label="Nettoinkomst:"
                fieldName={`householdMembers.${index}.income`}
                type="number"
                placeholder="Ange nettoinkomst"
                displayYearlyIncome={memberYearlyIncome}
              />
              <HouseholdMemberField
                label="Lönefrekvens:"
                fieldName={`householdMembers.${index}.frequency`}
                type="select"
                options={[
                  { value: "monthly", label: "Per månad" }, { value: "weekly", label: "Per vecka" },
                  { value: "quarterly", label: "Per kvartal" }, { value: "annually", label: "Årligen" },
                ]}
              />
              <div className="mt-3 flex justify-end">
                <RemovalButton onClick={() => handleRemoveHouseholdMember(index)} />
              </div>
            </div>
          );
        })}
        {!watchedShowHouseholdMembers && watchedHouseholdMembers && watchedHouseholdMembers.length > 0 && (
          <div className="mt-4 p-3 bg-white/10 rounded-lg text-customBlue1 shadow-md text-center">
            <p className="text-lg font-semibold">
              🏠 {watchedHouseholdMembers.length}{' '}
              {watchedHouseholdMembers.length === 1 ? 'hushållsmedlem angiven' : 'hushållsmedlemmar angivna'}.
            </p>
            {totalHouseholdYearlyIncome > 0 && (
              <p className="text-md font-medium mt-1">
                💰 Total årlig inkomst (hushåll):{' '}
                {totalHouseholdYearlyIncome.toLocaleString('sv-SE', {
                  style: 'currency',
                  currency: 'SEK',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}
              </p>
            )}
            {_hasActualHouseholdErrors && (
              <p className="text-sm text-red-400 dark:text-red-300 mt-2">
                Obs! Det finns felaktig information som behöver åtgärdas. Klicka ovan för att visa.
              </p>
            )}
            <p className="text-sm text-gray-300 mt-1">Klicka på knappen ovan för att visa och redigera.</p>
          </div>
        )}
      </OptionContainer>

      {/* Side Hustle Section */}
      <OptionContainer>
        <div className="flex items-center justify-center mt-4 gap-x-2 mb-3"> {/* Changed gap-2 to gap-x-2 */}
          <h4 className="text-lg font-semibold">Övriga inkomster (valfritt)</h4>
          <HelpSectionDark
            label="Övriga inkomster (valfritt)" // Corrected label
            helpText={sideHustlesHelpContent}
            idSuffix="sidehustle-section-title" // Corrected suffix
          />
        </div>
        <button
          type="button"
          onClick={() => setValue('showSideIncome', !watchedShowSideIncome, { shouldDirty: true, shouldValidate: false })}
          className="block mx-auto mt-2 bg-darkLimeGreen hover:bg-darkBlueMenuColor text-white font-bold py-3 px-6 rounded-xl shadow-md transform hover:scale-105 transition-all"
        >
          {watchedShowSideIncome ? "Dölj andra former av inkomster ❌" : "Visa andra former av inkomster"}
        </button>
        {watchedShowSideIncome && (
          <div className="mt-4 text-center">
            <AcceptButton onClick={handleAddSideHustle} >
              ➕ Lägg till sidoinkomst
            </AcceptButton>
          </div>
        )}
        {watchedShowSideIncome && sideHustleFields.length === 0 && !_hasActualSideHustleErrors && (
          <p className="text-customBlue1 text-sm mt-4 text-center bg-white/20 p-2 rounded-lg shadow-md">
            🧐 Inga sidoinkomster angivna. Klicka ovan för att lägga till.
          </p>
        )}
        {watchedShowSideIncome && sideHustleFields.map((fieldItem, index) => {
          const hustleIncome = watch(`sideHustles.${index}.income`);
          const hustleFrequency = watch(`sideHustles.${index}.frequency` as FieldPath<IncomeFormValues>);
          const hustleYearlyIncome = watch(`sideHustles.${index}.yearlyIncome`) ?? calculateYearlyIncome(hustleIncome, hustleFrequency as string);
          return (
            <div key={fieldItem.id} className="my-6 border-b border-gray-300 dark:border-gray-700 pb-6 last:border-b-0 last:pb-0">
              <SideHustleField
                label="Namn på sidoinkomst:"
                fieldName={`sideHustles.${index}.name`}
                type="text"
                placeholder="T.ex. frilans, hobby, olika bidrag"
              />
              <SideHustleField
                label="Nettoinkomst (SEK):"
                fieldName={`sideHustles.${index}.income`}
                type="number"
                placeholder="Ange nettoinkomst"
                displayYearlyIncome={hustleYearlyIncome}
              />
              <SideHustleField
                label="Lönefrekvens:"
                fieldName={`sideHustles.${index}.frequency`}
                type="select"
                options={[
                  { value: "monthly", label: "Per månad" }, { value: "weekly", label: "Per vecka" },
                  { value: "quarterly", label: "Per kvartal" }, { value: "annually", label: "Årligen" },
                ]}
              />
              <div className="mt-3 flex justify-end">
                <RemovalButton onClick={() => handleRemoveSideHustle(index)} />
              </div>
            </div>
          );
        })}
        {!watchedShowSideIncome && watchedSideHustles && watchedSideHustles.length > 0 && (
          <div className="mt-4 p-3 bg-white/10 rounded-lg text-customBlue1 shadow-md text-center">
            <p className="text-lg font-semibold">
              💼 {watchedSideHustles.length}{' '}
              {watchedSideHustles.length === 1 ? 'sidoinkomst angiven' : 'sidoinkomster angivna'}.
            </p>
            {totalSideHustleYearlyIncome > 0 && (
              <p className="text-md font-medium mt-1 text-customBlue1">
                💸 Total årlig inkomst (sidoinkomster):{' '}
                {totalSideHustleYearlyIncome.toLocaleString('sv-SE', {
                  style: 'currency',
                  currency: 'SEK',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}
              </p>
            )}
            {_hasActualSideHustleErrors && (
              <p className="text-sm text-red-400 dark:text-red-300 mt-2">
                Obs! Det finns osparade ändringar eller felaktig information som behöver åtgärdas.
              </p>
            )}
            <p className="text-sm text-gray-300 mt-1">
              Klicka på knappen ovan för att visa och redigera.
            </p>
          </div>
        )}
      </OptionContainer>

      {/* Grand Total Income Summary Section */}
      {grandTotalYearlyIncome > 0 && (
        <div className="mt-10 mb-6 p-6 bg-gradient-to-br from-lime-500 via-emerald-500 to-teal-600 text-white rounded-xl shadow-2xl text-center mx-auto max-w-2xl">
          <h4 className="text-3xl font-extrabold mb-3 tracking-tight">
            🎉 Din Totala Beräknade Årsinkomst 🎉
          </h4>
          <p className="text-4xl font-bold mb-4 opacity-95">
            {grandTotalYearlyIncome.toLocaleString('sv-SE', {
              style: 'currency',
              currency: 'SEK',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}
          </p>
          <div className="border-t border-white/30 my-4"></div>
          <p className="text-xl mb-1">
            Detta motsvarar en genomsnittlig månadsinkomst på:
          </p>
          <p className="text-2xl font-semibold">
            {(grandTotalYearlyIncome / 12).toLocaleString('sv-SE', {
              style: 'currency',
              currency: 'SEK',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}
          </p>
          <p className="text-xs mt-4 opacity-80">
            Observera: Detta är en uppskattning baserad på de angivna nettoinkomsterna och frekvenserna.
          </p>
        </div>
      )}

      <DataTransparencySection />
    </GlassPane>
  );
};

export default StepBudgetIncome;