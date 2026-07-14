import { useState, useRef, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, AlertCircle } from 'lucide-react';

export interface BaseComboboxProps {
  label?: string;
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  error?: string;
  className?: string;
  inputClassName?: string;
}

export function BaseCombobox({ 
  label, 
  value, 
  onChange, 
  options, 
  placeholder, 
  error, 
  className = '',
  inputClassName = 'px-4 py-2.5 rounded-lg'
}: BaseComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0, bottom: false });
  const containerRef = useRef<HTMLDivElement>(null);
  const generatedId = useId();

  // Position calculation function
  const updatePosition = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      // If less than 240px below and there is more space above, drop UP
      const openUpwards = spaceBelow < 250 && rect.top > spaceBelow;
      
      setDropdownPos({
        top: openUpwards ? rect.top - 4 : rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        bottom: openUpwards // true if it should open upwards
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      const handleScroll = (e: Event) => {
        // If scrolling happens, just close the dropdown for simplicity,
        // or we could updatePosition() if we want it to follow.
        // Closing is usually safer so it doesn't detach.
        setIsOpen(false);
      };
      // Capture phase so we catch scrolling on ANY child container
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', updatePosition);
      return () => {
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      const selectedOption = options.find(o => o.value === value);
      setSearch(selectedOption ? selectedOption.label : '');
    }
  }, [value, options, isOpen]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const filteredOptions = options.filter(option => 
    option.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={`flex flex-col gap-1.5 w-full relative ${className}`} ref={containerRef}>
      {label && (
        <label className="text-sm font-medium text-text-primary">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
            if (e.target.value !== options.find(o => o.value === value)?.label) {
              onChange('');
            }
          }}
          onFocus={() => setIsOpen(true)}
          className={`
            w-full bg-bg-elevated border text-text-primary text-sm font-medium
            focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-colors
            placeholder:text-text-disabled
            ${error ? 'border-danger focus:ring-danger' : 'border-border-default'}
            ${inputClassName}
          `}
          placeholder={placeholder}
          autoComplete="off"
        />
        <button
          type="button"
          onClick={() => {
            if (!isOpen) updatePosition();
            setIsOpen(!isOpen);
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary focus:outline-none"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      {isOpen && filteredOptions.length > 0 && createPortal(
        <ul 
          className="fixed z-[9999] bg-bg-surface border border-border-default rounded-md shadow-lg max-h-60 overflow-auto"
          style={{
            top: dropdownPos.bottom ? 'auto' : `${dropdownPos.top}px`,
            bottom: dropdownPos.bottom ? `${window.innerHeight - dropdownPos.top}px` : 'auto',
            left: `${dropdownPos.left}px`,
            width: `${dropdownPos.width}px`
          }}
        >
          {filteredOptions.map((option) => (
            <li
              key={option.value}
              className={`px-3 py-2 hover:bg-bg-elevated cursor-pointer text-sm transition-colors ${option.value === value ? 'bg-brand-500/10 text-brand-500 font-bold' : 'text-text-primary'}`}
              onMouseDown={(e) => {
                // Use onMouseDown instead of onClick to prevent input blur from firing before this
                e.preventDefault();
                onChange(option.value);
                setSearch(option.label);
                setIsOpen(false);
              }}
            >
              {option.label}
            </li>
          ))}
        </ul>,
        document.body
      )}

      {error && (
        <p className="flex items-center gap-1.5 text-xs font-medium text-danger mt-0.5">
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </p>
      )}
    </div>
  );
}
