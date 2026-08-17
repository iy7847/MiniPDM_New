import { type SelectHTMLAttributes, forwardRef, useId } from 'react';
import { AlertCircle } from 'lucide-react';

export interface BaseSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  selectClassName?: string;
}

export const BaseSelect = forwardRef<HTMLSelectElement, BaseSelectProps>(
  ({ label, error, options, className = '', selectClassName = '', id, ...props }, ref) => {
    const generatedId = useId();
    const selectId = id || generatedId;

    return (
      <div className={`flex flex-col gap-1.5 w-full ${className}`}>
        {label && (
          <label htmlFor={selectId} className="text-sm font-medium text-text-primary">
            {label}
          </label>
        )}
        <select
          id={selectId}
          ref={ref}
          className={`
            w-full px-4 py-2.5 bg-bg-elevated border rounded-lg text-text-primary text-sm font-medium
            focus:outline-none focus:ring-[3px] focus:ring-brand-bg focus:border-brand-500
            transition-all duration-200 shadow-sm appearance-none
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? 'border-danger focus:ring-danger-bg focus:border-danger' : 'border-border-default hover:border-border-strong'}
            ${selectClassName}
          `}
          {...props}
        >
          {options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <p className="flex items-center gap-1.5 text-xs font-medium text-danger mt-0.5 animate-in slide-in-from-top-1">
            <AlertCircle className="w-3.5 h-3.5" />
            {error}
          </p>
        )}
      </div>
    );
  }
);

BaseSelect.displayName = 'BaseSelect';
