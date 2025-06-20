import React from 'react';

interface RangeSliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: number;
  onChange: (value: number) => void;
}

const RangeSlider: React.FC<RangeSliderProps> = ({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  className = '',
  ...rest
}) => (
  <input
    type="range"
    min={min}
    max={max}
    step={step}
    value={value}
    onChange={(e) => onChange(Number(e.target.value))}
    className={`w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-limeGreen ${className}`}
    {...rest}
  />
);

export default RangeSlider;
