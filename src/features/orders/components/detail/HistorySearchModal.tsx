import React, { useState, useEffect } from 'react';
import { Search, Loader2, PackageOpen, FileText, X } from 'lucide-react';
import { Button, BaseInput } from '../../../../design-system';
import { supabase } from '../../../../shared/services/supabase';
import { toast } from '../../../../shared/stores/useToastStore';

interface HistorySearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: any) => void;
}

export const HistorySearchModal: React.FC<HistorySearchModalProps> = ({ isOpen, onClose, onSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!searchTerm || searchTerm.length < 2) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      try {
        // estimate_items에서 품번 또는 품명으로 검색 (최근 순)
        const { data, error } = await supabase
          .from('estimate_items')
          .select(`
            *,
            estimates!inner ( project_name, created_at ),
            files (*)
          `)
          .or(`part_no.ilike.%${searchTerm}%,part_name.ilike.%${searchTerm}%`)
          .order('created_at', { ascending: false })
          .limit(30);

        if (error) throw error;
        setResults(data || []);
      } catch (err: any) {
        console.error('Failed to fetch history:', err);
        toast.error('과거 이력을 검색하는 중 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    const timer = setTimeout(fetchHistory, 500); // debounce
    return () => clearTimeout(timer);
  }, [searchTerm, isOpen]);

  const handleSelect = (item: any) => {
    onSelect(item);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in p-4">
      <div className="bg-bg-surface border border-border-default rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        <div className="flex items-center justify-between p-4 border-b border-border-default bg-bg-surface shrink-0">
          <div className="flex items-center gap-2">
            <PackageOpen className="text-brand-500" size={20} />
            <h3 className="text-lg font-bold text-text-primary">과거 견적 이력 불러오기</h3>
          </div>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition-colors">
            <X size={24} />
          </button>
        </div>

      <div className="flex flex-col h-full overflow-hidden">
        {/* Search Input */}
        <div className="p-4 border-b border-border-default bg-bg-surface shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <BaseInput
              autoFocus
              className="pl-9 w-full"
              placeholder="품번(Part No) 또는 품명을 입력하세요 (2글자 이상)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {isLoading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-500 animate-spin" />
            )}
          </div>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-auto bg-bg-base p-4">
          {searchTerm.length < 2 ? (
            <div className="h-full flex flex-col items-center justify-center text-text-secondary">
              <Search size={48} className="text-text-disabled mb-4" />
              <p>검색할 품번 또는 품명을 입력해 주세요.</p>
            </div>
          ) : results.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-text-secondary">
              <PackageOpen size={48} className="text-text-disabled mb-4" />
              <p>"{searchTerm}"에 대한 검색 결과가 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {results.map((item) => (
                <div 
                  key={item.id} 
                  className="bg-bg-surface border border-border-default rounded-lg p-4 hover:border-brand-500/50 hover:bg-bg-elevated transition-colors cursor-pointer group flex items-center justify-between"
                  onClick={() => handleSelect(item)}
                >
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-bold text-text-primary text-lg truncate">{item.part_no || 'N/A'}</span>
                      <span className="text-text-secondary truncate">{item.part_name || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-text-secondary">
                      <div className="flex items-center gap-1">
                        <span className="text-text-tertiary">프로젝트:</span>
                        <span className="font-medium text-text-primary truncate max-w-[200px]">{item.estimates?.project_name || '알 수 없음'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-text-tertiary">규격:</span>
                        <span className="truncate max-w-[150px]">{item.spec || '-'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-text-tertiary">단가:</span>
                        <span className="font-medium text-brand-400">₩{item.unit_price?.toLocaleString() || 0}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <FileText size={14} className="text-text-tertiary" />
                        <span>첨부도면 {item.files?.length || 0}개</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="secondary" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shrink-0">
                    현재 수주에 추가
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
};
