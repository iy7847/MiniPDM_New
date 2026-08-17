import React, { forwardRef } from 'react';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className = '', label, ...props }, ref) => {
    return (
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          ref={ref}
          className={`
            w-4 h-4 
            rounded border-border-default 
            text-brand-500 bg-bg-surface
            focus:ring-brand-500 focus:ring-offset-bg-base
            checked:bg-brand-500 checked:border-brand-500
            transition-colors
            ${className}
          `}
          {...props}
        />
        {label && <span className="text-sm text-text-primary select-none">{label}</span>}
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';
