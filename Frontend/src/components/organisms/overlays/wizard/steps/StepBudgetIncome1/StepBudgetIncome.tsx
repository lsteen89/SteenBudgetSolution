import React, {
  useState,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
  ReactNode,
  useCallback,
} from "react";
import { Link } from "react-router-dom";
import { flushSync } from 'react-dom';
import Lottie from "lottie-react";
import { ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

// Components, Hooks and assets
import GlassPane from "../../../../../layout/GlassPane";
import OptionContainer from "@components/molecules/containers/OptionContainer";
import SalaryField from "@components/organisms/overlays/wizard/steps/StepBudgetIncome1/Components/SalaryField";
import HouseholdMemberField from "@components/organisms/overlays/wizard/steps/StepBudgetIncome1/Components/HouseholdMemberField";
import SideHustleField from "@components/organisms/overlays/wizard/steps/StepBudgetIncome1/Components/SideHustleField";
import RemovalButton from "@components/atoms/buttons/RemovalButton";
import AcceptButton from "@components/atoms/buttons/AcceptButton";
import HelpSection from "@components/molecules/helptexts/HelpSection";
import coinsAnimation from "@assets/lottie/coins.json";
import useFormValidation from "@hooks/wizard/useFormValidation";
import useYearlyIncome from "@hooks/wizard/useYearlyIncome";
import { useToast } from  "@context/ToastContext";
import LoadingScreen from "@components/molecules/feedback/LoadingScreen";
import DataTransparencySection from "@components/organisms/overlays/wizard/SharedComponents/Pages/DataTransparencySection";

/**  Imperative handle for the parent */
export interface StepBudgetIncomeRef {
  validateFields: () => boolean;
  getStepData: () => any;
  markAllTouched: () => void;
  getErrors: () => { [key: string]: string };
  openSideIncome: () => void;
  openHouseholdMembers: () => void;
}

/**  Props */
interface StepBudgetIncomeProps {
  setStepValid: (isValid: boolean) => void;
  wizardSessionId: string;
  onSaveStepData: (stepNumber: number, subStep: number, data: any, goingBackwards: boolean) => Promise<boolean>;
  stepNumber: number;
  initialData: any;
  onNext: () => void;
  onPrev: () => void;
  showSideIncome: boolean;
  setShowSideIncome: (value: boolean) => void;
  showHouseholdMembers: boolean;
  setShowHouseholdMembers: (value: boolean) => void;
  loading: boolean;
}

/**  Form Values Interface */
interface FormValues {
  netSalary: number | null;
  showSideIncome: boolean;
  showHouseholdMembers: boolean;
  salaryFrequency: string;
  householdMembers: HouseholdMember[];
  sideHustles: SideHustle[];
  yearlySalary?: number | null;
}

/**  Data Interfaces */
interface HouseholdMember {
  name: string;
  income: string;
  frequency: string;
  yearlyIncome: number;
}
interface SideHustle {
  name: string;
  income: string;
  frequency: string;
  yearlyIncome?: number;
}
interface SalaryFieldProps {
  netSalary: number | null;
  yearlySalary?: number | null;
  salaryFrequency: string;
  handleSalaryChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSalaryFrequencyChange: (freq: string) => void; // <-- new callback
  errors?: { [key: string]: string };
  touched?: { [key: string]: boolean };
}



/**  Local helper for calculating yearly income */
function calculateYearlyIncome(income: number, frequency: string): number {
  let total = income;
  switch (frequency) {
    case "weekly":
      total *= 52;
      break;
    case "quarterly":
      total *= 4;
      break;
    case "annually":
      // no change
      break;
    case "monthly":
    default:
      total *= 12;
      break;
  }
  return total;
}

const StepBudgetIncome = forwardRef<StepBudgetIncomeRef, StepBudgetIncomeProps  >(
  (
    {
      setStepValid,
      wizardSessionId,
      onSaveStepData,
      stepNumber,
      initialData,
      onNext,
      onPrev,
      showSideIncome,
      setShowSideIncome,
      showHouseholdMembers,
      setShowHouseholdMembers,
      loading,
    },
    ref
  ) => {
    /** 1) Define initial form values for the hook */
    const initialValues: FormValues = {
      netSalary: initialData?.netSalary ?? null,
      showSideIncome: initialData?.showSideIncome ?? false,
      showHouseholdMembers: initialData?.showHouseholdMembers ?? false,
      salaryFrequency: initialData?.salaryFrequency ?? "monthly",
      householdMembers: initialData?.householdMembers ?? [],
      sideHustles: initialData?.sideHustles ?? [],
    };

    /** 2) Validation function referencing ONLY `values` */
    const validateFn = (values: FormValues) => {
      const newErrors: { [key: string]: string } = {};

      // netSalary
      if (values.netSalary === null) {
        newErrors.netSalary = "Ange din primära inkomst.";
      } else if (values.netSalary === 0) {
        newErrors.netSalary = "Inkomsten kan inte vara 0.";
      } else if (values.netSalary < 0) {
        newErrors.netSalary = "Inkomsten kan inte vara negativ.";
      }

      // salaryFrequency
      if (!values.salaryFrequency) {
        newErrors.salaryFrequency = "Välj lönefrekvens.";
      }

      // householdMembers
      if (values.householdMembers.length > 0) {
        values.householdMembers.forEach((member, index) => {
          if (!member.name.trim()) {
            newErrors[`memberName-${index}`] = "Ange namn på personen.";
          }
          if (member.income === "") {
            newErrors[`memberIncome-${index}`] = "Ange nettoinkomst.";
          } else if (member.income === "0") {
            newErrors[`memberIncome-${index}`] = "Inkomsten kan inte vara 0.";
          } else if (parseFloat(member.income) < 0) {
            newErrors[`memberIncome-${index}`] = "Inkomsten kan inte vara negativ.";
          }
          if (!member.frequency) {
            newErrors[`memberFrequency-${index}`] = "Välj frekvens.";
          }
        });
      }

      // sideHustles
      if (values.sideHustles.length > 0) {
        values.sideHustles.forEach((side, index) => {
          if (!side.name.trim()) {
            newErrors[`sideHustleName-${index}`] = "Ange namn för inkomst.";
          }
          const incomeStr = side.income ? side.income.toString() : "";
          if (!incomeStr.trim()) {
            newErrors[`sideHustleIncome-${index}`] = "Ange inkomstens storlek.";
          }
          else if (incomeStr === "0") {
            newErrors[`sideHustleIncome-${index}`] = "Inkomsten kan inte vara 0.";
          } else if (parseFloat(incomeStr) < 0) {
            newErrors[`sideHustleIncome-${index}`] = "Inkomsten kan inte vara negativ.";
          }
          if (!side.frequency) {
            newErrors[`sideHustleFrequency-${index}`] = "Välj inkomstens frekvens.";
          }
        });
      }
      return newErrors;
    };

    /** 3) Custom form validation hook */
    const {
      values,
      setValues,
      errors,
      touched,
      validateFields,
      validateField,
      markAllTouched,
      markFieldTouched,
      removeFieldState,
    } = useFormValidation(initialValues, validateFn);

    const shouldShowHouseholdMembers = showHouseholdMembers ||
    Object.keys(errors).some(key =>
      (key.startsWith("memberName") || key.startsWith("memberIncome")) &&
      errors[key] !== undefined && errors[key] !== null && errors[key] !== ""
    );
  
    const shouldShowSideIncome = showSideIncome ||
    Object.keys(errors).some(key =>
      (key.startsWith("sideHustleName") || key.startsWith("sideHustleIncome")) &&
      errors[key] !== undefined && errors[key] !== null && errors[key] !== ""
    );
  
    /** 4) We can compute the main yearly salary with a separate hook */
    const yearlySalary = useYearlyIncome({
      amount: values.netSalary,
      frequency: values.salaryFrequency,
    });

    /** 5) refs to track changes in validity if needed */
    const prevValidityRef = useRef<boolean | null>(null);
    
    /** )6 Various Helpers */
    // Toast Notification
    const { showToast } = useToast();
    // Helpers for showing side income and household members
    const openSideIncome = () => {
        flushSync(() => {
          setShowSideIncome(true);
        });
    };
    const openHouseholdMembers = () => {
      flushSync(() => {
        setShowHouseholdMembers(true);(true);
      });
    };

    /** 7) Whenever your form changes, check validity, update parent's isStepValid */
    useEffect(() => {
      const valid = Object.keys(validateFn(values)).length === 0; // assume no errors means valid
      if (valid !== prevValidityRef.current) {
        setStepValid(valid);
        prevValidityRef.current = valid;
      }
    }, [values, validateFn, setStepValid]);


    
    /** 8) For sideHustles, we see if any input is non-empty */
    const sideHustleHasValue = values.sideHustles.some((side: SideHustle) =>
      side.name.trim() !== "" || side.income !== ""
    );

    /** 9) Field Handlers */
    // Salary
    const handleSalaryChange = (value: string) => {
      const parsed = value === "" ? null : parseFloat(value);
      setValues((prev: FormValues) => ({ ...prev, netSalary: parsed }));
      markFieldTouched("netSalary");
    };
    const handleSalaryBlur = () => {
      markFieldTouched("netSalary");
      validateField("netSalary");
    };
    // Salary Frequency
    const handleSalaryFrequencyChange = (freq: string) => {
      setValues((prev: FormValues) => ({ ...prev, salaryFrequency: freq }));
      markFieldTouched("salaryFrequency");
    };
    const handleSalaryFrequencyBlur = () => {
      markFieldTouched("salaryFrequency");
      // Optionally call validateFields()
    };

    // Household Member
    const handleMemberChange = (
      index: number,
      field: keyof HouseholdMember,
      value: string
    ) => {
      setValues((prev: FormValues) => {
        const updatedMembers = [...prev.householdMembers];
        updatedMembers[index] = {
          ...updatedMembers[index],
          [field]: value,
        };

        // Recalculate yearly income if needed
        if (field === "income" || field === "frequency") {
          const numericIncome = parseFloat(updatedMembers[index].income) || 0;
          updatedMembers[index].yearlyIncome = calculateYearlyIncome(
            numericIncome,
            updatedMembers[index].frequency
          );
        }

        return { ...prev, householdMembers: updatedMembers };
      });
      markFieldTouched(`member-${index}-${field}`);
    };

    const handleAddMember = () => {
      // Update form state for householdMembers
      setValues((prev: FormValues) => ({
        ...prev,
        householdMembers: [
          ...prev.householdMembers,
          {
            name: "",
            income: "",
            frequency: "monthly",
            yearlyIncome: 0,
          },
        ],
      }));
      showToast(
        <>
          Person tillagd! <br />
          Fyll i uppgifter eller ta bort för att gå vidare.
        </>,
        "success"
      );
    }

    const handleRemoveMember = (index: number) => {
      setValues((prev: FormValues) => {
        const updated = [...prev.householdMembers];
        updated.splice(index, 1);
        return { ...prev, householdMembers: updated };
      });
      // Remove touched and error state for the removed member's fields
      removeFieldState(`memberName-${index}`);
      removeFieldState(`memberIncome-${index}`);
      removeFieldState(`memberFrequency-${index}`);
      
      showToast("Person borttagen!", "error");
    };

    // Side Hustles
    const handleSideHustleChange = (
      index: number,
      field: keyof SideHustle,
      value: string
    ) => {
      setValues((prev: FormValues) => {
        const updated = [...prev.sideHustles];
        updated[index] = { ...updated[index], [field]: value };

        if (field === "income" || field === "frequency") {
          const numericIncome = parseFloat(updated[index].income) || 0;
          updated[index].yearlyIncome = calculateYearlyIncome(
            numericIncome,
            updated[index].frequency
          );
        }
        return { ...prev, sideHustles: updated };
      });
      markFieldTouched(`sideHustle-${index}-${field}`);

    };

    const handleAddSideHustle = () => {
      setValues((prev: FormValues) => ({
        ...prev,
        sideHustles: [
          ...prev.sideHustles,
          { name: "", income: "", frequency: "monthly" },
        ],
      }));
      showToast(
        <>
          Sidoinkomst tillagd! <br />
          Fyll i uppgifter eller ta bort för att gå vidare.
        </>,
        "success"
      );
    };

    const handleRemoveSideHustle = (index: number) => {
      setValues((prev: FormValues) => {
        const updated = [...prev.sideHustles];
        updated.splice(index, 1);
        return { ...prev, sideHustles: updated };
      });
      removeFieldState(`sideHustleName-${index}`);
      removeFieldState(`sideHustleIncome-${index}`);
      removeFieldState(`frequency-${index}`);
      showToast("Sidoinkomst borttagen!", "error");
    };
    
    /** 10) Imperative Handle for the parent */
    useImperativeHandle(ref, () => ({
      validateFields,
      markAllTouched,
      getStepData: () => values,
      getErrors: () => errors,
      openSideIncome: () => setShowSideIncome(true),
      openHouseholdMembers: () => setShowHouseholdMembers(true),
    }));

    if (loading) {
      return (
        <GlassPane>
          <LoadingScreen />
        </GlassPane>
      );
    }

    // -------------------- Render --------------------
    return (
      <GlassPane>
        
      <h3 className="text-3xl font-bold mb-6 text-darkLimeGreen text-center">
        Din ekonomi börjar här! 🚀
      </h3>
  
      <div className="space-y-4 text-lg">
        <p className="text-customBlue1 font-medium">
          📌 <span className="font-semibold">Ange din huvudinkomst.</span>
        </p>
  
        <p className="text-customBlue1 font-medium">
          👥 <span className="font-semibold">Har du delad ekonomi?</span>  
          Lägg till en person med knappen <strong>"Lägg till person"</strong>.
        </p>
  
        <p className="text-customBlue1 font-medium">
          💰 <span className="font-semibold">Har du andra inkomster vid sidan av?</span>  
          Lägg till dem med knappen <strong>"Andra typer av inkomster"</strong>.
        </p>
      </div>

    
        {/* Animated Icon */}
        <div className="flex justify-center mt-4">
          <Lottie animationData={coinsAnimation} className="w-24 h-24" loop />
        </div>
    
        {/* Primary Income Section */}
        <OptionContainer>
        <SalaryField
          netSalary={values.netSalary}
          yearlySalary={yearlySalary}
          salaryFrequency={values.salaryFrequency}
          onSalaryChange={handleSalaryChange}
          onSalaryBlur={handleSalaryBlur}
          onFrequencyChange={handleSalaryFrequencyChange}
          onFrequencyBlur={handleSalaryFrequencyBlur}

          errorNetSalary={errors.netSalary}
          errorSalaryFrequency={errors.salaryFrequency}
          touchedNetSalary={touched.netSalary}
          touchedSalaryFrequency={touched.salaryFrequency}
        />
          
          {yearlySalary !== null && yearlySalary > 0 && (
          <p className="text-customBlue1 text-sm mt-2 bg-white/20 p-2 rounded-lg shadow-md inline-block">
            🏦 <strong>Månadsinkomst: </strong> 
            <span className="text-black font-semibold">
              {(yearlySalary / 12).toLocaleString()} SEK
            </span>
          </p>
        )}

        </OptionContainer>

        {/* Optional Household Members Section */}
        <OptionContainer>
          <div className="flex items-center justify-center mt-4 gap-2">

          <h4 className="text-lg font-semibold mb-2">
            Hushålls&shy;medlemmar&nbsp;(valfritt)
          </h4>       
          <div className="hidden md:block">
            <HelpSection
                  label=""
                  helpText="Alla personer i ditt hushåll vars ekonomi påverkar din budget."
                  detailedHelpText="Hushållsmedlemmar inkluderar alla personer vars ekonomi påverkar den gemensamma budgeten, t.ex. partner, barn eller andra samboende. Du kan ange deras inkomster och utgifter separat för att få en mer komplett budgetöversikt."
                > </HelpSection>
          </div>

          </div>
          <div className="block md:hidden">
            <HelpSection
                  label=""
                  helpText="Alla personer i ditt hushåll vars ekonomi påverkar din budget."
                  detailedHelpText="Hushållsmedlemmar inkluderar alla personer vars ekonomi påverkar den gemensamma budgeten, t.ex. partner, barn eller andra samboende. Du kan ange deras inkomster och utgifter separat för att få en mer komplett budgetöversikt."
                > </HelpSection>
          </div>
          <button
            onClick={() => setShowHouseholdMembers(!showHouseholdMembers)}
            className="mt-2 bg-darkLimeGreen hover:bg-darkBlueMenuColor text-white font-bold py-3 px-6 rounded-xl shadow-md transform hover:scale-105 transition-all"
            >
            {showHouseholdMembers
              ? `Dölj hushålls\u00admedlemmar ❌`
              : `Visa hushålls\u00admedlemmar`}
          </button>
          {shouldShowHouseholdMembers && values.householdMembers.length == 0 && (
          <>  
            <p className="text-customBlue1 text-sm mt-2 bg-white/20 p-2 rounded-lg shadow-md inline-block">
              🏠 Inga hushållsmedlemmar angivna.
            </p>
          </>  
          )}
          {shouldShowHouseholdMembers && (
          <>
          {/* Add button for new household member */}
          <AcceptButton onClick={handleAddMember}>
            ➕ Lägg till person
          </AcceptButton>
            </>
          )  
          }


          {/* Household Member Section */}
          {shouldShowHouseholdMembers  && (
            <>

              {values.householdMembers.map((member: HouseholdMember, index: number) => (
                <div key={index} className="mb-4 border-b border-gray-300 pb-4">
                  {/* HouseholdMemberField for Name */}
                  <HouseholdMemberField
                    label="Namn:"
                    type="text"
                    id={`memberName-${index}`}
                    value={member.name}
                    placeholder="Ange namn"
                    error={errors[`memberName-${index}`]}
                    touched={touched[`memberName-${index}`]}
                    onBlur={() => {
                      markFieldTouched(`memberName-${index}`);
                      validateField(`memberName-${index}`);
                    }}
                    onChange={(e) =>
                      handleMemberChange(index, "name", e.target.value)
                    }
                  />
                  {/* Display the error message if touched & error */}
                  {errors[`memberName-${index}`] && touched[`memberName-${index}`] && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors[`memberName-${index}`]}
                    </p>
                  )}

                  {/* Income Field */}
                  <HouseholdMemberField
                    label="Nettoinkomst:"
                    type="number"
                    id={`memberIncome-${index}`}
                    value={member.income}
                    placeholder="Ange nettoinkomst"
                    error={errors[`memberIncome-${index}`]}
                    touched={touched[`memberIncome-${index}`]}
                    onBlur={() => {
                      markFieldTouched(`memberIncome-${index}`);
                      validateField(`memberIncome-${index}`);
                    }}
                    onChange={(e) =>
                      handleMemberChange(index, "income", e.target.value)
                    }
                    frequency={member.frequency} // If your field component needs freq
                  />
                  {errors[`memberIncome-${index}`] && touched[`memberIncome-${index}`] && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors[`memberIncome-${index}`]}
                    </p>
                  )}

                  {/* Display yearly income if > 0 */}
                  {member.income && parseFloat(member.income) > 0 && (
                    <p className="text-customBlue1 text-sm mt-2 bg-white/20 p-2 rounded-lg shadow-md inline-block">
                      🏦 <strong>Månadsinkomst: </strong>
                      <span className="text-black font-semibold">
                        {(isNaN(member.yearlyIncome) ? 0 : member.yearlyIncome/12).toLocaleString()} SEK
                      </span>
                    </p>
                  )}

                  {/* Frequency */}
                  <HouseholdMemberField
                    label="Lönefrekvens:"
                    type="select"
                    id={`memberFrequency-${index}`}
                    value={member.frequency}
                    options={[
                      { value: "monthly", label: "Per månad" },
                      { value: "weekly", label: "Per vecka" },
                      { value: "quarterly", label: "Per kvartal" },
                      { value: "annually", label: "Årligen" },
                    ]}
                    onBlur={() => markFieldTouched(`memberFrequency-${index}`)}
                    onChange={(e) =>
                      handleMemberChange(index, "frequency", e.target.value)
                    }
                  />
                  {errors[`memberFrequency-${index}`] && touched[`memberFrequency-${index}`] && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors[`memberFrequency-${index}`]}
                    </p>
                  )}

                  {/* Removal Button */}
                  <RemovalButton onClick={() => handleRemoveMember(index)} />
                </div>
              ))}
            </>
          )}
          {/* Household Member Summary (If Collapsed) */}
          {!showHouseholdMembers && values.householdMembers.length > 0 && (
            <div className="mt-2 p-3 bg-white/10 rounded-lg text-customBlue1 shadow-md">
              <p className="text-lg font-semibold">
                🏠 {values.householdMembers.length} hushållsmedlem(mar) totalt – samlad inkomst: {values.householdMembers.reduce(
                    (sum: number, member: HouseholdMember) => sum + Number(member.income),
                    0
                )} SEK/mån. 💸
              </p>
              <p className="text-sm text-gray-300">Klicka på knappen ovan för att redigera.</p>
            </div>
          )}

        </OptionContainer>

        {/* Side Hustle Section */}
        <OptionContainer>  
        {/* Toggle for Side Hustle Income */}
        <div className="flex items-center justify-center mt-4 gap-2">
          <h4 className="text-lg font-semibold mb-2">Övriga inkomster (valfritt) </h4>
          <HelpSection
                label=""
                helpText="All typ av inkomst vid sidan av din huvudsakliga inkomstkälla."
                detailedHelpText="Andra former av inkomster är all typ av inkomst vid sidan av din huvudsakliga inkomstkälla. Exempel: Frilansarbete, extrajobb, eget företag, uthyrning, passiv inkomst eller olika former av bidrag såsom barnbidrag, bostadsbidrag och studiestöd."
              > </HelpSection>
        </div>

        <button
        onClick={() => setShowSideIncome(!showSideIncome)}
          className={`mt-2 bg-darkLimeGreen hover:bg-darkBlueMenuColor text-white font-bold py-3 px-6 rounded-xl shadow-md transform hover:scale-105  transition-all
          }`}
        >
          {showSideIncome
            ? "Dölj andra former av inkomster ❌"
            : "Visa andra former av inkomster "}
        </button>
        {/* Side Hustle Summary (If Collapsed) */}
        {!shouldShowSideIncome  && values.sideHustles.length > 0 && (
          <div className="mt-2 p-3 bg-white/10 rounded-lg text-customBlue1 shadow-md">
            <p className="text-lg font-semibold">
              💼 {values.sideHustles.length} sidoinkomst(er) totalt – {values.sideHustles.reduce(
                  (sum: number, s: SideHustle) => sum + Number(s.income),
                  0
              )} SEK/mån. 💸
            </p>
            <p className="text-sm text-gray-300">Klicka på knappen ovan för att redigera.</p>
          </div>
        )}

        {/* Side Hustle Section */}
        {shouldShowSideIncome && (
          <OptionContainer>
            {/* Show existing side hustles or an empty input for a new one */}
            {values.sideHustles.length === 0 && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mb-2 text-lg font-semibold text-customBlue1 text-center bg-white/10 px-4 py-2 rounded-lg shadow-md"
            >
              🧐 Finns det en extra inkomst vi missar?
              Lägg till den här så vi får en full bild av din ekonomi! 💸
            </motion.p>
          )}
          {values.sideHustles.map((side: SideHustle, index: number) => (
            <div key={index} className="mb-4 border-b border-gray-300 pb-4">
              <SideHustleField
                label="Sidoinkomstens namn:"
                type="text"
                id={`sideHustleName-${index}`}
                value={side.name}
                error={errors[`sideHustleName-${index}`]}
                touched={touched[`sideHustleName-${index}`]}
                placeholder="Ange sidoinkomstens namn"
                onBlur={() => {
                  markFieldTouched(`sideHustleName-${index}`);
                  validateField(`sideHustleName-${index}`);

                }}
                onChange={(e) =>
                  handleSideHustleChange(index, "name", e.target.value)
                }
              />
              {errors[`sideHustleName-${index}`] && touched[`sideHustleName-${index}`] && (
                <p className="text-red-500 text-sm mt-1">
                  {errors[`sideHustleName-${index}`]}
                </p>
              )}

              <SideHustleField
                label="Sidoinkomst netto(SEK):"
                type="number"
                id={`sideHustleIncome-${index}`}
                value={side.income}
                error={errors[`sideHustleIncome-${index}`]}
                onChange={(e) =>
                  handleSideHustleChange(index, "income", e.target.value)
                }
                placeholder="Ange nettoinkomst"
                touched={touched[`sideHustleIncome-${index}`]}
                onBlur={() => {
                  markFieldTouched(`sideHustleIncome-${index}`);
                  validateField(`sideHustleIncome-${index}`);

                }}
                yearlyIncome={side.yearlyIncome}
              />
              {errors[`sideHustleIncome-${index}`] &&
                touched[`sideHustleIncome-${index}`] && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors[`sideHustleIncome-${index}`]}
                  </p>
                )}

              <SideHustleField
                label="Inkomstfrekvens:"
                type="select"
                id={`sideHustleFrequency-${index}`}
                value={side.frequency}
                onChange={(e) =>
                  handleSideHustleChange(index, "frequency", e.target.value)
                }
                options={[
                  { value: "monthly", label: "Per månad" },
                  { value: "weekly", label: "Per vecka" },
                  { value: "quarterly", label: "Per kvartal" },
                  { value: "annually", label: "Årligen" },
                ]}
                onBlur={() => markFieldTouched(`frequency-${index}`)}
              />
              {errors[`sideHustleFrequency-${index}`] &&
                touched[`frequency-${index}`] && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors[`sideHustleFrequency-${index}`]}
                  </p>
                )}

              <RemovalButton onClick={() => handleRemoveSideHustle(index)} />
              </div>
            ))}
              <AcceptButton onClick={handleAddSideHustle}>
              ➕ Lägg till sidoinkomst
              </AcceptButton>
            </OptionContainer>
          )}
         </OptionContainer>
        {/* Data Transparency Section */}
        <DataTransparencySection />
      </GlassPane>
    );
  }
);

export default StepBudgetIncome;
