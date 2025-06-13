import React, { useState } from "react";
import { useFormContext } from "react-hook-form";
import { AnimatePresence, motion } from "framer-motion";
import { Car, ChevronDown } from "lucide-react";
import FormattedNumberInput from "@components/atoms/InputField/FormattedNumberInput";
import { Card, CardContent } from "@/components/ui/card";
import HelpSection from "@components/molecules/helptexts/HelpSection";

interface VehicleForm {
  transport: {
    monthlyFuelCost: number | null;
    monthlyInsuranceCost: number | null;
    monthlyTotalCarCost: number | null;
  };
}

export const VehicleCosts: React.FC = () => {
  const { register, watch, setValue, formState: { errors } } = useFormContext<VehicleForm>();
  const [isOpen, setIsOpen] = useState(false);

  const [fuel, insurance, other] = watch([
    "transport.monthlyFuelCost",
    "transport.monthlyInsuranceCost",
    "transport.monthlyTotalCarCost",
  ]);
  const totalVehicleCost = (fuel ?? 0) + (insurance ?? 0) + (other ?? 0);

  const fuelReg = register("transport.monthlyFuelCost");
  const insuranceReg = register("transport.monthlyInsuranceCost");
  const totalCarCostReg = register("transport.monthlyTotalCarCost");

  const helpTextMisc = "Här kan du ange kostnader för lån, skatt, parkering och service. Om du leasar eller hyr ett fordon anger du med fördel den kostnaden här. Om du inte har några sådana kostnader, lämna fältet tomt.";

  return (
    <Card className="bg-gradient-to-br from-pastelGreen/50 to-customBlue1/20 shadow-lg rounded-2xl overflow-hidden">
      <button type="button" onClick={() => setIsOpen(!isOpen)} className="w-full text-left">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center cursor-pointer">
            

            <div className="flex items-center gap-3 justify-center lg:justify-start">
              <Car className="w-6 h-6 text-black flex-shrink-0" /> {/* Added flex-shrink-0 to be safe */}
              <span className="font-semibold text-sm lg:text-base text-standardMenuColor/90 dark:text-standardMenuColor">
                Fordonskostnader
              </span>
            </div>

            <div className="flex items-center justify-between w-full lg:w-auto mt-2 lg:mt-0 lg:gap-3">
              <span className={`
                font-semibold text-green-700 dark:text-lime-200 transition-opacity duration-300
                ${!isOpen && totalVehicleCost > 0 ? 'opacity-100' : 'opacity-0'}
              `}>
                {totalVehicleCost.toLocaleString('sv-SE')} kr/mån
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
           <motion.div key="car-fields" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3, ease: "easeInOut" }} className="px-6 pb-6">
             <div className="pt-4 border-t border-white/20 space-y-4">
               <div>
                 <label htmlFor="monthlyFuelCost" className="block text-sm font-medium text-standardMenuColor/90 dark:text-standardMenuColor">Drivmedel per månad</label>
                 <FormattedNumberInput id="monthlyFuelCost" value={watch("transport.monthlyFuelCost") ?? 0} onValueChange={(val) => setValue("transport.monthlyFuelCost", val ?? null, { shouldValidate: true })} placeholder="t.ex. 1 500 kr" name={fuelReg.name} onBlur={fuelReg.onBlur} error={errors.transport?.monthlyFuelCost?.message} />
               </div>
               <div>
                 <label htmlFor="monthlyInsuranceCost" className="block text-sm font-medium text-standardMenuColor/90 dark:text-standardMenuColor">Försäkring per månad</label>
                 <FormattedNumberInput id="monthlyInsuranceCost" value={watch("transport.monthlyInsuranceCost") ?? 0} onValueChange={(val) => setValue("transport.monthlyInsuranceCost", val ?? null, { shouldValidate: true })} placeholder="t.ex. 500 kr" name={insuranceReg.name} onBlur={insuranceReg.onBlur} error={errors.transport?.monthlyInsuranceCost?.message} />
               </div>
               <div>
                 <div className="flex items-center justify-between gap-1">
                   <label htmlFor="monthlyTotalCarCost" className="block text-sm font-medium text-standardMenuColor/90 dark:text-standardMenuColor">
                     Övrigt (lån, skatt, parkering, service)
                   </label>
                   <HelpSection label="" className="flex-shrink-0" helpText={helpTextMisc} />
                 </div>
                 <FormattedNumberInput id="monthlyTotalCarCost" value={watch("transport.monthlyTotalCarCost") ?? 0} onValueChange={(val) => setValue("transport.monthlyTotalCarCost", val ?? null, { shouldValidate: true })} placeholder="t.ex. 3 000 kr" name={totalCarCostReg.name} onBlur={totalCarCostReg.onBlur} error={errors.transport?.monthlyTotalCarCost?.message} />
               </div>
             </div>
           </motion.div>
         )}
      </AnimatePresence>
    </Card>
  );
};