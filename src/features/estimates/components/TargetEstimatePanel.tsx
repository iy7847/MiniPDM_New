import React, { useState, useEffect } from 'react';
import { supabase } from '../../../shared/services/supabase';
import { Button } from '../../../design-system/Button';
import { Loader2, ShoppingCart, Trash2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { deleteEstimateItem } from '../services/estimateService';

interface TargetEstimatePanelProps {
  targetMode: 'new' | 'existing';
  setTargetMode: (mode: 'new' | 'existing') => void;
  cart: any[];
  setCart: React.Dispatch<React.SetStateAction<any[]>>;
  selectedEstimateId: string | null;
  setSelectedEstimateId: (id: string | null) => void;
  refreshTrigger?: number;
}

export const TargetEstimatePanel: React.FC<TargetEstimatePanelProps> = ({
  targetMode,
  setTargetMode,
  cart,
  setCart,
  selectedEstimateId,
  setSelectedEstimateId,
  refreshTrigger = 0
}) => {
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState<any[]>([]);
  const [isLoadingDrafts, setIsLoadingDrafts] = useState(false);
  const [draftItems, setDraftItems] = useState<any[]>([]);
  const [isLoadingDraftItems, setIsLoadingDraftItems] = useState(false);

  useEffect(() => {
    if (targetMode === 'existing') {
      const fetchDrafts = async () => {
        setIsLoadingDrafts(true);
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
          setIsLoadingDrafts(false);
        }
      };
      fetchDrafts();
    }
  }, [targetMode]);

  useEffect(() => {
    if (targetMode === 'existing' && selectedEstimateId) {
      const fetchDraftItems = async () => {
        setIsLoadingDraftItems(true);
        try {
          const { data } = await supabase
            .from('estimate_items')
            .select('*')
            .eq('estimate_id', selectedEstimateId)
            .order('created_at', { ascending: true });
          setDraftItems(data || []);
        } catch (error) {
          console.error('Failed to fetch draft items:', error);
        } finally {
          setIsLoadingDraftItems(false);
        }
      };
      fetchDraftItems();
    } else {
      setDraftItems([]);
    }
  }, [targetMode, selectedEstimateId, refreshTrigger]);

  const handleCreateNew = () => {
    if (cart.length === 0) return;
    navigate('/estimates/new', { state: { importedItems: cart } });
  };

  const handleGoToEstimate = () => {
    if (!selectedEstimateId) return;
    navigate(`/estimates/${selectedEstimateId}`);
  };

  const handleDeleteDraftItem = async (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteEstimateItem(itemId);
      setDraftItems(prev => prev.filter(item => item.id !== itemId));
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="flex flex-col h-full bg-bg-surface border-r border-border-default w-[350px] flex-shrink-0">
      <div className="p-4 border-b border-border-default">
        <h2 className="text-lg font-bold text-text-primary mb-4">어디에 담을까요?</h2>
        <div className="flex bg-bg-elevated p-1 rounded-lg">
          <button
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              targetMode === 'new' 
                ? 'bg-brand-500 text-white shadow-sm' 
                : 'text-text-secondary hover:text-text-primary'
            }`}
            onClick={() => setTargetMode('new')}
          >
            ✨ 새 견적 (장바구니)
          </button>
          <button
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              targetMode === 'existing' 
                ? 'bg-brand-500 text-white shadow-sm' 
                : 'text-text-secondary hover:text-text-primary'
            }`}
            onClick={() => setTargetMode('existing')}
          >
            📝 작성중인 견적
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-4">
        {targetMode === 'new' ? (
          <>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-text-secondary">담긴 품목 ({cart.length})</span>
              {cart.length > 0 && (
                <button 
                  onClick={() => setCart([])}
                  className="text-xs text-text-muted hover:text-danger transition-colors"
                >
                  전체 비우기
                </button>
              )}
            </div>
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 text-text-muted text-center py-10">
                <ShoppingCart size={48} className="mb-4 opacity-20" />
                <p className="text-sm">우측 목록에서 `[+ 추가]` 버튼을 눌러<br/>품목을 장바구니에 담으세요.</p>
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {cart.map((item, idx) => (
                  <li key={`${item.id}-${idx}`} className="bg-bg-elevated p-3 rounded-lg border border-border-subtle flex justify-between items-center group">
                    <div className="flex flex-col overflow-hidden mr-2">
                      <span className="font-medium text-text-primary text-sm truncate">{item.part_name || '-'}</span>
                      <span className="text-xs text-text-secondary truncate">{item.part_no || '-'}</span>
                    </div>
                    <button 
                      onClick={() => setCart(cart.filter((_, i) => i !== idx))}
                      className="text-text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <div className="flex flex-col h-full">
            {selectedEstimateId ? (
              // Selected Draft Mode: Show Header & Full Items List
              <>
                <div className="bg-brand-500/10 border border-brand-500/30 rounded-lg p-3 mb-4 flex justify-between items-center flex-shrink-0">
                  <div className="overflow-hidden pr-2">
                    <div className="text-xs text-brand-500 font-medium mb-1">현재 선택된 견적서</div>
                    <div className="font-bold text-text-primary text-sm truncate">
                      {drafts.find(d => d.id === selectedEstimateId)?.project_name || '제목 없음'}
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedEstimateId(null)}
                    className="text-xs text-text-secondary hover:text-brand-500 whitespace-nowrap bg-bg-surface px-2 py-1 rounded border border-border-subtle transition-colors"
                  >
                    변경
                  </button>
                </div>
                
                <div className="flex justify-between items-center mb-2 flex-shrink-0">
                  <span className="text-sm font-medium text-text-secondary">담긴 품목 ({draftItems.length})</span>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar pb-4">
                  {isLoadingDraftItems ? (
                    <div className="flex justify-center p-4"><Loader2 size={24} className="animate-spin text-text-muted" /></div>
                  ) : draftItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-text-muted text-center py-10">
                      <ShoppingCart size={48} className="mb-4 opacity-20" />
                      <p className="text-sm">우측 목록에서 `[+ 담기]` 버튼을 눌러<br/>이 견적서에 품목을 추가하세요.</p>
                    </div>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {draftItems.map((item) => (
                        <li key={item.id} className="bg-bg-elevated p-3 rounded-lg border border-border-subtle flex justify-between items-center group">
                          <div className="flex flex-col overflow-hidden mr-2">
                            <span className="font-medium text-text-primary text-sm truncate">{item.part_name || '-'}</span>
                            <span className="text-xs text-text-secondary truncate">{item.part_no || '-'}</span>
                          </div>
                          <button 
                            onClick={(e) => handleDeleteDraftItem(item.id, e)}
                            className="text-text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                            title="품목 삭제"
                          >
                            <Trash2 size={16} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            ) : (
              // Selection Mode: Show list of drafts
              <>
                <div className="text-sm font-medium text-text-secondary mb-2 flex-shrink-0">아이템을 추가할 견적서 선택</div>
                <div className="flex-1 overflow-y-auto custom-scrollbar pb-4">
                  {isLoadingDrafts ? (
                    <div className="flex justify-center items-center py-10 text-text-muted">
                      <Loader2 className="animate-spin" size={24} />
                    </div>
                  ) : drafts.length === 0 ? (
                    <div className="text-center py-10 text-text-muted text-sm">작성중인 견적서가 없습니다.</div>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {drafts.map(draft => (
                        <li 
                          key={draft.id}
                          onClick={() => setSelectedEstimateId(draft.id)}
                          className="p-3 rounded-lg border bg-bg-elevated border-border-subtle hover:border-brand-500/50 cursor-pointer transition-colors group"
                        >
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-medium text-sm text-text-primary group-hover:text-brand-500 transition-colors truncate pr-2">
                              {draft.project_name || '제목 없음'}
                            </span>
                          </div>
                          <div className="flex justify-between text-xs text-text-secondary">
                            <span className="truncate pr-2">{draft.clients?.name || '거래처 미정'}</span>
                            <span className="whitespace-nowrap">{new Date(draft.created_at).toLocaleDateString('ko-KR')}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-border-default bg-bg-surface">
        {targetMode === 'new' ? (
          <Button 
            variant="primary" 
            className="w-full h-12 text-base flex justify-center items-center gap-2"
            disabled={cart.length === 0}
            onClick={handleCreateNew}
          >
            <ShoppingCart size={18} />
            새 견적서 작성 완료 ({cart.length})
          </Button>
        ) : (
          <Button 
            variant="primary" 
            className="w-full h-12 text-base flex justify-center items-center gap-2"
            disabled={!selectedEstimateId}
            onClick={handleGoToEstimate}
          >
            <ArrowRight size={18} />
            선택한 견적서로 이동
          </Button>
        )}
      </div>
    </div>
  );
};
