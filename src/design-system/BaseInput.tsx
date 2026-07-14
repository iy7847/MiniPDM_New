import { type InputHTMLAttributes, forwardRef, useId } from 'react';
import { AlertCircle } from 'lucide-react';

export interface BaseInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  inputClassName?: string;
}

export const BaseInput = forwardRef<HTMLInputElement, BaseInputProps>(
  ({ label, error, className = '', inputClassName = '', id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;

    return (
      <div className={`flex flex-col gap-1.5 w-full ${className}`}>
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-text-primary">
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={`
            w-full px-4 py-2.5 bg-bg-elevated border rounded-lg text-text-primary text-sm font-medium
            focus:outline-none focus:ring-[3px] focus:ring-brand-bg focus:border-brand-500
            transition-all duration-200 shadow-sm
            disabled:opacity-50 disabled:cursor-not-allowed
            placeholder:text-text-muted
            ${error ? 'border-danger focus:ring-danger-bg focus:border-danger' : 'border-border-default hover:border-border-strong'}
            ${inputClassName}
          `}
          {...props}
        />
        {error && (
          <p className="flex items-center gap-1 text-xs text-danger mt-0.5">
            <AlertCircle size={14} />
            {error}
          </p>
        )}
      </div>
    );
  }
);

BaseInput.displayName = 'BaseInput';
