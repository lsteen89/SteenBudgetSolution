import React from "react";
import { useFormContext } from "react-hook-form";
import OptionContainer from "@components/molecules/containers/OptionContainer";
import Checkbox from "@components/atoms/boxes/Checkbox";
import FormattedNumberInput from "@components/atoms/InputField/FormattedNumberInput";

interface TransportForm {
  transport: {
    hasCar: boolean;
    monthlyFuelCost: number | null;
    hasTransitCard: boolean;
    monthlyTransitCost: number | null;
  };
}

const SubStepTransport: React.FC = () => {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<TransportForm>();

  const hasCar = watch("transport.hasCar");
  const hasTransit = watch("transport.hasTransitCard");

  const fuelReg = register("transport.monthlyFuelCost");
  const transitReg = register("transport.monthlyTransitCost");

  return (
    <OptionContainer>
      <h3 className="text-2xl font-bold text-darkLimeGreen mb-6 text-center">
        Transportkostnader
      </h3>
      <div className="space-y-6">
        <div>
          <Checkbox label="Jag har bil" {...register("transport.hasCar")}
            checked={hasCar} />
          {hasCar && (
            <div className="mt-4">
              <label htmlFor="monthlyFuelCost" className="block text-sm font-medium">
                Kostnad för drivmedel per månad
              </label>
              <FormattedNumberInput
                id="monthlyFuelCost"
                value={watch("transport.monthlyFuelCost") ?? 0}
                onValueChange={(val) => setValue("transport.monthlyFuelCost", val ?? 0)}
                placeholder="t.ex. 1500 kr"
                name={fuelReg.name}
                onBlur={fuelReg.onBlur}
                error={errors.transport?.monthlyFuelCost?.message}
              />
            </div>
          )}
        </div>
        <div>
          <Checkbox label="Jag har månadskort i kollektivtrafiken" {...register("transport.hasTransitCard")}
            checked={hasTransit} />
          {hasTransit && (
            <div className="mt-4">
              <label htmlFor="monthlyTransitCost" className="block text-sm font-medium">
                Kostnad för månadskort
              </label>
              <FormattedNumberInput
                id="monthlyTransitCost"
                value={watch("transport.monthlyTransitCost") ?? 0}
                onValueChange={(val) => setValue("transport.monthlyTransitCost", val ?? 0)}
                placeholder="t.ex. 900 kr"
                name={transitReg.name}
                onBlur={transitReg.onBlur}
                error={errors.transport?.monthlyTransitCost?.message}
              />
            </div>
          )}
        </div>
      </div>
    </OptionContainer>
  );
};

export default SubStepTransport;

