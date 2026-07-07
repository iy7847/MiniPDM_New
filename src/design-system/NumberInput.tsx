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
    const [displayValue, setDisplayValue] = useState<string>(value !== undefined ? String(value) : '');

    useEffect(() => {
      if (value !== undefined) {
        // Only update if it's materially different to prevent jumping cursors
        if (parseFloat(displayValue) !== value) {
          setDisplayValue(String(value));
        }
      }
    }, [value]);

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
      let rawValue = e.target.value;
      
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

      setDisplayValue(rawValue);

      if (onChange) {
        const numValue = parseFloat(rawValue);
        if (!isNaN(numValue)) {
          onChange(numValue);
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
