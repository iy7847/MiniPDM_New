import { type ChangeEvent, forwardRef, useState, useEffect } from 'react';
import { BaseInput } from './BaseInput';
import type { BaseInputProps } from './BaseInput';

export interface CurrencyInputProps extends Omit<BaseInputProps, 'onChange'> {
  value?: string | number;
  onChange?: (value: string) => void;
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, ...props }, ref) => {
    const formatValue = (val: string | number | undefined) => {
      if (val === undefined || val === null) return '';
      // Allow minus sign for negative numbers if needed, but standard is positive for prices
      const stringVal = String(val).replace(/[^0-9]/g, '');
      if (!stringVal) return '';
      return Number(stringVal).toLocaleString('ko-KR');
    };

    const [displayValue, setDisplayValue] = useState<string>(formatValue(value));

    useEffect(() => {
      if (value !== undefined) {
        setDisplayValue(formatValue(value));
      }
    }, [value]);

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value.replace(/[^0-9]/g, '');
      setDisplayValue(formatValue(rawValue));
      if (onChange) {
        onChange(rawValue);
      }
    };

    return (
      <BaseInput
        {...props}
        ref={ref}
        value={displayValue}
        onChange={handleChange}
        type="text"
      />
    );
  }
);

CurrencyInput.displayName = 'CurrencyInput';
