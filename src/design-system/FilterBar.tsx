import React from 'react';

export interface FilterBarProps {
  children: React.ReactNode;
}

export const FilterBar: React.FC<FilterBarProps> = ({ children }) => {
  return (
    <div className="flex justify-between items-center mb-4">
      {children}
    </div>
  );
};
