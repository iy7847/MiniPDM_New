import { type ButtonHTMLAttributes, type ReactNode, forwardRef } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    variant = 'primary', 
    size = 'md', 
    icon, 
    iconPosition = 'left', 
    fullWidth = false,
    className = '', 
    children, 
    ...props 
  }, ref) => {
    
    const baseStyles = "inline-flex items-center justify-center font-bold transition-all duration-300 rounded-xl focus:outline-none focus:ring-4 focus:ring-brand-500/30 focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0";
    const widthClass = fullWidth ? "w-full" : "";
    
    const variants = {
      primary: "bg-brand-500 text-white hover:bg-brand-600 border border-brand-500",
      secondary: "bg-bg-elevated text-text-primary hover:bg-bg-overlay border border-border-default hover:border-border-strong",
      danger: "bg-danger text-white hover:bg-danger/90 border border-danger",
      ghost: "bg-transparent text-text-secondary hover:bg-bg-overlay hover:text-text-primary border border-transparent shadow-none hover:shadow-none hover:-translate-y-0",
    };
    
    const sizes = {
      sm: "text-xs py-1.5 px-3 gap-1.5",
      md: "text-sm py-2 px-4 gap-2",
      lg: "text-base py-2.5 px-5 gap-2",
    };
    
    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${widthClass} ${className}`}
        {...props}
      >
        {icon && iconPosition === 'left' && <span className="flex-shrink-0 flex items-center justify-center">{icon}</span>}
        {children}
        {icon && iconPosition === 'right' && <span className="flex-shrink-0 flex items-center justify-center">{icon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
