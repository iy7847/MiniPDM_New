import { type ChangeEvent, forwardRef, useState, useEffect } from 'react';
import { BaseInput } from './BaseInput';
import type { BaseInputProps } from './BaseInput';

export interface NumberInputProps extends Omit<BaseInputProps, 'onChange'> {
  value?: number;
  onChange?: (value: number) => void;
  allowDecimal?: boolean;
}

  export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
    ({ value, onChange, allowDecimal = true, ...props }, ref) => {
      
      const formatNumber = (val: string) => {
        if (!val || val === '-' || val === '.') return val;
        const parts = val.split('.');
        const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return parts.length > 1 ? `${integerPart}.${parts[1]}` : integerPart;
      };

      const [displayValue, setDisplayValue] = useState<string>(
        (value !== undefined && value !== null) ? formatNumber(String(value)) : ''
      );
  
      useEffect(() => {
        if (value !== undefined && value !== null) {
          const currentRaw = displayValue.replace(/,/g, '');
          if (parseFloat(currentRaw) !== value && currentRaw !== String(value)) {
            setDisplayValue(formatNumber(String(value)));
          }
        } else if (value === null || value === undefined) {
          setDisplayValue('');
        }
      }, [value]);

      const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        let rawValue = e.target.value.replace(/,/g, ''); // strip existing commas
        
        // Allow only numbers, optional negative sign at start, and optional one decimal point
        if (allowDecimal) {
          rawValue = rawValue.replace(/[^0-9.-]/g, '');
          const parts = rawValue.split('.');
          if (parts.length > 2) {
            rawValue = parts[0] + '.' + parts.slice(1).join('');
          }
        } else {
          rawValue = rawValue.replace(/[^0-9-]/g, '');
        }
  
        setDisplayValue(formatNumber(rawValue));
  
        if (onChange) {
          if (rawValue === '' || rawValue === '-' || rawValue === '.') {
            // Don't trigger onChange with NaN for partial inputs, but allow typing
          } else {
            const numValue = parseFloat(rawValue);
            if (!isNaN(numValue)) {
              onChange(numValue);
            }
          }
        }
      };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      if (props.onBlur) props.onBlur(e);
      if (displayValue === '' || displayValue === '-' || displayValue === '.') {
        setDisplayValue('0');
        if (onChange) onChange(0);
      }
    };

    return (
      <BaseInput
        {...props}
        ref={ref}
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        type="text"
      />
    );
  }
);

NumberInput.displayName = 'NumberInput';
