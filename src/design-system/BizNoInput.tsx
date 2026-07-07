import { type ChangeEvent, forwardRef, useState, useEffect } from 'react';
import { BaseInput } from './BaseInput';
import type { BaseInputProps } from './BaseInput';

export interface BizNoInputProps extends Omit<BaseInputProps, 'onChange'> {
  value?: string;
  onChange?: (value: string) => void;
}

export const BizNoInput = forwardRef<HTMLInputElement, BizNoInputProps>(
  ({ value, onChange, ...props }, ref) => {
    const formatValue = (val: string | undefined) => {
      if (!val) return '';
      const rawValue = val.replace(/[^0-9]/g, '').slice(0, 10);
      
      if (rawValue.length < 4) return rawValue;
      if (rawValue.length < 6) return `${rawValue.slice(0, 3)}-${rawValue.slice(3)}`;
      return `${rawValue.slice(0, 3)}-${rawValue.slice(3, 5)}-${rawValue.slice(5)}`;
    };

    const [displayValue, setDisplayValue] = useState<string>(formatValue(value));

    useEffect(() => {
      if (value !== undefined) {
        setDisplayValue(formatValue(value));
      }
    }, [value]);

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
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
        maxLength={12}
      />
    );
  }
);

BizNoInput.displayName = 'BizNoInput';
