import { type ChangeEvent, forwardRef, useState, useEffect } from 'react';
import { BaseInput } from './BaseInput';
import type { BaseInputProps } from './BaseInput';

export interface PhoneInputProps extends Omit<BaseInputProps, 'onChange'> {
  value?: string;
  onChange?: (value: string) => void;
}

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ value, onChange, ...props }, ref) => {
    const formatValue = (val: string | undefined) => {
      if (!val) return '';
      const rawValue = val.replace(/[^0-9]/g, '');
      if (rawValue.length === 0) return '';
      
      if (rawValue.startsWith('02')) {
        if (rawValue.length < 3) return rawValue;
        if (rawValue.length < 6) return `${rawValue.slice(0, 2)}-${rawValue.slice(2)}`;
        if (rawValue.length < 10) return `${rawValue.slice(0, 2)}-${rawValue.slice(2, 5)}-${rawValue.slice(5)}`;
        return `${rawValue.slice(0, 2)}-${rawValue.slice(2, 6)}-${rawValue.slice(6, 10)}`;
      }

      if (rawValue.length < 4) return rawValue;
      if (rawValue.length < 7) return `${rawValue.slice(0, 3)}-${rawValue.slice(3)}`;
      if (rawValue.length < 11) return `${rawValue.slice(0, 3)}-${rawValue.slice(3, 6)}-${rawValue.slice(6)}`;
      return `${rawValue.slice(0, 3)}-${rawValue.slice(3, 7)}-${rawValue.slice(7, 11)}`;
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
        type="tel"
        maxLength={13}
      />
    );
  }
);

PhoneInput.displayName = 'PhoneInput';
