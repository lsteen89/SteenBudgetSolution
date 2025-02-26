import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import Lottie from "lottie-react";
import { ShieldCheck } from "lucide-react";
import coinsAnimation from "@assets/lottie/coins.json";
// Components
import GlassPane from "./GlassPane";
import OptionContainer from "@components/molecules/containers/OptionContainer";
import SalaryField from "@components/molecules/forms/SalaryField";
import HouseholdMemberField from "@components/molecules/forms/HouseholdMemberField";
import SideHustleField from "@components/molecules/forms/SideHustleField";
import RemovalButton from "@components/atoms/buttons/RemovalButton";
import AcceptButton from "@components/atoms/buttons/AcceptButton";
import HelpSection from "@components/molecules/helptexts/HelpSection";

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

const areObjectsEqual = (obj1: any, obj2: any): boolean =>
  JSON.stringify(obj1) === JSON.stringify(obj2);

const StepBudgetInfo: React.FC<{ setStepValid: (isValid: boolean) => void }> = ({
  setStepValid,
}) => {
  const [showSideIncome, setShowSideIncome] = useState(false);
  const [netSalary, setNetSalary] = useState<number | null>(null);
  const [yearlySalary, setYearlySalary] = useState<number>(0);
  const [salaryFrequency, setSalaryFrequency] = useState("monthly");
  const [isHousehold, setIsHousehold] = useState(false);
  const [householdMembers, setHouseholdMembers] = useState<HouseholdMember[]>([
    { name: "", income: "", frequency: "monthly", yearlyIncome: 0 },
  ]);
  const [sideHustles, setSideHustles] = useState<SideHustle[]>([
    { name: "", income: "", frequency: "monthly" },
  ]);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});

  // Ref to hold previous errors to compare changes.
  const prevErrorsRef = useRef<{ [key: string]: string }>({});

  const prevValidityRef = useRef<boolean | null>(null);

  useEffect(() => {
    calculateYearlySalary();
  }, [netSalary, salaryFrequency]);

  const calculateYearlySalary = () => {
    if (netSalary === null) {
      setYearlySalary(0);
      return;
    }
    let salary = netSalary;
    switch (salaryFrequency) {
      case "weekly":
        salary *= 52;
        break;
      case "quarterly":
        salary *= 4;
        break;
      case "annually":
        break;
      case "monthly":
      default:
        salary *= 12;
        break;
    }
    setYearlySalary(salary);
  };

  const handleSalaryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const parsedValue = inputValue === "" ? null : parseFloat(inputValue);
    setNetSalary(parsedValue);
    setTouched((prev) => ({ ...prev, netSalary: true }));
  };

  const handleMemberChange = (
    index: number,
    field: keyof HouseholdMember,
    value: string
  ) => {
    setHouseholdMembers((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value, 
      };
  
      // Recalculate yearlyIncome if user changes 'income' or 'frequency'
      if (field === "income" || field === "frequency") {
        const numericIncome = parseFloat(updated[index].income) || 0;
        let calculatedIncome = numericIncome;
        switch (updated[index].frequency) {
          case "weekly":
            calculatedIncome *= 52;
            break;
          case "quarterly":
            calculatedIncome *= 4;
            break;
          case "annually":
            // No multiplication needed
            break;
          case "monthly":
          default:
            calculatedIncome *= 12;
            break;
        }
        updated[index].yearlyIncome = calculatedIncome;
      }
  
      return updated;
    });
    setTouched((prev) => ({ ...prev, [`${field}-${index}`]: true }));
  };

  const handleAddMember = () => {
    setHouseholdMembers((prev) => [
      ...prev,
      { name: "", income: "", frequency: "monthly", yearlyIncome: 0 },
    ]);
  };

  const handleRemoveMember = (index: number) => {
    setHouseholdMembers((prev) => prev.filter((_, i) => i !== index));
    setErrors((prevErrors) => {
      const newErrors = { ...prevErrors };
      Object.keys(newErrors).forEach((key) => {
        if (
          key.startsWith(`memberName-${index}`) ||
          key.startsWith(`memberIncome-${index}`) ||
          key.startsWith(`memberFrequency-${index}`)
        ) {
          delete newErrors[key];
        }
      });
      return newErrors;
    });
    setTouched((prevTouched) => {
      const newTouched = { ...prevTouched };
      Object.keys(newTouched).forEach((key) => {
        if (
          key.startsWith(`name-${index}`) ||
          key.startsWith(`income-${index}`) ||
          key.startsWith(`frequency-${index}`)
        ) {
          delete newTouched[key];
        }
      });
      return newTouched;
    });
  };

  const handleSideHustleChange = (
    index: number,
    field: keyof SideHustle,
    value: string
  ) => {
    setSideHustles((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value, // store as string
      };
  
      if (field === "income" || field === "frequency") {
        const numericIncome = parseFloat(updated[index].income) || 0;
        let calculatedIncome = numericIncome;
        switch (updated[index].frequency) {
          case "weekly":
            calculatedIncome *= 52;
            break;
          case "quarterly":
            calculatedIncome *= 4;
            break;
          case "annually":
            // No multiplication needed
            break;
          case "monthly":
          default:
            calculatedIncome *= 12;
            break;
        }

        updated[index].yearlyIncome = calculatedIncome;
      }
  
      return updated;
    });
  
    // Mark the field as touched for validation
    setTouched((prev) => ({ ...prev, [`${field}-${index}`]: true }));
  };

  const handleAddSideHustle = () => {
    setSideHustles((prev) => [...prev, { name: "", income: "", frequency: "monthly" }]);
  };

  const handleRemoveSideHustle = (index: number) => {
    setSideHustles((prev) => prev.filter((_, i) => i !== index));
    setErrors((prevErrors) => {
      const newErrors = { ...prevErrors };
      Object.keys(newErrors).forEach((key) => {
        if (
          key.startsWith(`sideHustleName-${index}`) ||
          key.startsWith(`sideHustleIncome-${index}`) ||
          key.startsWith(`sideHustleFrequency-${index}`)
        ) {
          delete newErrors[key];
        }
      });
      return newErrors;
    });
    setTouched((prevTouched) => {
      const newTouched = { ...prevTouched };
      Object.keys(newTouched).forEach((key) => {
        if (
          key.startsWith(`name-${index}`) ||
          key.startsWith(`income-${index}`) ||
          key.startsWith(`frequency-${index}`)
        ) {
          delete newTouched[key];
        }
      });
      return newTouched;
    });
  };

  const sideHustleHasValue = sideHustles.some(
    (side) => side.name.trim() !== "" || side.income !== ""
  );

  // Validate without including errors in dependencies.
  const validateFields = useCallback((): boolean => {
    let isValid = true;
    const newErrors: { [key: string]: string } = {};

    if (!isHousehold) {
      if (netSalary === null || netSalary === 0) {
        isValid = false;
        newErrors.netSalary = "Ange din primära inkomst.";
      }
      if (salaryFrequency === "") {
        isValid = false;
        newErrors.salaryFrequency = "Välj lönefrekvens.";
      }
    } else {
      if (householdMembers.length === 0) {
        isValid = false;
        newErrors.householdMembers = "Lägg till minst en hushållsmedlem.";
      } else {
        householdMembers.forEach((member, index) => {
          if (member.name.trim() === "") {
            isValid = false;
            newErrors[`memberName-${index}`] = "Ange namn.";
          }
          if (member.income === "") {
            isValid = false;
            newErrors[`memberIncome-${index}`] = "Ange inkomst.";
          }
          if (member.frequency === "") {
            isValid = false;
            newErrors[`memberFrequency-${index}`] = "Välj frekvens.";
          }
        });
      }
    }

    if (showSideIncome) {
      sideHustles.forEach((side, index) => {
        if (side.name.trim() === "") {
          isValid = false;
          newErrors[`sideHustleName-${index}`] = "Ange namn för inkomst.";
        }
        if (side.income.trim() === "") {
          isValid = false;
          newErrors[`sideHustleIncome-${index}`] = "Ange inkomstens storlek.";
        }
        if (side.frequency === "") {
          isValid = false;
          newErrors[`sideHustleFrequency-${index}`] = "Välj inkomstens frekvens.";
        }
      });
    }

    // Only update errors if they've changed
    if (!areObjectsEqual(newErrors, prevErrorsRef.current)) {
      setErrors(newErrors);
      prevErrorsRef.current = newErrors;
    }
    return isValid;
  }, [
    netSalary,
    salaryFrequency,
    isHousehold,
    householdMembers,
    showSideIncome,
    sideHustles,
  ]);

  useEffect(() => {
    const valid = validateFields();
    if (prevValidityRef.current !== valid) {
      setStepValid(valid);
      prevValidityRef.current = valid;
    }
  }, [
    netSalary,
    salaryFrequency,
    isHousehold,
    householdMembers,
    showSideIncome,
    sideHustles,
    validateFields,
  ]);

  return (
    <GlassPane>
      <h3 className="text-2xl font-semibold mb-4 text-darkLimeGreen">
        Din ekonomi börjar här! 🚀
      </h3>
      <p className="text-customBlue1">
        Vi börjar med att titta på dina inkomster. Nedan följer uppgifter vi behöver
        för att göra en sammanställning.
      </p>
      <br />
      <p className="text-customBlue1">
        Sätter du upp en budget för enbart dig själv eller för flera personer?
      </p>

      {/* Household/Individual Toggle */}
      <div className="mt-4 flex justify-center">
        <label className="inline-flex items-center mr-4">
          <input
            type="radio"
            className="form-radio text-darkLimeGreen"
            checked={!isHousehold}
            onChange={() => {
              setIsHousehold(false);
              setHouseholdMembers([]);
              // Clean up household-related errors and touched state.
              setErrors((prev) => {
                const newErrors: { [key: string]: string } = {};
                Object.keys(prev).forEach((key) => {
                  if (
                    !key.startsWith("memberName-") &&
                    !key.startsWith("memberIncome-") &&
                    !key.startsWith("memberFrequency-")
                  ) {
                    newErrors[key] = prev[key];
                  }
                });
                return newErrors;
              });
              setTouched((prev) => {
                const newTouched: { [key: string]: boolean } = {};
                Object.keys(prev).forEach((key) => {
                  if (
                    !key.startsWith("name-") &&
                    !key.startsWith("income-") &&
                    !key.startsWith("frequency-")
                  ) {
                    newTouched[key] = prev[key];
                  }
                });
                return newTouched;
              });
            }}
          />
          <span className="ml-2">En person</span>
        </label>
        <label className="inline-flex items-center">
          <input
            type="radio"
            className="form-radio text-darkLimeGreen"
            checked={isHousehold}
            onChange={() => {
              setIsHousehold(true);
              setNetSalary(null);
              setSalaryFrequency("monthly");
              // Clean up individual salary errors and touched state.
              setErrors((prev) => {
                const newErrors: { [key: string]: string } = {};
                Object.keys(prev).forEach((key) => {
                  if (key !== "netSalary" && key !== "salaryFrequency") {
                    newErrors[key] = prev[key];
                  }
                });
                return newErrors;
              });
              setTouched((prev) => {
                const newTouched: { [key: string]: boolean } = {};
                Object.keys(prev).forEach((key) => {
                  if (key !== "netSalary" && key !== "salaryFrequency") {
                    newTouched[key] = prev[key];
                  }
                });
                return newTouched;
              });
            }}
          />
          <span className="ml-2">Flera personer</span>
        </label>
      </div>

      {/* Animated Icon */}
      <div className="flex justify-center mt-4">
        <Lottie animationData={coinsAnimation} className="w-24 h-24" loop={true} />
      </div>

      {/* Individual Salary Section */}
      {!isHousehold && (
        <OptionContainer>
          <SalaryField
            netSalary={netSalary}
            yearlySalary={yearlySalary}
            salaryFrequency={salaryFrequency}
            handleSalaryChange={handleSalaryChange}
            setSalaryFrequency={setSalaryFrequency}
            errors={errors}
            touched={touched}
            setTouched={setTouched}
            validateFields={validateFields}
          />
        </OptionContainer>
      )}

      {/* Household Members Section */}
      {isHousehold && (
        <OptionContainer>
          <h4 className="text-lg font-semibold mb-2">Hushållsmedlemmar</h4>
          {householdMembers.map((member, index) => (
          <div key={index} className="mb-4 border-b border-gray-300 pb-4">
            <HouseholdMemberField
              label="Namn:"
              type="text"
              id={`memberName-${index}`}
              value={member.name}
              onChange={(e) => handleMemberChange(index, "name", e.target.value)}
              placeholder="Ange namn"
              onBlur={() =>
                setTouched((prev) => ({ ...prev, [`name-${index}`]: true }))
              }
            />
            {errors[`memberName-${index}`] && touched[`name-${index}`] && (
              <p className="text-red-500 text-sm mt-1">
                {errors[`memberName-${index}`]}
              </p>
            )}

            <HouseholdMemberField
              label="Inkomst (SEK):"
              type="number"
              id={`memberIncome-${index}`}
              value={member.income === "" ? "" : member.income}
              onChange={(e) => handleMemberChange(index, "income", e.target.value)}
              placeholder="Ange inkomst"
              yearlyIncome={member.yearlyIncome}

              frequency={member.frequency}
              onBlur={() =>
                setTouched((prev) => ({ ...prev, [`income-${index}`]: true }))
              }
            />
            {errors[`memberIncome-${index}`] && touched[`income-${index}`] && (
              <p className="text-red-500 text-sm mt-1">
                {errors[`memberIncome-${index}`]}
              </p>
            )}

            <HouseholdMemberField
              label="Lönefrekvens:"
              type="select"
              id={`memberFrequency-${index}`}
              value={member.frequency}
              onChange={(e) => handleMemberChange(index, "frequency", e.target.value)}
              options={[
                { value: "monthly", label: "Per månad" },
                { value: "weekly", label: "Per vecka" },
                { value: "quarterly", label: "Per kvartal" },
                { value: "annually", label: "Årligen" },
              ]}
              frequency={member.frequency}
              onBlur={() =>
                setTouched((prev) => ({ ...prev, [`frequency-${index}`]: true }))
              }
            />
            {errors[`memberFrequency-${index}`] &&
              touched[`frequency-${index}`] && (
                <p className="text-red-500 text-sm mt-1">
                  {errors[`memberFrequency-${index}`]}
                </p>
              )}

            <RemovalButton onClick={() => handleRemoveMember(index)} />
          </div>
        ))}

          <AcceptButton onClick={handleAddMember}>
            Lägg till medlem
          </AcceptButton>
        </OptionContainer>
      )}

      {/* Toggle for Side Hustle Income */}
      <div className="flex items-center justify-center gap-2 mt-4">
        <button
          onClick={() => setShowSideIncome(!showSideIncome)}
          disabled={showSideIncome && sideHustleHasValue}
          className={`mt-4 text-white font-bold py-2 px-6 rounded-lg shadow-lg transition-all ${
            showSideIncome && sideHustleHasValue
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-darkLimeGreen hover:bg-green-700"
          }`}
        >
          {showSideIncome
            ? "Dölj andra former av inkomster ❌"
            : "Andra former av inkomster "}
        </button>

        <HelpSection
        label=""
        helpText="All typ av inkomst vid sidan av din huvudsakliga inkomstkälla."
        detailedHelpText="Andra former av inkomster är all typ av inkomst vid sidan av din huvudsakliga inkomstkälla. Exempel: Frilansarbete, extrajobb, eget företag, uthyrning, passiv inkomst eller olika former av bidrag såsom barnbidrag, bostadsbidrag och studiestöd."
      > </HelpSection>
      </div>

      {/* Side Hustle Section */}
      {showSideIncome && (
        <OptionContainer>
          {sideHustles.map((side, index) => (
            <div key={index} className="mb-4 border-b border-gray-300 pb-4">
              <SideHustleField
                label="Inkomstens namn:"
                type="text"
                id={`sideHustleName-${index}`}
                value={side.name}
                onChange={(e) =>
                  handleSideHustleChange(index, "name", e.target.value)
                }
                placeholder="Ange namn för inkomst"
                onBlur={() =>
                  setTouched((prev) => ({ ...prev, [`name-${index}`]: true }))
                }
              />
              {errors[`sideHustleName-${index}`] &&
                touched[`name-${index}`] && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors[`sideHustleName-${index}`]}
                  </p>
                )}

              <SideHustleField
                label="Inkomst (SEK):"
                type="number"
                id={`sideHustleIncome-${index}`}
                value={side.income} 
                onChange={(e) => handleSideHustleChange(index, "income", e.target.value)}
                placeholder="Ange inkomst"
                onBlur={() => setTouched((prev) => ({ ...prev, [`income-${index}`]: true }))}
                yearlyIncome={side.yearlyIncome}  
              />
              {errors[`sideHustleIncome-${index}`] &&
                touched[`income-${index}`] && (
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
                onBlur={() =>
                  setTouched((prev) => ({ ...prev, [`frequency-${index}`]: true }))
                }
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
            Lägg till inkomst
          </AcceptButton>
        </OptionContainer>
      )}

      {/* Data Transparency Section */}
      <div className="mt-6 border-t border-gray-500 pt-4 text-sm text-customBlue1 flex flex-col items-center">
        <ShieldCheck className="w-10 h-10 text-darkLimeGreen mb-2" />
        <p className="text-center max-w-md">
          Vi samlar in dessa uppgifter för att kunna ge dig en bättre upplevelse och
          hjälpa dig att hantera din ekonomi. Vi skyddar din data och delar den aldrig med
          tredje part. Läs mer i vår{" "}
          <Link to="/data-policy" className="text-standardMenuColor underline hover:text-white">
            dataskyddspolicy
          </Link>.
        </p>
      </div>
    </GlassPane>
  );
};

export default StepBudgetInfo;
