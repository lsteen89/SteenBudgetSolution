import React, { useState, useEffect, useRef } from "react";
// components
import { useFormContext } from "react-hook-form";
import OptionContainer from "@components/molecules/containers/OptionContainer";
import GlossyFlipCard from "@components/molecules/cards/GlossyFlipCard/GlossyFlipCard";
import FlipCardText from "@components/organisms/overlays/wizard/steps/StepBudgetExpenditure2/Components/text/FlipCardText";
import FormattedNumberInput from "@components/atoms/InputField/FormattedNumberInput";
import ToggleButton from "@components/atoms/buttons/ToggleButton";
import HouseholdFoodCostEstimate from "@/components/organisms/overlays/wizard/steps/StepBudgetExpenditure2/Components/Pages/SubSteps/3_SubStepFood/components/HouseholdFoodCostEstimate";
import HelpSection from "@components/molecules/helptexts/HelpSection";

// hooks
import { usePrevious } from "@hooks/usePrevious";
import useScrollToFirstError from "@/hooks/useScrollToFirstError";
// css module
import styles from "./Styling/SubStepFood.module.css";
// icons
import { MdLocalGroceryStore } from "react-icons/md";
import { FaHamburger } from "react-icons/fa";

interface FoodForm {
  food: {
    foodStoreExpenses: number | null;
    takeoutExpenses: number | null;
  };
}

const SubStepFood: React.FC = () => {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<FoodForm>();

  useScrollToFirstError(errors);

  // Ref for the Food Store Expenses container
  const foodStoreRef = useRef<HTMLDivElement>(null);
  // Ref for the Takeaway container
  const takeAwayRef = useRef<HTMLDivElement>(null);

  // helptext section
  const foodStoreHelpText = "Här anger du det du spenderar varje månad i mataffärer. Ett snitt på tre månader ger en mer exakt siffra.";
  const takeAwayHelpText = "Här anger du kostnader kopplade till utemat per månad. Ett snitt på tre månader ger en mer exakt siffra.";

  // Toggle the food calculator
  const [showFoodCalc, setShowFoodCalc] = useState(false);

  // Flash highlight state
  const [highlightInputFoodStore, setHighlightInputFoodStore] = useState(false);
  const [highlightInputTakeAway, setHighlightInputTakeAway] = useState(false);
  const isAnimatingFoodStore = useRef(false);
  const isAnimatingTakeAway = useRef(false);

  // Values and hooks
  const foodStoreExpensesVal = watch("food.foodStoreExpenses");
  const takeoutExpensesVal = watch("food.takeoutExpenses");
  const prevFoodStoreExpenses = usePrevious(foodStoreExpensesVal);
  const prevTakeoutExpenses = usePrevious(takeoutExpensesVal);
  // React Hook Form registers
  const foodStoreExpensesReg = register("food.foodStoreExpenses");
  const takeoutExpensesReg = register("food.takeoutExpenses");

  // 1. Button click -> update value (only if it changed)
  // Food Store Expenses
  const handleUpdateStoreExpenses = () => {
    const newValue = (foodStoreExpensesVal ?? 0) + 100;
    console.log("SubStepFood - handleUpdateStoreExpenses - Old Value:", foodStoreExpensesVal, "New Value:", newValue);
    if (newValue !== foodStoreExpensesVal) {
      console.log("SubStepFood - handleUpdateStoreExpenses - Calling setValue for food.foodStoreExpenses:", newValue);
      setValue("food.foodStoreExpenses", newValue);
    }
  };
  // Takeout Expenses
  const handleUpdateRestaurantExpenses = () => {
    const newValue = (takeoutExpensesVal ?? 0) + 100;
    console.log("SubStepFood - handleUpdateRestaurantExpenses - Old Value:", takeoutExpensesVal, "New Value:", newValue);
    if (newValue !== takeoutExpensesVal) {
      console.log("SubStepFood - handleUpdateRestaurantExpenses - Calling setValue for food.takeoutExpenses:", newValue);
      setValue("food.takeoutExpenses", newValue);
    }
  };

  // 2. Watch for changes, set highlight
  // This effect will run when the foodStoreExpensesVal changes
  useEffect(() => {
    // Skip on initial render
    if (prevFoodStoreExpenses === undefined) return;

    if (
      typeof foodStoreExpensesVal === "number" &&
      foodStoreExpensesVal !== prevFoodStoreExpenses &&
      !isAnimatingFoodStore.current
    ) {
      isAnimatingFoodStore.current = true;
      setHighlightInputFoodStore(true);
      console.log("SubStepFood - useEffect (foodStoreExpensesVal changed) - New Value:", foodStoreExpensesVal);
    }
  }, [foodStoreExpensesVal, prevFoodStoreExpenses]);

  // This effect will run when the takeoutExpensesVal changes
  useEffect(() => {
    // Skip on initial render
    if (prevTakeoutExpenses === undefined) return;

    if (
      typeof takeoutExpensesVal === "number" &&
      takeoutExpensesVal !== prevTakeoutExpenses &&
      !isAnimatingTakeAway.current
    ) {
      isAnimatingTakeAway.current = true;
      setHighlightInputTakeAway(true);
      console.log("SubStepFood - useEffect (takeoutExpensesVal changed) - New Value:", takeoutExpensesVal);
    }
  }, [takeoutExpensesVal, prevTakeoutExpenses]);

  // 3. Calculate total value
// Destructure the values from your "food" object and default to 0 if missing.
const { foodStoreExpenses = 0, takeoutExpenses = 0 } = watch("food") || {};

// Calculate total value and format it using Swedish number formatting.
const calculatedTotalValue = (foodStoreExpenses ?? 0) + (takeoutExpenses ?? 0);
const formattedTotalValue = calculatedTotalValue.toLocaleString("sv-SE");

  return (
    <OptionContainer>
      <div className="flex justify-center md:mt-4">
        <div className="">
          <GlossyFlipCard
            frontText={<FlipCardText pageKey="foodExpenses" variant="front" />}
            backText={<FlipCardText pageKey="foodExpenses" variant="back" />}
            frontTextClass="text-lg text-white"
            backTextClass="text-sm text-limeGreen"
            disableBounce={true}
            containerClassName="w-[170px] h-[400px] md:w-[350px] md:h-[270px]" 
          />
        </div>
      </div>


      {/* 3. Example update button for matkostnad */}
      <div className="mt-4">
        <button
          type="button"
          onClick={handleUpdateStoreExpenses}
          className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700"
        >
          Increase Store Expenses by 100
        </button>
      </div>
            {/* 3. Example update button for takeaway */}
            <div className="mt-4">
        <button
          type="button"
          onClick={handleUpdateRestaurantExpenses}
          className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700"
        >
          Increase Store Expenses by 100
        </button>
      </div>

      <div className="mt-6">
        <div className="bg-white bg-opacity-10 p-4 rounded-xl shadow-inner">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Food Store Expenses */}
            <div>
              <div className="flex items-center justify-center mb-2">
                <label htmlFor="foodStoreExpenses" className="flex items-center text-white font-semibold">
                  <MdLocalGroceryStore className="mr-2" />
                  Matbutik
                </label>
                <HelpSection className="ml-2" label="" helpText={foodStoreHelpText} />
              </div>
              <div
                ref={foodStoreRef}
                className={
                  highlightInputFoodStore
                    ? `${styles["animate-pulse-once"]} border-lime-300 shadow-lime-200`
                    : ""
                }
                onAnimationEnd={() => {
                  setHighlightInputFoodStore(false);
                  isAnimatingFoodStore.current = false;
                }}
                >
                <FormattedNumberInput
                  value={foodStoreExpensesVal || 0}
                  onValueChange={(val) => setValue("food.foodStoreExpenses", val ?? 0)}
                  placeholder="t.ex. 2500 kr"
                  error={errors.food?.foodStoreExpenses?.message}
                  name={foodStoreExpensesReg.name}
                  onBlur={foodStoreExpensesReg.onBlur}
                  id="foodStoreExpenses"
                />
              </div>
            </div>

            {/* Takeout Expenses */}
            <div>
              <div className="flex items-center justify-center mb-2">
                <label htmlFor="takeoutExpenses" className="flex items-center text-white font-semibold">
                  <FaHamburger className="mr-2" />
                  Hämtmat
                </label>
                <HelpSection className="ml-2" label="" helpText={takeAwayHelpText} />
              </div>
              <div
                ref={takeAwayRef}
                className={
                  highlightInputTakeAway
                    ? `${styles["animate-pulse-once"]} border-lime-300 shadow-lime-200`
                    : ""
                }
                onAnimationEnd={() => {
                  setHighlightInputTakeAway(false);
                  isAnimatingTakeAway.current = false;
                }}
                >
                <FormattedNumberInput
                  value={takeoutExpensesVal || 0}
                  onValueChange={(val) => setValue("food.takeoutExpenses", val ?? 0)}
                  placeholder="t.ex. 2500 kr"
                  error={errors.food?.takeoutExpenses?.message}
                  name={takeoutExpensesReg.name}
                  onBlur={takeoutExpensesReg.onBlur}
                  id="takeoutExpenses"
                />
              </div>
            </div>
          </div>
          {/*Show error and calculated total sum*/}
          {(!errors.food?.takeoutExpenses && !errors.food?.foodStoreExpenses) && (
            <p className="mt-2 text-white text-sm text-center">
              Uppskattad total månadskostnad: <strong>{formattedTotalValue} kr</strong>
            </p>
          )}
        </div>
      </div>



      <ToggleButton
        isShowing={showFoodCalc}
        onToggle={() => setShowFoodCalc(!showFoodCalc)}
        showLabel="📊 Visa hushålls-kalkylator"
        hideLabel="❌ Dölj kalkylatorn"
      />
      {showFoodCalc && (
        <HouseholdFoodCostEstimate
          foodStoreRef={foodStoreRef}
          takeAwayRef={takeAwayRef}
        />
      )}
    </OptionContainer>
  );
};

export default SubStepFood;
