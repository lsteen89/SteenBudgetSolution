import React from "react";
import ResponsiveSubmitButton from "@components/atoms/buttons/ResponsiveSubmitButton";
import { NavigateFunction } from "react-router-dom";

interface DashboardContentProps {
  navigate: NavigateFunction;
}

const DashboardContent: React.FC<DashboardContentProps> = ({ navigate }) => {
  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <ResponsiveSubmitButton
          isSubmitting={false}
          label="Se din budget"
          enhanceOnHover
          fontSize="text-2xl"
          padding="py-4 px-8"
          className="w-64 h-16 whitespace-nowrap md:col-start-1 md:row-start-1 md:justify-self-center md:w-96 md:h-20 lg:w-80 lg:h-20 xl:w-96 xl:h-20"
          onClick={() => navigate("/budget")}
        />
        <ResponsiveSubmitButton
          isSubmitting={false}
          label="Skapa en budget"
          enhanceOnHover
          fontSize="text-2xl"
          padding="py-4 px-8"
          className="w-64 h-16 whitespace-nowrap md:col-start-3 md:row-start-1 md:justify-self-center md:w-96 md:h-20 lg:w-80 lg:h-20 xl:w-96 xl:h-20"
          onClick={() => navigate("/CreateBudget")}
        />
        <ResponsiveSubmitButton
          isSubmitting={false}
          label="Premiumtjänster"
          enhanceOnHover
          fontSize="text-2xl"
          padding="py-4 px-8"
          className="w-64 h-16 md:w-96 md:h-20 whitespace-nowrap md:col-start-2 md:row-start-3 md:justify-self-center"
          onClick={() => navigate("/GetPremium")}
        />
      </div>
      <div className="bg-blue-100 sm:bg-blue-200 md:bg-pink-300 lg:bg-red-400 xl:bg-yellow-500 2xl:bg-blue-600">
        Responsive Component
      </div>
    </>
  );
};

export default DashboardContent;
