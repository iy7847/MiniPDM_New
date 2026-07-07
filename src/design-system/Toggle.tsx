import React, { forwardRef } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface ToggleProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked: boolean;
  onChange: (checked: boolean) => void;
  size?: 'sm' | 'md' | 'lg';
}

export const Toggle = forwardRef<HTMLButtonElement, ToggleProps>(
  ({ checked, onChange, size = 'md', className, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base disabled:cursor-not-allowed disabled:opacity-50',
          {
            'bg-brand-500': checked,
            'bg-bg-surface': !checked,
            'h-5 w-9': size === 'sm',
            'h-6 w-11': size === 'md',
            'h-7 w-14': size === 'lg',
          },
          className
        )}
        {...props}
      >
        <span className="sr-only">Toggle</span>
        <span
          className={cn(
            'pointer-events-none inline-block rounded-full bg-text-primary shadow ring-0 transition-transform duration-300',
            {
              'translate-x-4 h-4 w-4': checked && size === 'sm',
              'translate-x-0 h-4 w-4': !checked && size === 'sm',
              'translate-x-5 h-5 w-5': checked && size === 'md',
              'translate-x-0 h-5 w-5': !checked && size === 'md',
              'translate-x-7 h-6 w-6': checked && size === 'lg',
              'translate-x-0 h-6 w-6': !checked && size === 'lg',
            }
          )}
        />
      </button>
    );
  }
);

Toggle.displayName = 'Toggle';
