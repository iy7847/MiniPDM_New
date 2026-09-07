import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/design-system/Card';
import { Button } from '@/design-system/Button';
import { X, GripVertical, Trash2, Truck } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { toast } from '../../../shared/stores/useToastStore';
import { fetchProcesses, fetchRoutingTemplates } from '../../settings/services/routingService';
import type { ProcessMaster, RoutingTemplate } from '../../settings/services/routingService';
import { supabase } from '@/shared/services/supabase';

import { useAuth } from '@/app/providers/AuthProvider';

interface Props {
  selectedItems: any[]; // order_items
  onClose: () => void;
  onSuccess: () => void;
}

export function ProcessDesignModal({ selectedItems, onClose, onSuccess }: Props) {
  const { user } = useAuth();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [processes, setProcesses] = useState<ProcessMaster[]>([]);
  const [templates, setTemplates] = useState<RoutingTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [routingItems, setRoutingItems] = useState<{id: string, process_id: string, process_name: string, is_outsource: boolean}[]>([]);

  useEffect(() => {
    async function init() {
      if (!user) return;
      try {
        const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single();
        if (profile?.company_id) {
          setCompanyId(profile.company_id);
          const [p, t] = await Promise.all([
            fetchProcesses(profile.company_id),
            fetchRoutingTemplates(profile.company_id)
          ]);
          setProcesses(p);
          setTemplates(t);

          // If a single item is selected, load its existing routing (if any)
          if (selectedItems.length === 1) {
            const { data: logs } = await supabase
              .from('process_logs')
              .select('process_id, process_name')
              .eq('order_item_id', selectedItems[0].id)
              .order('sequence_no', { ascending: true });
            
            if (logs && logs.length > 0) {
              // Filter out the automatic '출하' process since it gets appended on save
              const userLogs = logs.filter(l => l.process_name !== '출하' || l.process_id !== null);
              const loadedItems = userLogs.map(l => {
                const processMaster = p.find(master => master.id === l.process_id);
                return {
                  id: Math.random().toString(),
                  process_id: l.process_id || '',
                  process_name: l.process_name,
                  is_outsource: processMaster ? processMaster.is_outsource : false
                };
              });
              setRoutingItems(loadedItems);
            }
          }
        }
      } catch (err: any) {
        toast.error('데이터 로드 실패: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [user]);

  // When template is selected, populate routingItems
  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tid = e.target.value;
    setSelectedTemplateId(tid);
    
    if (tid) {
      const template = templates.find(t => t.id === tid);
      if (template && template.items) {
        const newItems = template.items.map(ti => ({
          id: Math.random().toString(),
          process_id: ti.process_id,
          process_name: ti.processes?.name || '알수없음',
          is_outsource: ti.processes?.is_outsource || false
        }));
        setRoutingItems(newItems);
      }
    } else {
      setRoutingItems([]);
    }
  };

  const handleAddProcess = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pid = e.target.value;
    if (!pid) return;
    const p = processes.find(x => x.id === pid);
    if (p) {
      setRoutingItems([...routingItems, {
        id: Math.random().toString(),
        process_id: p.id,
        process_name: p.name,
        is_outsource: p.is_outsource
      }]);
    }
    e.target.value = ''; // reset
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(routingItems);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setRoutingItems(items);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // 1. Delete existing process_logs for these items (if any, to overwrite)
      // Usually, there might be none if it's the first time.
      const itemIds = selectedItems.map(i => i.id);
      await supabase.from('process_logs').delete().in('order_item_id', itemIds);

      // 2. Insert new process logs
      const insertData: any[] = [];
      
      for (const item of selectedItems) {
        routingItems.forEach((ri, index) => {
          insertData.push({
            order_item_id: item.id,
            process_id: ri.process_id,
            process_name: ri.process_name,
            process_type: ri.is_outsource ? 'OUTSOURCE' : 'INTERNAL',
            sequence_no: index + 1,
            is_planned: true,
            status: '대기',
            company_id: companyId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        });
        
        // 무조건 마지막에 "출하" 공정 추가 (단, 공정을 완전히 비우는 경우가 아닐 때만)
        if (routingItems.length > 0) {
          insertData.push({
            order_item_id: item.id,
            process_id: null,
            process_name: '출하',
            process_type: 'SYSTEM',
            sequence_no: routingItems.length + 1,
            is_planned: true,
            status: '대기',
            company_id: companyId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
      }

      if (insertData.length > 0) {
        const { error } = await supabase.from('process_logs').insert(insertData);
        if (error) throw error;
      }
      
      toast.success(`${selectedItems.length}개 품목의 공정 설계가 저장되었습니다.`);
      onSuccess();
    } catch (err: any) {
      toast.error('저장 실패: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div className="w-8 h-8 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <Card className="w-full max-w-3xl bg-bg-elevated border-border-default shadow-2xl flex flex-col max-h-[90vh]">
        <CardHeader className="py-4 border-b border-border-default flex flex-row items-center justify-between shrink-0">
          <CardTitle>공정 설계 (Routing Design)</CardTitle>
          <button onClick={onClose} className="p-1 hover:bg-bg-surface rounded-full text-text-secondary">
            <X size={20} />
          </button>
        </CardHeader>
        
        <CardContent className="p-6 flex flex-col overflow-hidden min-h-0 space-y-6">
          <div className="shrink-0 bg-bg-surface border border-border-default rounded-md p-4 space-y-2">
            <h4 className="text-sm font-bold text-text-primary">대상 품목 ({selectedItems.length}개)</h4>
            <div className="flex flex-wrap gap-2">
              {selectedItems.map(i => (
                <span key={i.id} className="px-2 py-1 bg-bg-base rounded border border-border-default text-xs text-text-primary">
                  {i.part_name} {i.part_no ? `(${i.part_no})` : ''}
                </span>
              ))}
            </div>
          </div>

          <div className="shrink-0 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">라우팅 템플릿 적용</label>
              <select 
                value={selectedTemplateId}
                onChange={handleTemplateChange}
                className="w-full bg-bg-surface border border-border-default text-text-primary rounded text-sm p-2 focus:border-brand-500 outline-none"
              >
                <option value="">-- 직접 설계 (커스텀) --</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col border border-border-default rounded-lg bg-bg-base">
            <div className="flex justify-between items-center bg-bg-surface p-3 border-b border-border-default shrink-0">
              <span className="font-bold text-sm text-text-primary">공정 로드맵 (순서 지정)</span>
              <select 
                className="bg-bg-base border border-border-default text-text-primary rounded text-sm p-1.5 focus:border-brand-500 outline-none"
                onChange={handleAddProcess}
              >
                <option value="">+ 공정 추가</option>
                {processes.map(p => (
                  <option key={p.id} value={p.id}>{p.name} {p.is_outsource ? '(외주)' : ''}</option>
                ))}
              </select>
            </div>
            
            <div className="flex-1 overflow-auto p-4">
              {routingItems.length === 0 ? (
                <div className="h-full flex items-center justify-center text-text-secondary text-sm">
                  적용할 라우팅 템플릿을 선택하거나 공정을 수동으로 추가하세요.
                </div>
              ) : (
                <DragDropContext onDragEnd={onDragEnd}>
                  <Droppable droppableId="routing-items">
                    {(provided) => (
                      <div 
                        {...provided.droppableProps} 
                        ref={provided.innerRef}
                        className="space-y-2"
                      >
                        {routingItems.map((item, index) => (
                          <Draggable key={item.id} draggableId={item.id} index={index}>
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className="flex items-center gap-3 p-3 bg-bg-elevated border border-border-default rounded-md shadow-sm group"
                              >
                                <div {...provided.dragHandleProps} className="text-text-tertiary cursor-grab hover:text-brand-500">
                                  <GripVertical size={18} />
                                </div>
                                <div className="w-6 h-6 rounded-full bg-brand-500/20 text-brand-500 flex items-center justify-center text-xs font-bold shrink-0">
                                  {index + 1}
                                </div>
                                <div className="flex-1 font-bold text-text-primary text-base">
                                  {item.process_name}
                                </div>
                                {item.is_outsource && (
                                  <span className="text-[10px] bg-brand-500/10 text-brand-500 px-1.5 py-0.5 rounded border border-brand-500/30">외주 현장발주 대기</span>
                                )}
                                <button 
                                  className="text-text-tertiary hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                  onClick={() => {
                                    const newItems = [...routingItems];
                                    newItems.splice(index, 1);
                                    setRoutingItems(newItems);
                                  }}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              )}
              
              {/* Fixed "출하" block at the end */}
              {routingItems.length > 0 && (
                <div className="mt-2 flex items-center gap-3 p-3 bg-brand-500/10 border border-brand-500/30 rounded-md shadow-sm pointer-events-none opacity-90">
                  <div className="text-brand-500/50 pl-1 pr-1">
                    <Truck size={18} />
                  </div>
                  <div className="w-6 h-6 rounded-full bg-brand-500/20 text-brand-500 flex items-center justify-center text-xs font-bold shrink-0">
                    {routingItems.length + 1}
                  </div>
                  <div className="flex-1 font-bold text-text-primary text-base flex flex-col">
                    <span>출하</span>
                    <span className="text-[10px] text-text-secondary font-normal mt-0.5">※ 마지막 고정 단계 (자동 추가)</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border-default mt-6 shrink-0">
            <Button variant="secondary" onClick={onClose} disabled={saving}>취소</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? '저장중...' : '공정 설계 확정'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
