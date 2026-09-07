import React from 'react';

export interface MaskedTextProps {
  value: React.ReactNode;
  isVisible?: boolean;
  fallback?: string;
  className?: string;
}

export const MaskedText: React.FC<MaskedTextProps> = ({
  value,
  isVisible = true,
  fallback = '***',
  className = '',
}) => {
  if (!isVisible) {
    return (
      <span 
        className={`font-mono text-text-secondary select-none tracking-widest opacity-60 ${className}`} 
        title="조회 권한이 필요합니다"
      >
        {fallback}
      </span>
    );
  }

  return <span className={className}>{value}</span>;
};
