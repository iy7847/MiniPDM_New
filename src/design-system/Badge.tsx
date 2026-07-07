import { type HTMLAttributes, forwardRef } from 'react';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'danger' | 'default';
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'default', className = '', children, ...props }, ref) => {
    const baseStyles = "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border";
    


    // If tailwind config has success, warning, danger defined as classes, 
    // we can use: bg-success text-white border-success
    // We will use the custom classes assuming they are in tailwind.config.js
    const configVariants = {
      success: "bg-success text-white border-success",
      warning: "bg-warning text-white border-warning",
      danger: "bg-danger text-white border-danger",
      default: "bg-bg-elevated text-text-primary border-border-default",
    };
    
    return (
      <span
        ref={ref}
        className={`${baseStyles} ${configVariants[variant]} ${className}`}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';
