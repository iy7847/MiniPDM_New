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
        // Strip leading zeros unless it's a single zero
        let integerPart = parts[0].replace(/^(-?)0+(?=\d)/, '$1');
        integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return parts.length > 1 ? `${integerPart}.${parts[1]}` : integerPart;
      };

      const [displayValue, setDisplayValue] = useState<string>(
        (value !== undefined && value !== null) ? formatNumber(String(value)) : ''
      );
      const [isFocused, setIsFocused] = useState(false);
  
      useEffect(() => {
        // 사용자가 타이핑 중(포커스 상태)일 때는 부모로부터 내려오는 value 업데이트를 무시합니다.
        // 이는 부모 상태 업데이트가 지연되어(React 렌더링 지연 등) 방금 입력한 빠른 타이핑을 옛날 값으로 덮어씌우는 현상(Echo 버그)을 방지합니다.
        if (isFocused) return;

        if (value !== undefined && value !== null) {
          const currentRaw = displayValue.replace(/,/g, '');
          if (parseFloat(currentRaw) !== value && currentRaw !== String(value)) {
            setDisplayValue(formatNumber(String(value)));
          }
        } else if (value === null || value === undefined) {
          setDisplayValue('');
        }
      }, [value, isFocused]);

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
          if (rawValue === '' || rawValue === '-') {
            onChange(0 as any);
          } else if (rawValue === '.') {
            // just partial
          } else {
            const numValue = parseFloat(rawValue);
            if (!isNaN(numValue)) {
              onChange(numValue);
            }
          }
        }
      };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const currentRaw = displayValue.replace(/,/g, '');
        const currentNum = parseFloat(currentRaw) || 0;
        const step = Number(props.step) || 1;
        const nextNum = e.key === 'ArrowUp' ? currentNum + step : currentNum - step;
        
        // Prevent negative values if min is 0, etc. (basic bounds)
        if (props.min !== undefined && nextNum < Number(props.min)) return;
        if (props.max !== undefined && nextNum > Number(props.max)) return;

        // Fix floating point math issues
        const decimals = String(step).includes('.') ? String(step).split('.')[1].length : 0;
        const cleanNextNum = parseFloat(nextNum.toFixed(decimals));

        setDisplayValue(formatNumber(String(cleanNextNum)));
        if (onChange) {
          onChange(cleanNextNum);
        }
      }
      if (props.onKeyDown) props.onKeyDown(e);
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      // 포커스 시 전체 텍스트를 선택하여 입력 시 기존 값(예: "0")이 즉시 대체되도록 합니다.
      setTimeout(() => e.target.select(), 0);
      if (props.onFocus) props.onFocus(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
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
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        type="text"
      />
    );
  }
);

NumberInput.displayName = 'NumberInput';
