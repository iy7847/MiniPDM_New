import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string | React.ReactNode;
  onConfirm: () => void;
  onClose: () => void;
  confirmText?: string;
  isDanger?: boolean;
}

export function DeleteConfirmModal({
  isOpen,
  title,
  description,
  onConfirm,
  onClose,
  confirmText = '삭제',
  isDanger = true
}: DeleteConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-[#21262D] border border-[#30363D] rounded-lg shadow-xl w-full max-w-md overflow-hidden">
        <div className="p-5">
          <div className="flex items-start space-x-3">
            <div className={`p-2 rounded-full flex-shrink-0 ${isDanger ? 'bg-red-500/10 text-red-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <h3 className="text-lg font-medium text-[#E6EDF3] leading-6">{title}</h3>
              <div className="mt-2 text-sm text-[#8B949E]">
                {description}
              </div>
            </div>
          </div>
        </div>
        
        <div className="px-5 py-4 bg-[#161B22] border-t border-[#30363D] flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-[#E6EDF3] bg-transparent border border-[#30363D] rounded-md hover:bg-[#30363D]/50 transition-colors"
          >
            취소
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-4 py-2 text-sm font-medium text-white rounded-md flex items-center space-x-1.5 transition-colors ${
              isDanger ? 'bg-red-600 hover:bg-red-700' : 'bg-yellow-600 hover:bg-yellow-700'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
