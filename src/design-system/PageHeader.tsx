import React from 'react';

export interface PageHeaderProps {
  icon?: React.ElementType | React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  icon: Icon,
  title,
  description,
  badge,
  actions,
  children,
  className = 'mb-6'
}) => {
  const renderIcon = () => {
    if (!Icon) return null;
    
    // Icon이 이미 React Element인 경우
    if (React.isValidElement(Icon)) {
      return (
        <div className="p-2 rounded-lg bg-brand-500/10 border border-brand-500/20 text-brand-400 shrink-0 flex items-center justify-center">
          {Icon}
        </div>
      );
    }

    // Icon이 컴포넌트(Lucide Icon 등)인 경우
    if (typeof Icon === 'function' || typeof Icon === 'object') {
      const IconComponent = Icon as React.ElementType;
      return (
        <div className="p-2 rounded-lg bg-brand-500/10 border border-brand-500/20 text-brand-400 shrink-0 flex items-center justify-center">
          <IconComponent className="w-5 h-5" />
        </div>
      );
    }

    return null;
  };

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          {renderIcon()}
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-bold text-text-primary tracking-tight">{title}</h1>
              {badge && <div className="shrink-0">{badge}</div>}
            </div>
            {description && (
              <p className="text-text-secondary mt-1 text-sm">{description}</p>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            {actions}
          </div>
        )}
      </div>

      {children && (
        <div className="w-full">
          {children}
        </div>
      )}
    </div>
  );
};
