import { ButtonHTMLAttributes, forwardRef } from 'react';
import { Button, type ButtonProps } from './Button';

export interface KioskLargeButtonProps extends ButtonProps {
  icon?: React.ReactNode;
}

/**
 * 현장 태블릿(키오스크) 화면에서 장갑을 낀 작업자도 쉽게 누를 수 있도록
 * 크기와 패딩을 대폭 키운 전용 액션 버튼입니다.
 */
export const KioskLargeButton = forwardRef<HTMLButtonElement, KioskLargeButtonProps>(
  ({ className = '', icon, children, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        className={`w-full min-h-[80px] text-xl font-bold rounded-xl flex flex-col items-center justify-center gap-2 transition-transform active:scale-95 ${className}`}
        {...props}
      >
        {icon && <span className="text-3xl">{icon}</span>}
        <span>{children}</span>
      </Button>
    );
  }
);

KioskLargeButton.displayName = 'KioskLargeButton';
