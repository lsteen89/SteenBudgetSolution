import React, { useMemo } from 'react';

type HTMLInputRangeProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>;

export interface RangeSliderProps extends HTMLInputRangeProps {
  /** Current value of the slider. */
  value: number;
  /** Invoked with the new value whenever it changes. */
  onChange: (value: number) => void;
  /** Whether to show the floating label above the thumb (default: true). */
  showValueLabel?: boolean;
}

const RangeSlider: React.FC<RangeSliderProps> = ({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  showValueLabel = true,
  className = '',
  ...rest
}) => {
  // Calculate progress in %
  const percent = useMemo(() => {
    const numericMin = Number(min);
    const numericMax = Number(max);
    if (numericMax === numericMin) return 0;
    return ((value - numericMin) / (numericMax - numericMin)) * 100;
  }, [value, min, max]);

  const trackBackground = `linear-gradient(to right, #32CD32 ${percent}%, #d1d5db ${percent}%)`;

  return (
    <div className={`relative w-full ${className}`}>
      <input
        type='range'
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ background: trackBackground }}
        className='range-slider w-full h-3 rounded-full appearance-none cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-limeGreen/60 transition-all duration-200'
        {...rest}
      />

      {showValueLabel && (
        <span
          className='absolute -top-8 -translate-x-1/2 whitespace-nowrap rounded-lg bg-darkLimeGreen px-2 py-1 text-xs font-semibold text-gray-900 shadow-lg transition-transform duration-200'
          style={{ left: `${percent}%` }}
        >
          {value.toLocaleString('sv-SE')} kr
        </span>
      )}
    </div>
  );
};

export default RangeSlider;