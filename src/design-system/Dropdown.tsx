import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from './Button';

interface DropdownItem {
  icon?: React.ReactNode;
  label: string;
  onClick: () => void;
  className?: string;
}

interface DropdownProps {
  label: React.ReactNode;
  icon?: React.ReactNode;
  items: DropdownItem[];
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({ 
  label, 
  icon, 
  items, 
  variant = 'outline',
  size = 'md',
  className = '' 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <Button 
        variant={variant} 
        size={size} 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5"
      >
        {icon}
        {label}
        <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-48 rounded-md shadow-lg bg-bg-surface border border-border-default z-50 overflow-hidden">
          <div className="py-1">
            {items.map((item, index) => (
              <button
                key={index}
                onClick={() => {
                  item.onClick();
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-4 py-2 text-sm text-left hover:bg-bg-elevated transition-colors ${item.className || 'text-text-primary'}`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
