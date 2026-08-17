import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from './Button';

interface DetailHeaderProps {
  title: string | React.ReactNode;
  subtitle?: React.ReactNode;
  statusBadge?: React.ReactNode;
  centerContent?: React.ReactNode;
  onBack?: () => void;
  primaryActions?: React.ReactNode;
  children?: React.ReactNode; // Utility actions (Ghost buttons)
}

export const DetailHeader: React.FC<DetailHeaderProps> & {
  Divider: React.FC;
} = ({
  title,
  subtitle,
  statusBadge,
  centerContent,
  onBack,
  primaryActions,
  children
}) => {
  const navigate = useNavigate();

  return (
    <div className="flex justify-between items-center px-6 py-3 min-h-[60px] gap-6">
      {/* Left Area: Back Button, Title, Badge */}
      <div className="flex items-center gap-4 shrink-0">
        <Button 
          variant="ghost" 
          className="text-text-secondary hover:text-text-primary p-2 shrink-0" 
          onClick={onBack || (() => navigate(-1))}
        >
          <ArrowLeft size={20} />
        </Button>
        <div className="flex flex-col justify-center gap-1">
          <div className="flex items-center gap-3 whitespace-nowrap">
            <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
              {title}
            </h1>
            {statusBadge && <div className="shrink-0">{statusBadge}</div>}
          </div>
          {subtitle && (
            <div className="text-text-secondary text-sm whitespace-nowrap flex items-center">
              {subtitle}
            </div>
          )}
        </div>
      </div>

      {/* Center Area: Total Amounts or specific metrics */}
      {centerContent && (
        <div className="flex-1 flex justify-center min-w-max shrink-0 px-4">
          {centerContent}
        </div>
      )}

      {/* Right Area: Utility Actions + Primary Actions */}
      <div className="flex items-center justify-end gap-2 shrink-0">
        {children && (
          <div className="flex items-center gap-1 whitespace-nowrap shrink-0">
            {children}
          </div>
        )}
        
        {primaryActions && (
          <div className="flex items-center gap-2 whitespace-nowrap shrink-0">
            {primaryActions}
          </div>
        )}
      </div>
    </div>
  );
};

// Divider for separating utility actions from primary actions if needed outside
DetailHeader.Divider = () => <div className="w-px h-6 bg-border-default mx-1" />;
