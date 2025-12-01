import React from 'react';
import clsx from 'clsx';

export interface LimePrimaryButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
}

const LimePrimaryButton: React.FC<LimePrimaryButtonProps> = ({
    children,
    className,
    ...rest
}) => {
    return (
        <button
            {...rest}
            className={clsx(
                'inline-flex items-center justify-center rounded-full',
                'px-5 py-2.5 text-sm font-semibold text-slate-900',
                'bg-limeGreen shadow-md',
                'hover:bg-darkLimeGreen hover:shadow-lg hover:-translate-y-0.5',
                'active:translate-y-0 active:shadow-md',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-darkLimeGreen focus-visible:ring-offset-2',
                'transition-all duration-150',
                className
            )}
        >
            {children}
        </button>
    );
};

export default LimePrimaryButton;
