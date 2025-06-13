import React, { useState } from "react";
import { useFormContext } from "react-hook-form";
import { AnimatePresence, motion } from "framer-motion";
import { Train, ChevronDown } from "lucide-react";
import FormattedNumberInput from "@components/atoms/InputField/FormattedNumberInput";
import { Card, CardContent } from "@/components/ui/card";
import HelpSection from "@components/molecules/helptexts/HelpSection";

interface TransitForm {
  transport: {
    monthlyTransitCost: number | null;
  };
}

export const TransitCosts: React.FC = () => {
  const { register, watch, setValue, formState: { errors } } = useFormContext<TransitForm>();
  const [isOpen, setIsOpen] = useState(false);

  const monthlyTransitCost = watch("transport.monthlyTransitCost");
  const transitReg = register("transport.monthlyTransitCost");

  const transitHelpText = "Ange den totala kostnaden för alla dina biljetter, som månadskort, periodkort eller enkelbiljetter, som du köper under en genomsnittlig månad.";

  return (
    <Card className="bg-gradient-to-br from-customBlue1/40 to-customBlue2/20 shadow-lg rounded-2xl overflow-hidden">
      <button type="button" onClick={() => setIsOpen(!isOpen)} className="w-full text-left">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center cursor-pointer">


            <div className="flex items-center gap-3 justify-center lg:justify-start">
              <Train className="w-6 h-6 text-darkBlueMenuColor flex-shrink-0" /> {/* Added flex-shrink-0 to be safe */}
              <span className="font-semibold text-sm lg:text-base text-standardMenuColor/90 dark:text-standardMenuColor">
                Kollektivtrafik
              </span>
            </div>

            <div className="flex items-center justify-between w-full lg:w-auto mt-2 lg:mt-0 lg:gap-3">
              <span className={`
                font-semibold text-green-700 dark:text-blue-200 transition-opacity duration-300
                ${!isOpen && monthlyTransitCost && monthlyTransitCost > 0 ? 'opacity-100' : 'opacity-0'}
              `}>
                {monthlyTransitCost?.toLocaleString('sv-SE')} kr/mån
              </span>
              
              <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronDown className="w-5 h-5 text-standardMenuColor/90 dark:text-standardMenuColor" />
              </motion.div>
            </div>

          </div>
        </CardContent>
      </button>

      <AnimatePresence initial={false}>

        {isOpen && (
          <motion.div key="transit-fields" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3, ease: "easeInOut" }} className="px-6 pb-6">
            <div className="pt-4 border-t border-white/20 space-y-4">
              <div>
                <div className="flex items-center justify-between gap-1">
                  <label htmlFor="monthlyTransitCost" className="block text-sm font-medium text-standardMenuColor/90 dark:text-standardMenuColor">
                    Månadskostnad
                  </label>
                  <HelpSection label="" className="flex-shrink-0" helpText={transitHelpText} />
                </div>
                <FormattedNumberInput id="monthlyTransitCost" value={watch("transport.monthlyTransitCost") ?? 0} onValueChange={(val) => setValue("transport.monthlyTransitCost", val ?? null, { shouldValidate: true })} placeholder="t.ex. 900 kr" name={transitReg.name} onBlur={transitReg.onBlur} error={errors.transport?.monthlyTransitCost?.message} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
};