import React from 'react';
import { ShieldCheck } from "lucide-react";
import { Link } from 'react-router-dom';

const DataTransparencySection: React.FC = () => {
  return (
    <div className="mt-6 border-t border-gray-500 pt-4 text-sm text-customBlue1 flex flex-col items-center">
      <ShieldCheck className="w-10 h-10 text-darkLimeGreen mb-2" />
      <p className="text-center max-w-md">
        Vi samlar in dessa uppgifter för att kunna ge dig en bättre upplevelse
        och hjälpa dig att hantera din ekonomi. Vi skyddar din data och delar
        den aldrig med tredje part. Läs mer i vår{" "}
        <Link
          to="/data-policy"
          className="text-standardMenuColor underline hover:text-white"
        >
          dataskyddspolicy
        </Link>.
      </p>
    </div>
  );
};

export default DataTransparencySection;
