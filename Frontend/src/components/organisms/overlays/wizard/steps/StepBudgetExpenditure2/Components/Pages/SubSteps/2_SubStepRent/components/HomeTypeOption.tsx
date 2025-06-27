import React from "react";
import { useFormContext } from "react-hook-form";
import OptionContainer from "@components/molecules/containers/OptionContainer";
import ConfirmModal from "@components/atoms/modals/ConfirmModal";
import HelpSection from "@components/molecules/helptexts/HelpSection";
import FormattedNumberInput from "@components/atoms/InputField/FormattedNumberInput";
import { useEffect, useState } from "react";
import { idFromPath } from "@utils/idFromPath"; 

interface RentForm {
  rent: {
    homeType: string;
    monthlyRent: number | null;
    rentExtraFees: number | null; // specific to rent
    monthlyFee: number | null;
    brfExtraFees: number | null;  // specific to brf
    mortgagePayment: number | null;
    houseotherCosts: number | null; // specific to house
    otherCosts: number | null; // specific to free
  };
}

const HomeTypeOption: React.FC = () => {
  const {
    register,
    watch,
    setValue,
    formState: { errors }
  } = useFormContext<RentForm>();

  // Track the previous confirmed home type
  const [previousHomeType, setPreviousHomeType] = useState<string | null>(null);

  // Current (tentative) home type from the form
  const homeType = watch("rent.homeType");

  // Modal state
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [pendingHomeType, setPendingHomeType] = useState<string | null>(null);

  // Pre-register fields
  const monthlyRentRegister = register("rent.monthlyRent");
  const rentExtraFeesRegister = register("rent.rentExtraFees");
  const monthlyFee = register("rent.monthlyFee");
  const brfExtraFees = register("rent.brfExtraFees");
  const mortgagePayment = register("rent.mortgagePayment");
  const houseotherCosts = register("rent.houseotherCosts");
  const otherCosts = register("rent.otherCosts");

  // Help texts
  const rentHelpText = "Din totala hyra. Övriga avgifter som el och vatten anges nedan.";
  const rentOtherfeesHelpText = "Övriga avgifter, t.ex. el/vatten, kan räknas ihop till en månadskostnad.";
  const brfHelpText = "Din månadsavgift till bostadsrättsföreningen. Övriga avgifter anges nedan.";
  const brfOtherFeesHelpText = "Din bolånebetalning exklusive amortering. Övriga kostnader kan räknas in för en bättre uppskattning av boendekostnad.";
  const houseHelpText = "Husets totala driftkostnad per månad exklusive amortering. Övriga avgifter anges nedan.";
  const houseOtherFeesHelpText = "Eventuella övriga kostnader kopplade till huset, i kostnad per månad.";
  const otherCostsHelpText = "Övriga kostnader. Om du inte har några kostnader kan du lämna detta fält tomt.";

  /** 
   * Whenever `homeType` changes, if it's different from the last *confirmed* type 
   * and we already had a previous type, we open the confirm modal. We revert the 
   * form back to the old type until the user confirms.
   */
  useEffect(() => {
    // If it's the first time choosing a type (i.e., no previous type), just store it.
    if (!previousHomeType) {
      setPreviousHomeType(homeType);
      return;
    }

    // If user selects a different type than the last confirmed one,
    // open confirm modal, but revert the visible selection to the old one for now.
    if (homeType && homeType !== previousHomeType) {
      setPendingHomeType(homeType);
      setValue("rent.homeType", previousHomeType); // revert
      setConfirmModalOpen(true);
    }
  }, [homeType, previousHomeType, setValue]);

  // Conditionally render UI based on the *confirmed* type (previousHomeType),
  // since that's what's actually displayed if the user hasn't confirmed a new change yet.
  const effectiveHomeType = watch("rent.homeType");

  let renderedHomeTypeSection: React.ReactNode = null;

  if (effectiveHomeType === "rent") {
    renderedHomeTypeSection = (
      <OptionContainer className="p-4"> 

        <p className="text-center text-customBlue1 text-lg mb-4">
          Enkelt och smidigt! Fyll i din månadshyra. Under övrigt så anger du fasta utgifter, såsom el, vatten och annat kopplat till boendekostnader per månad.
        </p>
        {/* Monthly Rent */}
        <div className="bg-white bg-opacity-10 p-4 rounded-xl shadow-inner">
          <div className="relative mt-4">
            
              <div className="flex items-center gap-1 justify-center">
                <label className="block text-sm font-medium">Hyra per månad</label>
                <HelpSection label="" helpText={rentHelpText} />
              </div>
              <div className="flex items-center gap-1 mt-2">
                <FormattedNumberInput
                  value={watch("rent.monthlyRent") || 0}
                  onValueChange={(val) => setValue("rent.monthlyRent", val ?? 0)}
                  placeholder="Ange hyra"
                  error={errors.rent?.monthlyRent?.message}
                  name={monthlyRentRegister.name}
                  onBlur={monthlyRentRegister.onBlur}
                  id={idFromPath(monthlyRentRegister.name)}
                />
              </div>
              {errors.rent?.monthlyRent?.message && (
                <p className="text-red-500 text-lg mt-1">
                  {errors.rent.monthlyRent.message}
                </p>
              )}
            
          </div>

          {/* Extra Fees */}
          <div className="flex items-center gap-1 justify-center mt-4">
            <label className="block text-sm font-medium">
              Övriga avgifter (frivilligt)
            </label>
            <HelpSection label="" helpText={rentOtherfeesHelpText} />
          </div>
          <FormattedNumberInput
            value={watch("rent.rentExtraFees") || 0}
            onValueChange={(val) => setValue("rent.rentExtraFees", val ?? 0)}
            placeholder="Ange avgifter"
            error={errors.rent?.rentExtraFees?.message}
            name={rentExtraFeesRegister.name}
            id={idFromPath(rentExtraFeesRegister.name)}
          />
          {errors.rent?.rentExtraFees?.message && (
            <p className="text-red-500 text-lg mt-1">
              {errors.rent.rentExtraFees.message}
            </p>
          )}
        </div>
      </OptionContainer>
    );
  } else if (effectiveHomeType === "brf") {
    renderedHomeTypeSection = (
      <OptionContainer className="p-4">
        <p className="text-center text-customBlue1 text-lg">
          Härligt med något eget! Här anger du din månadsavgift till föreningen. Under övrigt så anger du fasta utgifter, såsom el, vatten och annat kopplat till boendekostnader per månad.
        </p>
        <br />
        <div className="bg-white bg-opacity-10 p-4 rounded-xl shadow-inner">
          <div className="relative mt-4">
            <div className="flex items-center gap-1 justify-center">
              <label className="block text-sm font-medium">Avgift per månad</label>
              <HelpSection label="" helpText={brfHelpText} />
            </div>
            <FormattedNumberInput
              value={watch("rent.monthlyFee") || 0}
              onValueChange={(val) => setValue("rent.monthlyFee", val ?? 0)}
              placeholder="Ange avgift"
              error={errors.rent?.monthlyFee?.message}
              name={monthlyFee.name}
              onBlur={monthlyFee.onBlur}
              id={idFromPath(monthlyFee.name)} 
            />
            {errors.rent?.monthlyFee?.message && (
              <p className="text-red-500 text-lg mt-1">
                {errors.rent.monthlyFee.message}
              </p>
            )}

            <div className="flex items-center gap-1 justify-center mt-4">
              <label className="block text-sm font-medium">
                Övriga avgifter (frivilligt)
              </label>
              <HelpSection label="" helpText={brfOtherFeesHelpText} />
            </div>
            <FormattedNumberInput
              value={watch("rent.brfExtraFees") || 0}
              onValueChange={(val) => setValue("rent.brfExtraFees", val ?? 0)}
              placeholder="Ange avgifter"
              error={errors.rent?.brfExtraFees?.message}
              name={brfExtraFees.name}
              id={idFromPath(brfExtraFees.name)}
            />
          </div>
          {errors.rent?.brfExtraFees?.message && (
            <p className="text-red-500 text-lg mt-1">
              {errors.rent.brfExtraFees.message}
            </p>
          )}
        </div>
      </OptionContainer>
    );
  } else if (effectiveHomeType === "house") {
    renderedHomeTypeSection = (
      <OptionContainer className="p-4">
        <p className="text-center text-customBlue1 text-lg">
          Frihet och ansvar! Här anger du din bolånebetalning. Under övrigt så anger du fasta utgifter, såsom el, vatten och annat kopplat till boendekostnader per månad.
        </p>
        <div className="bg-white bg-opacity-10 p-4 rounded-xl shadow-inner">
          <div className="relative mt-4">
            <div className="flex items-center gap-1 justify-center">
              <label className="block text-sm font-medium">
                Driftkostnad per månad
              </label>
              <HelpSection label="" helpText={houseHelpText} />
            </div>
            <FormattedNumberInput
              value={watch("rent.mortgagePayment") || 0}
              onValueChange={(val) => setValue("rent.mortgagePayment", val ?? 0)}
              onBlur={mortgagePayment.onBlur}
              name={mortgagePayment.name}
              placeholder="Ange bolånebetalning"
              error={errors.rent?.mortgagePayment?.message}
              id={idFromPath(mortgagePayment.name)}
            />
            {errors.rent?.mortgagePayment && (
              <p className="text-red-500 text-lg mt-1">
                {errors.rent.mortgagePayment.message}
              </p>
            )}

            <div className="flex items-center gap-1 justify-center mt-4">
              <label className="block text-sm font-medium">
                Övriga avgifter (frivilligt)
              </label>
              <HelpSection label="" helpText={houseOtherFeesHelpText} />
            </div>
            <FormattedNumberInput
              value={watch("rent.houseotherCosts") || 0}
              onValueChange={(val) => setValue("rent.houseotherCosts", val ?? 0)}
              name={houseotherCosts.name}
              placeholder="Ange kostnader"
              error={errors.rent?.houseotherCosts?.message}
              id={idFromPath(houseotherCosts.name)}
            />
            {errors.rent?.houseotherCosts && (
              <p className="text-red-500 text-lg mt-1">
                {errors.rent.houseotherCosts.message}
              </p>
            )}
          </div>
        </div>
      </OptionContainer>
    );
  } else if (effectiveHomeType === "free") {
    renderedHomeTypeSection = (
      <OptionContainer className="p-4">
        <p className="text-center text-customBlue1 text-lg">
          Om du ändå har några kostnader kopplade till boendet (t.ex. el, vatten), fyll gärna i dem här.
        </p>
        <div className="bg-white bg-opacity-10 p-4 rounded-xl shadow-inner">
          <div className="mt-4">
            <div className="flex items-center gap-1 justify-center">
              <label className="block text-sm font-medium">
                Övriga kostnader
              </label>
              <HelpSection label="" helpText={otherCostsHelpText} />
            </div>
            <FormattedNumberInput
              value={watch("rent.otherCosts") || 0}
              onValueChange={(val) => setValue("rent.otherCosts", val ?? 0)}
              name={otherCosts.name}
              placeholder="Ange kostnader"
              error={errors.rent?.otherCosts?.message}
              id={idFromPath(otherCosts.name)}
            />
            {errors.rent?.otherCosts && (
              <p className="text-red-500 text-lg mt-1">
                {errors.rent.otherCosts.message}
              </p>
            )}
          </div>
        </div>
      </OptionContainer>
    );
  }
  
  return (
    <>
      {renderedHomeTypeSection}

      <ConfirmModal
        title="Är du säker?"
        description = "Gamla uppgifter kommer att nollställas om du byter boendeform."
        isOpen={confirmModalOpen}
        onCancel={() => {
          // User cancels → do not change type
          setConfirmModalOpen(false);
          setPendingHomeType(null);
        }}
        onConfirm={() => {
          if (!pendingHomeType) return;

          // Reset fields relevant to the new type
          if (pendingHomeType === "rent") {
            setValue("rent.monthlyFee", null);
            setValue("rent.mortgagePayment", null);
            setValue("rent.otherCosts", null);
            setValue("rent.brfExtraFees", null);
            setValue("rent.houseotherCosts", null);
          } else if (pendingHomeType === "brf") {
            setValue("rent.monthlyRent", null);
            setValue("rent.rentExtraFees", null);
            setValue("rent.otherCosts", null);
            setValue("rent.mortgagePayment", null);
            setValue("rent.houseotherCosts", null);
          } else if (pendingHomeType === "house") {
            setValue("rent.monthlyRent", null);
            setValue("rent.monthlyFee", null);
            setValue("rent.otherCosts", null);
            setValue("rent.rentExtraFees", null);
            setValue("rent.brfExtraFees", null);
          } else if (pendingHomeType === "free") {
            setValue("rent.monthlyRent", null);
            setValue("rent.monthlyFee", null);
            setValue("rent.mortgagePayment", null);
            setValue("rent.rentExtraFees", null);
            setValue("rent.brfExtraFees", null);
            setValue("rent.houseotherCosts", null);
          }

          // Now apply the new type
          setValue("rent.homeType", pendingHomeType);

          // The new type is now the "confirmed" type
          setPreviousHomeType(pendingHomeType);

          setConfirmModalOpen(false);
          setPendingHomeType(null);
        }}
      />
    </>
  );
};

export default HomeTypeOption;
