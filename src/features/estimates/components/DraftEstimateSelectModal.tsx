import React, { useState, useEffect } from 'react';
import { supabase } from '../../../shared/services/supabase';
import { useAuth } from '../../../app/providers/AuthProvider';
import { Button } from '../../../design-system/Button';
import { Loader2, X } from 'lucide-react';

interface DraftEstimateSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (estimateId: string) => void;
}

export const DraftEstimateSelectModal: React.FC<DraftEstimateSelectModalProps> = ({ isOpen, onClose, onSelect }) => {
  const { user } = useAuth();
  const [drafts, setDrafts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchDrafts = async () => {
      if (!isOpen) return;
      setIsLoading(true);
      try {
        const { data } = await supabase
          .from('estimates')
          .select('id, project_name, created_at, clients(name)')
          .eq('status', 'DRAFT')
          .order('created_at', { ascending: false });
        
        setDrafts(data || []);
      } catch (error) {
        console.error('Failed to fetch drafts:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDrafts();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in p-4">
      <div className="bg-bg-surface border border-border-default rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-border-default">
          <h3 className="text-xl font-bold text-text-primary">
            항목을 추가할 견적서 선택
          </h3>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition-colors">
            <X size={24} />
          </button>
        </div>

      <div className="p-4 flex flex-col h-[400px]">
        <p className="text-sm text-text-secondary mb-4">
          현재 '작성중'인 견적서 목록입니다. 항목을 추가할 견적서를 선택하세요.
        </p>

        <div className="flex-1 overflow-y-auto custom-scrollbar border border-border-default rounded-lg bg-bg-base">
          {isLoading ? (
            <div className="flex h-full items-center justify-center text-text-muted">
              <Loader2 className="animate-spin mr-2" size={20} /> 불러오는 중...
            </div>
          ) : drafts.length === 0 ? (
            <div className="flex h-full items-center justify-center text-text-muted">
              작성중인 견적서가 없습니다.
            </div>
          ) : (
            <ul className="divide-y divide-border-subtle">
              {drafts.map((draft) => (
                <li 
                  key={draft.id}
                  onClick={() => onSelect(draft.id)}
                  className="p-3 hover:bg-bg-overlay/50 cursor-pointer transition-colors"
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium text-text-primary">{draft.project_name}</span>
                    <span className="text-xs text-text-secondary">
                      EST-{draft.id.substring(0, 8).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm text-text-secondary">
                    <span>{draft.clients?.name || '거래처 미정'}</span>
                    <span>{new Date(draft.created_at).toLocaleDateString('ko-KR')}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <Button variant="secondary" onClick={onClose}>취소</Button>
        </div>
      </div>
      </div>
    </div>
  );
};
