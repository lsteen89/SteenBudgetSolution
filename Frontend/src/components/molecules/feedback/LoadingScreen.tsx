import React from 'react';
import LogoIcon from '@components/atoms/logo/LogoIcon';

export interface LoadingScreenProps {
  full?: boolean;                     // cover the whole screen?
  textColor?: 'black' | 'white';      // default = black
  actionType?: 'load' | 'save';       // Determines the message: "Laddar" or "Sparar"
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({
  full = true,
  textColor = 'black',
  actionType = 'load', // Default action is 'load'
}) => {
  const effectiveTextColorClass = textColor === 'white' ? 'text-white' : 'text-black';

  let baseText: string;
  switch (actionType) {
    case 'save':
      baseText = 'Sparar';
      break;
    case 'load':
    default:
      baseText = 'Laddar';
      break;
  }
  const letters = baseText.split('');

  return (
    <div
      className={`${
        full ? 'fixed inset-0' : 'w-full h-full'
      } flex flex-col items-center justify-center`}
    >
      {/* Apply the determined text color to the LogoIcon */}
      <LogoIcon className={`animate-spin w-20 h-20 ${effectiveTextColorClass}`} />

      <p className={`${effectiveTextColorClass} mt-4 flex gap-1 text-sm`}> {/* Added text-sm for potentially better fit */}
        {letters.map((ch, i) => (
          <span
            key={i}
            className="loading-swoosh" 
            style={{ animationDelay: `${i * 0.12}s` }}
          >
            {ch}
          </span>
        ))}
        {[0, 1, 2].map((d) => ( // Render 3 dots
          <span
            key={`dot-${d}`}
            className="loading-swoosh"
            style={{ animationDelay: `${(letters.length + d) * 0.12}s` }}
          >
            .
          </span>
        ))}
      </p>
    </div>
  );
};

export default LoadingScreen;