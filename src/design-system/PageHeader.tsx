import React from 'react';

export interface PageHeaderProps {
  title: React.ReactNode;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, actions }) => {
  return (
    <div className="flex justify-between items-center mb-6">
      <div className="flex items-center gap-6">
        <h1 className="text-2xl font-bold text-text-primary">{title}</h1>
      </div>
      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
};
