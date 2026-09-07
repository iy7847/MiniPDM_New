import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ConfirmModal } from '@/shared/components/ConfirmModal';

interface ConfirmOptions {
  title: string;
  description: string | ReactNode;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  icon?: ReactNode;
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
};

export const ConfirmProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [resolver, setResolver] = useState<((value: boolean) => void) | null>(null);

  const confirm = (opts: ConfirmOptions): Promise<boolean> => {
    setOptions(opts);
    setIsOpen(true);
    return new Promise((resolve) => {
      setResolver(() => resolve);
    });
  };

  const handleConfirm = () => {
    if (resolver) resolver(true);
    setIsOpen(false);
  };

  const handleClose = () => {
    if (resolver) resolver(false);
    setIsOpen(false);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {options && (
        <ConfirmModal
          isOpen={isOpen}
          title={options.title}
          description={options.description}
          onConfirm={handleConfirm}
          onClose={handleClose}
          confirmText={options.confirmText}
          cancelText={options.cancelText}
          isDanger={options.isDanger}
          icon={options.icon}
        />
      )}
    </ConfirmContext.Provider>
  );
};
