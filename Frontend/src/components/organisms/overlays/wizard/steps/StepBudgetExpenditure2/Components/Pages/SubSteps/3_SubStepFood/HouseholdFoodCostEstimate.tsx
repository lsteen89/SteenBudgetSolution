import React, { useState, useEffect } from "react";
import { useFormContext } from "react-hook-form";
// components
import GoodButton from "@components/atoms/buttons/GoodButton";
import FormattedNumberInput from "@components/atoms/InputField/FormattedNumberInput";
import HelpSection from "@components/molecules/helptexts/HelpSection";
import NumberDropdownInput from "@components/atoms/InputField/NumberDropdown";
import CustomNumberDropdown from "@components/atoms/dropdown/CustomNumberDropdown";
import SmartDropdown from "@components/atoms/dropdown/SmartDropdown";
// icons
import { MdLocalGroceryStore } from "react-icons/md";
import { FaHamburger } from "react-icons/fa";

// interfaces
interface HouseholdFoodCostEstimateProps {
  foodStoreRef: React.RefObject<HTMLDivElement>;
  takeAwayRef: React.RefObject<HTMLDivElement>;
}

const HouseholdFoodCostEstimate: React.FC<HouseholdFoodCostEstimateProps> = ({
  foodStoreRef,
  takeAwayRef,
}) => {
  const { setValue } = useFormContext();

  // State variables for food store expenses
  const [adults, setAdults] = useState<number | null>(null);
  const [children, setChildren] = useState<number | null>(null);
  const [errorFoodStore, setErrorFoodStore] = useState<string | null>(null);
  const [calculatedValueFoodStore, setcalculatedValueFoodStore] = useState<number | null>(null);
  const [lunchHasBeenUsedOnce, setLunchHasBeenUsedOnce] = useState(false); // Track state

  // state for takeout expenses
  const [takeoutMealsLunchCount, setTakeoutMealsLunchCount] = useState<number | null>(null);
  const [takeoutCostLunch, setTakeoutCostLunchh] = useState<number | null>(null);
  const [takeoutMealsRestaurantCount, setTakeoutMealsRestaurantCount] = useState<number | null>(null);
  const [takeoutCostRestaurant, setTakeoutCostRestaurant] = useState<number | null>(null);
  const [errorRestaurant, setErrorRestaurant] = useState<string | null>(null);
  const [takeoutCalculatedValue, setTakeoutCalculatedValue] = useState<number | null>(null);
  const [takeoutHasBeenUsedOnce, setTakeoutHasBeenUsedOnce] = useState(false); // Track state

  
  // Calculators
  //
  // FOOD SHOP SECTION
  //
  // The food shop calculator
  const calculateFoodStoreCost = (adults: number | null, children: number | null): number => {
    const adultCount = adults ?? 0;
    const childCount = children ?? 0;
    return adultCount * 2500 + childCount * 1500;
  };

  // Function to fetch result and set the value for food store expenses
  // This function is called when the user clicks the button to estimate and apply the value
  const handleLunchEstimateAndApply = () => {
    const result = calculateFoodStoreCost(adults, children);
    setcalculatedValueFoodStore(result);
    console.log("HouseholdFoodCostEstimate - handleLunchEstimateAndApply - Calling setValue for food.foodStoreExpenses:", result);
    setValue("food.foodStoreExpenses", result, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    setLunchHasBeenUsedOnce(true);
    setErrorFoodStore(null);
    
    foodStoreRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  // Set the field for preview of the food store expenses
  useEffect(() => {
    const result = calculateFoodStoreCost(adults, children);
    console.log("HouseholdFoodCostEstimate - useEffect (foodStore) - Adults:", adults, "Children:", children, "Calculated Result:", result);
    if (result > 0) {
      setcalculatedValueFoodStore(result);
      setErrorFoodStore(null); // reset error if any
    } else {
      setcalculatedValueFoodStore(null); // clear if nothing selected
    }
  }, [adults, children]);

  // TAKEAWAY SECTION
  // The takeaway calculator
  const calculateTakeoutCost = (
    lunchCount: number | null,
    lunchCost: number | null,
    restaurantCount: number | null,
    restaurantCost: number | null
  ): number => {
    const lunchCountValue = lunchCount ?? 0;
    const lunchCostValue = lunchCost ?? 0;
    const restaurantCountValue = restaurantCount ?? 0;
    const restaurantCostValue = restaurantCost ?? 0;
  
    return (lunchCountValue * lunchCostValue) + (restaurantCountValue * restaurantCostValue);
  };
  // Function to handle the calculation and application of lunch expenses
  const handleRestaurantEstimateAndApply = () => {
    const result = calculateTakeoutCost(
      takeoutMealsLunchCount,
      takeoutCostLunch,
      takeoutMealsRestaurantCount,
      takeoutCostRestaurant
    );
  
    setTakeoutCalculatedValue(result);
    console.log("HouseholdFoodCostEstimate - handleRestaurantEstimateAndApply - Calling setValue for food.takeoutExpenses:", result);
    setValue("food.takeoutExpenses", result, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    setTakeoutHasBeenUsedOnce(true);
    setErrorRestaurant(null);
  
    takeAwayRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  // Set the field for preview of the takeaway expenses
  useEffect(() => {
    const result = calculateTakeoutCost(
      takeoutMealsLunchCount,
      takeoutCostLunch,
      takeoutMealsRestaurantCount,
      takeoutCostRestaurant
    );
    console.log("HouseholdFoodCostEstimate - useEffect (takeout) - lunchCount:", takeoutMealsLunchCount, "lunchCost:", takeoutCostLunch, "restaurantCount:", takeoutMealsRestaurantCount, "restaurantCost:", takeoutCostRestaurant, "Calculated Result:", result);
    if (result > 0) {
      setTakeoutCalculatedValue(result);
      setErrorRestaurant(null);
    } else {
      setTakeoutCalculatedValue(null);
    }
  }, [
    takeoutMealsLunchCount,
    takeoutCostLunch,
    takeoutMealsRestaurantCount,
    takeoutCostRestaurant,
  ]);
  

  // Help texts for the food calculator
  const foodCalcHelpText = (
    <span>
      Fyll i det antal vuxna och/eller barn som din budget avser för en uppskattning av matkostnader per månad. <strong>2500 kr</strong> per vuxen och{" "}
      <strong>1500 kr</strong> per barn. Detta är en uppskattning och kan variera beroende på kostvanor och livsstil. 
    </span>
  );
  const takeAwayCalcHelpText = (
    <span>
      Fyll i antal måltider du äter ute och genomsnittlig kostnad per måltid för en uppskattning av kostnader för utemat per månad. 
      Lunchresturanger och restuaranger slås ihop till en kostnad.
    </span>
  );
  const adultsHelpText = (
    <span>
      Fyll i antal vuxna i ert hushåll som din budget avser för en uppskattning av matkostnader per månad. Är du fler än 8 vuxna? Kontakta oss så hjälper vi dig!
    </span>
  );
  const kidshelpText = (
    <span>
      Fyll i antal barn i ert hushåll som din budget avser för en uppskattning av matkostnader per månad. Är ni fler än 8 barn? Kontakta oss så hjälper vi dig!
    </span>
  );


  return (
    <div className="relative mt-4">
      {/* Food Store Expenses */}
      <div className="mt-4 bg-white bg-opacity-10 p-4 rounded-xl shadow-inner">
        <div className="flex items-center gap-2 justify-center mt-4 mb-4">
          <label className="flex items-center text-xl font-bold text-white">
            <MdLocalGroceryStore className="mr-2" />
            <span className="hidden lg:inline">
              Genomsnittlig uträkning av för matbutik per månad
            </span>
            <span className="block lg:hidden">
              Matbutik-kostnad
            </span>
          </label>
          <HelpSection label="" helpText={foodCalcHelpText} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col">
            <div className="flex flex-col min-h-[3rem] items-center justify-center mb-2 lg:flex-row lg:items-center lg:justify-center">
              <label className="text-center lg:mr-2">
                Antal vuxna i hushållet
              </label>
              <HelpSection className="mt-1 lg:mt-0" label="" helpText={adultsHelpText} />
            </div>
            <SmartDropdown
              options={Array.from({ length: 8 }, (_, i) => i)}
              value={adults}
              onValueChange={setAdults}
              placeholder="Välj antal vuxna.."
              searchable={false}
              showResetOption={false}
            />
          </div>
          <div className="flex flex-col">
            <div className="flex flex-col min-h-[3rem] items-center justify-center mb-2 lg:flex-row lg:items-center lg:justify-center">
              <label className="text-center lg:mr-2">
                Antal barn i hushållet
              </label>
              <HelpSection className="mt-1 lg:mt-0" label="" helpText={kidshelpText} />
            </div>
            <SmartDropdown
              options={Array.from({ length: 8 }, (_, i) => i)}
              value={children}
              onValueChange={setChildren}
              placeholder="Välj antal vuxna.."
              searchable={false}
              showResetOption={false}
            />
          </div>
        </div>

        {errorFoodStore && <p className="text-red-400 text-sm mt-2">{errorFoodStore}</p>}

        {calculatedValueFoodStore !== null && !errorFoodStore && (
          <p className="mt-2 text-white text-sm text-center">
            Beräknad månadskostnad mataffärer: <strong>{calculatedValueFoodStore.toLocaleString("sv-SE")} kr</strong>
          </p>
        )}
        {/* Button to estimate and apply value for lunch costs */}
        <div className="mt-6 flex justify-center">
          <GoodButton
            onClick={handleLunchEstimateAndApply}
            disabled={calculatedValueFoodStore === null}
            active={calculatedValueFoodStore !== null}
          >
            {lunchHasBeenUsedOnce ? "🔄 Uppdatera utemat" : "➕ Använd uträkning för utemat"}
          </GoodButton>
        </div>
      </div>
        
      {/* Takeout Expenses */}
      <div className="mt-4 bg-white bg-opacity-10 p-4 rounded-xl shadow-inner">
        <div className="flex items-center gap-2 justify-center mt-4 mb-4">
          <label className="flex items-center text-xl font-bold text-white">
            <FaHamburger className="mr-2" />

            <span className="hidden lg:inline">
              Genomsnittliga kostnader utemat per månad
            </span>
            <span className="block lg:hidden">
              utelunch-kostnad
            </span>
          </label>
          <HelpSection label="" helpText={takeAwayCalcHelpText} />
        </div>
        {/* Eating out lunch section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col">
          <label className="block mb-1 min-h-[3rem] lg:min-h-0 lg:mb-0 break-words text-wrap">
              Antal uteluncher per månad
            </label>
            <SmartDropdown
              options={Array.from({ length: 32 }, (_, i) => i)}
              value={takeoutMealsLunchCount}
              onValueChange={setTakeoutMealsLunchCount}
              placeholder="Välj antal uteluncher.."
              searchable={true}
              showResetOption={false}
            />
          </div>
          <div className="flex flex-col">
          <label className="block mb-1 min-h-[3rem] lg:min-h-0 lg:mb-0 break-words text-wrap">
              Genomsnittlig kostnad utelunch
            </label>
            <FormattedNumberInput
              value={takeoutCostLunch}
              onValueChange={(val) => setTakeoutCostLunchh(val)}
              placeholder="t.ex. 1"
              step={1}
            />
          </div>
        </div>

        {/* Eating out restaurant section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="flex flex-col">
            <label className="block mb-1 min-h-[3rem] lg:min-h-0 lg:mb-0 break-words text-wrap">
              Antal restaurangbesök per månad
            </label>
            <SmartDropdown
              options={Array.from({ length: 32 }, (_, i) => i)}
              value={takeoutMealsRestaurantCount}
              onValueChange={setTakeoutMealsRestaurantCount}
              placeholder={
                <>
                  <span className="block lg:hidden">Antal restaurang<br />besök..</span>
                  <span className="hidden lg:block">Antal restaurangbesök..</span>
                </>
              }
              searchable={true}
              showResetOption={false}
            />
          </div>
          <div className="flex flex-col">
            <label className="block mb-1 min-h-[3rem] lg:min-h-0 lg:mb-0">
              Genomsnittlig kostnad restaurangbesök
            </label>
            <FormattedNumberInput
              value={takeoutCostRestaurant}
              onValueChange={(val) => setTakeoutCostRestaurant(val)}
              placeholder="t.ex. 1"
              step={1}
            />
          </div>
        </div>
        {errorRestaurant && <p className="text-red-400 text-sm mt-2">{errorRestaurant}</p>}

        {takeoutCalculatedValue !== null && !errorRestaurant && (
          <p className="mt-2 text-white text-sm text-center">
            Beräknad månadskostnad utemat: <strong>{takeoutCalculatedValue.toLocaleString("sv-SE")} kr</strong>
          </p>
        )}
        {/* Button to estimate and apply value for Takeaway costs */}
        <div className="mt-6 flex justify-center">
          <GoodButton
              onClick={handleRestaurantEstimateAndApply}
              disabled={takeoutCalculatedValue === null}
              active={takeoutCalculatedValue !== null}
            >
            {takeoutHasBeenUsedOnce ? "🔄 Uppdatera utemat" : "➕ Använd uträkning för utemat"}
            </GoodButton>
        </div>
      </div>
    </div>
  );
};

export default HouseholdFoodCostEstimate;
