import NumberInput from "@components/atoms/InputField/NumberInput";
import SelectDropdown from "@components/atoms/dropdown/SelectDropdown";
import HelpSection from "@components/molecules/helptexts/HelpSection";

interface SalaryFieldProps {
  netSalary: number | null;
  yearlySalary: number | null;
  salaryFrequency: string;
  
  // Callbacks for changes & blurs
  onSalaryChange: (value: string) => void;
  onSalaryBlur: () => void;
  onFrequencyChange: (value: string) => void;
  onFrequencyBlur: () => void;

  // Error/touched display
  errorNetSalary?: string; 
  errorSalaryFrequency?: string;
  touchedNetSalary?: boolean;
  touchedSalaryFrequency?: boolean;
}

const SalaryField: React.FC<SalaryFieldProps> = ({
  netSalary,
  yearlySalary,
  salaryFrequency,
  onSalaryChange,
  onSalaryBlur,
  onFrequencyChange,
  onFrequencyBlur,
  errorNetSalary,
  errorSalaryFrequency,
  touchedNetSalary,
  touchedSalaryFrequency,
}) => {

  // Toggle help text
  const frequencyHelpText = "Välj hur ofta du får din inkomst utbetald.";
  const detailedHelpText =
    "Detta representerar din huvudsakliga inkomstkälla. Exempel inkluderar lön, A-kassa, sjukpenning, pension eller försörjningsstöd.";

  return (
    <div className="relative">
      {/* Primary Income label & help icon */}
      <div
        className="block text-sm font-medium flex items-center gap-1"
        onClick={(e) => e.stopPropagation()}
        >
        <span>Huvudinkomst (SEK)</span>
        {/* tooltip */}
        <HelpSection
          label=""
          helpText= {
            <>
              {detailedHelpText} <br />
              Räkna ut din nettolön med hjälp av Skatteverkets verktyg
              {" "}
              <a
                href="https://www7.skatteverket.se/portal/inkomst-efter-skatt-se-tabell"
                target="_blank"
                rel="noopener noreferrer"
                className="text-darkLimeGreen underline"
              >
                här
              </a>{" "}
            </>
          }
        > </HelpSection> 
      </div>
      {/* Net Salary Input */}
      <NumberInput
        name="netSalary"
        id="netSalary"
        value={netSalary === null ? "" : netSalary}
        onChange={(e) => onSalaryChange(e.target.value)}
        placeholder="Ange din nettoinkomst"
        touched={touchedNetSalary}
        error={touchedNetSalary && errorNetSalary ? errorNetSalary : undefined}
        onBlur={() => onSalaryBlur()}
      />

      {/* error message */}
      {touchedNetSalary && errorNetSalary && (
        <p className="text-red-500 text-sm mt-1">{errorNetSalary}</p>
      )}

      {/* Frequency label & help icon */}
      <div className="relative mt-4">
        <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-1">
          <span className="block text-sm font-medium">Lönefrekvens:</span>
          {/* tooltip */}
          <HelpSection
            label=""
            helpText= {
              <>
                {frequencyHelpText} 
              </>
            }
          > </HelpSection> 
        </div>
      </div>

      {/* Frequency Dropdown */}
      <SelectDropdown
        value={salaryFrequency}
        onChange={(e) => onFrequencyChange(e.target.value)}
        onBlur={() => onFrequencyBlur()}
        options={[
          { value: "monthly", label: "Per månad" },
          { value: "weekly", label: "Per vecka" },
          { value: "quarterly", label: "Per kvartal" },
          { value: "annually", label: "Årligen" },
        ]}
        error={
          touchedSalaryFrequency && errorSalaryFrequency
            ? errorSalaryFrequency
            : undefined
        }
      />
    </div>
  );
};

export default SalaryField;
