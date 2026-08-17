import React from 'react';
import { Save, Loader2 } from 'lucide-react';
import { Button } from './Button';

interface SaveButtonProps {
  isSaving: boolean;
  isDirty?: boolean;
  onSave: () => void;
  label?: string;
  savingLabel?: string;
  className?: string;
}

export const SaveButton: React.FC<SaveButtonProps> = ({
  isSaving,
  isDirty = true, // isDirty를 안 넘기면 무조건 활성화
  onSave,
  label = '저장',
  savingLabel = '저장 중...',
  className = ''
}) => {
  return (
    <Button
      variant={isDirty ? "primary" : "secondary"}
      className={`gap-2 font-bold px-6 ${className}`}
      onClick={onSave}
      disabled={!isDirty || isSaving}
    >
      {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
      {isSaving ? savingLabel : label}
    </Button>
  );
};
