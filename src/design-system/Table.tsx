import React from 'react';

export const Table = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => {
  return (
    <div className={`w-full overflow-x-auto ${className}`}>
      <table className="w-full text-left border-collapse text-sm">
        {children}
      </table>
    </div>
  );
};

export const Thead = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => {
  return (
    <thead className={`bg-bg-elevated sticky top-0 z-10 border-b border-border-default shadow-sm ${className}`}>
      {children}
    </thead>
  );
};

export const Tbody = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => {
  return (
    <tbody className={`divide-y divide-border-default ${className}`}>
      {children}
    </tbody>
  );
};

export const Tr = ({ children, className = '', onClick }: { children: React.ReactNode, className?: string, onClick?: () => void }) => {
  return (
    <tr 
      className={`group transition-colors ${onClick ? 'cursor-pointer hover:bg-bg-elevated/50' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </tr>
  );
};

export const Th = ({ children, className = '', ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) => {
  return (
    <th 
      className={`px-4 py-3 font-semibold text-text-secondary whitespace-nowrap ${className}`}
      {...props}
    >
      {children}
    </th>
  );
};

export const Td = ({ children, className = '', ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) => {
  return (
    <td 
      className={`px-4 py-3 text-text-primary ${className}`}
      {...props}
    >
      {children}
    </td>
  );
};
