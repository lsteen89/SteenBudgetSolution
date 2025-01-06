import React from 'react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import SubmitButton from '@components/atoms/buttons/SubmitButton';
import MainPageBird from '@assets/Images/MainPageBird.png';
import useDisableScroll from '@hooks/useDisableScroll';

const MobileHomePage: React.FC = () => {
  const navigate = useNavigate(); // Initialize navigate function
  useDisableScroll(true);
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-blue-100">
    {/* Hero Text */}
    <div className="w-[95%] sm:w-[90%] text-center p-8 sm:p-10 bg-[#001F3F] rounded-lg shadow-lg mt-[-10vh]">
    <p className="text-white text-xl sm:text-2xl tracking-wide leading-relaxed">
        Ta kontroll över din ekonomi med <br /><br />
        <span className="font-bold text-limeGreen underline">eBudget</span>
        <br /><br />
        Skapa trygghet för framtiden!
    </p>
    </div>

      {/* Image */}
      <div className="mt-6">
        <img src={MainPageBird} alt="Main Page Bird" className="w-40 h-auto" />
      </div>

      {/* CTA Button */}
      <div className="mt-6">
        <SubmitButton
          isSubmitting={false}
          label="Skaffa eBudget!"
          size="large"
          enhanceOnHover
          onClick={() => navigate('/Registration')} // Use navigate correctly
        />
      </div>
    </div>
  );
};

export default MobileHomePage;
