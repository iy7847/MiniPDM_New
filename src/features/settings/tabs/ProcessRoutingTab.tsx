import React, { useState, useEffect } from 'react';
import { useConfirm } from '@/app/providers/ConfirmProvider';
import { Card, CardHeader, CardTitle, CardContent } from '@/design-system/Card';
import { Button } from '@/design-system/Button';
import { BaseInput } from '@/design-system/BaseInput';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/design-system/Table';
import { StatusBadge } from '@/design-system/StatusBadge';
import { Plus, Edit2, Trash2, GripVertical, Settings } from 'lucide-react';
import { fetchProcesses, createProcess, updateProcess, deleteProcess, fetchRoutingTemplates, createRoutingTemplate, updateRoutingTemplate, deleteRoutingTemplate } from '../services/routingService';
import type { ProcessMaster, RoutingTemplate } from '../services/routingService';
import { toast } from '../../../shared/stores/useToastStore';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';

interface Props {
  companyId: string;
}



export function ProcessRoutingTab({ companyId }: Props) {
  const { confirm } = useConfirm();
  const [processes, setProcesses] = useState<ProcessMaster[]>([]);
  const [templates, setTemplates] = useState<RoutingTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [processForm, setProcessForm] = useState<Partial<ProcessMaster> | null>(null);
  const [templateForm, setTemplateForm] = useState<Partial<RoutingTemplate> & { editingItems: any[] } | null>(null);

  useEffect(() => {
    loadData();
  }, [companyId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [p, t] = await Promise.all([
        fetchProcesses(companyId),
        fetchRoutingTemplates(companyId)
      ]);
      setProcesses(p);
      setTemplates(t);
    } catch (err: any) {
      toast.error('데이터를 불러오는데 실패했습니다: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProcess = async () => {
    if (!processForm?.name) {
      toast.error('공정명을 입력해주세요.');
      return;
    }
    try {
      if (processForm.id) {
        await updateProcess(processForm.id, {
          name: processForm.name,
          description: processForm.description,
          is_outsource: processForm.is_outsource || false
        });
        toast.success('공정이 수정되었습니다.');
      } else {
        await createProcess({
          company_id: companyId,
          name: processForm.name,
          description: processForm.description || '',
          is_outsource: processForm.is_outsource || false
        });
        toast.success('공정이 등록되었습니다.');
      }
      setProcessForm(null);
      loadData();
    } catch (err: any) {
      toast.error('저장에 실패했습니다: ' + err.message);
    }
  };

  const handleDeleteProcess = async (id: string) => {
    if (!(await confirm({ title: '삭제', description: '정말 삭제하시겠습니까? (연결된 라우팅 템플릿 항목도 삭제됩니다)', isDanger: true }))) return;
    try {
      await deleteProcess(id);
      toast.success('삭제되었습니다.');
      loadData();
    } catch (err: any) {
      toast.error('삭제 실패: ' + err.message);
    }
  };

  const handleSaveTemplate = async () => {
    if (!templateForm?.name) {
      toast.error('템플릿명을 입력해주세요.');
      return;
    }
    try {
      const items = templateForm.editingItems.map((item, index) => ({
        id: item.id, // may be undefined for new items
        process_id: item.process_id,
        sequence_no: index + 1
      }));

      if (templateForm.id) {
        await updateRoutingTemplate(templateForm.id, {
          name: templateForm.name,
          description: templateForm.description
        }, items);
        toast.success('템플릿이 수정되었습니다.');
      } else {
        await createRoutingTemplate({
          company_id: companyId,
          name: templateForm.name,
          description: templateForm.description || ''
        }, items);
        toast.success('템플릿이 등록되었습니다.');
      }
      setTemplateForm(null);
      loadData();
    } catch (err: any) {
      toast.error('저장에 실패했습니다: ' + err.message);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!(await confirm({ title: '템플릿 삭제', description: '정말 템플릿을 삭제하시겠습니까?', isDanger: true }))) return;
    try {
      await deleteRoutingTemplate(id);
      toast.success('삭제되었습니다.');
      loadData();
    } catch (err: any) {
      toast.error('삭제 실패: ' + err.message);
    }
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination || !templateForm) return;
    
    const items = Array.from(templateForm.editingItems);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    setTemplateForm({ ...templateForm, editingItems: items });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="w-6 h-6 text-brand-500" />
        <h2 className="text-xl font-bold text-text-primary">공정 & 라우팅 설계 관리</h2>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* 공정 마스터 관리 */}
        <Card className="bg-bg-elevated border-border-default h-[600px] flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between py-4 border-b border-border-default shrink-0">
            <CardTitle className="text-lg">공정(Process) 항목 등록</CardTitle>
            <Button size="sm" onClick={() => setProcessForm({ name: '', description: '', is_outsource: false })}>
              <Plus size={16} className="mr-1" /> 새 공정 등록
            </Button>
          </CardHeader>
          <CardContent className="p-0 overflow-auto flex-1">
            <Table>
              <Thead>
                <Tr>
                  <Th>공정명</Th>
                  <Th>설명</Th>
                  <Th>외주 여부</Th>
                  <Th className="w-24 text-right">관리</Th>
                </Tr>
              </Thead>
              <Tbody>
                {processes.map(p => (
                  <Tr key={p.id}>
                    <Td className="font-medium text-text-primary">{p.name}</Td>
                    <Td className="text-text-secondary text-xs">{p.description}</Td>
                    <Td>
                      <StatusBadge type="process" status={String(p.is_outsource)} />
                    </Td>
                    <Td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setProcessForm(p)} className="p-1 hover:bg-bg-surface rounded text-text-secondary hover:text-brand-400 transition-colors">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleDeleteProcess(p.id)} className="p-1 hover:bg-danger/10 rounded text-text-secondary hover:text-danger transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </Td>
                  </Tr>
                ))}
                {processes.length === 0 && !loading && (
                  <Tr>
                    <Td colSpan={4} className="text-center py-8 text-text-secondary text-sm">
                      등록된 공정 항목이 없습니다.
                    </Td>
                  </Tr>
                )}
              </Tbody>
            </Table>
          </CardContent>
        </Card>

        {/* 라우팅 템플릿 관리 */}
        <Card className="bg-bg-elevated border-border-default min-h-[550px] flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between py-4 border-b border-border-default shrink-0">
            <CardTitle className="text-lg">라우팅 템플릿(Routing) 설계</CardTitle>
            <Button size="sm" onClick={() => setTemplateForm({ name: '', description: '', editingItems: [] })}>
              <Plus size={16} className="mr-1" /> 새 템플릿 등록
            </Button>
          </CardHeader>
          <CardContent className="p-0 overflow-auto flex-1">
            <div className="p-4 space-y-4">
              {templates.map(t => (
                <div key={t.id} className="border border-border-default rounded-lg p-4 bg-bg-surface">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-bold text-text-primary text-base">{t.name}</h4>
                      {t.description && <p className="text-xs text-text-secondary mt-1">{t.description}</p>}
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setTemplateForm({ ...t, editingItems: t.items || [] })} className="p-1.5 hover:bg-bg-base rounded text-text-secondary hover:text-brand-400 transition-colors">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => handleDeleteTemplate(t.id)} className="p-1.5 hover:bg-danger/10 rounded text-text-secondary hover:text-danger transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {t.items?.map((item, idx) => (
                      <React.Fragment key={item.id}>
                        <StatusBadge 
                          type="process" 
                          status={String(item.processes?.is_outsource)} 
                          label={item.processes?.name || '알수없음'} 
                        />
                        {idx < (t.items?.length || 0) - 1 && (
                          <span className="text-text-tertiary">➔</span>
                        )}
                      </React.Fragment>
                    ))}
                    {(!t.items || t.items.length === 0) && (
                      <span className="text-xs text-text-secondary">등록된 공정이 없습니다.</span>
                    )}
                  </div>
                </div>
              ))}
              {templates.length === 0 && !loading && (
                <div className="text-center py-8 text-text-secondary text-sm">
                  등록된 템플릿이 없습니다.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Process Form Modal */}
      {processForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <Card className="w-full max-w-md bg-bg-elevated border-border-default shadow-2xl">
            <CardHeader className="py-4 border-b border-border-default">
              <CardTitle>{processForm.id ? '공정 수정' : '새 공정 등록'}</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">공정명 *</label>
                <BaseInput 
                  value={processForm.name} 
                  onChange={(e) => setProcessForm({ ...processForm, name: e.target.value })} 
                  placeholder="예: MCT, 선반, 아노다이징"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">설명</label>
                <BaseInput 
                  value={processForm.description || ''} 
                  onChange={(e) => setProcessForm({ ...processForm, description: e.target.value })} 
                  placeholder="공정 상세 설명 (선택)"
                />
              </div>
              <div className="flex items-center mt-2 pt-2">
                <input 
                  type="checkbox" 
                  id="is_outsource"
                  checked={processForm.is_outsource || false}
                  onChange={(e) => setProcessForm({ ...processForm, is_outsource: e.target.checked })}
                  className="w-4 h-4 rounded border-border-default text-brand-500 bg-bg-surface focus:ring-brand-500"
                />
                <label htmlFor="is_outsource" className="ml-2 text-sm text-text-primary font-medium cursor-pointer">
                  외주 전용 공정 여부
                </label>
              </div>
              <p className="text-xs text-text-secondary mt-1 ml-6">
                체크 시, 현장에서 이 공정을 시작할 때 <b>[외주 업체 지정 팝업]</b>이 표시되며 현장 발주가 진행됩니다.
              </p>
              <div className="flex justify-end gap-2 pt-4 border-t border-border-default mt-6">
                <Button variant="secondary" onClick={() => setProcessForm(null)}>취소</Button>
                <Button onClick={handleSaveProcess}>저장</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Template Form Modal */}
      {templateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <Card className="w-full max-w-2xl bg-bg-elevated border-border-default shadow-2xl flex flex-col max-h-[90vh]">
            <CardHeader className="py-4 border-b border-border-default shrink-0">
              <CardTitle>{templateForm.id ? '라우팅 템플릿 수정' : '새 라우팅 템플릿 등록'}</CardTitle>
            </CardHeader>
            <CardContent className="p-6 flex flex-col overflow-hidden min-h-0">
              <div className="space-y-4 mb-6 shrink-0">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">템플릿명 *</label>
                    <BaseInput 
                      value={templateForm.name} 
                      onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })} 
                      placeholder="예: 알루미늄 가공 표준"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">설명</label>
                    <BaseInput 
                      value={templateForm.description || ''} 
                      onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })} 
                      placeholder="템플릿 설명 (선택)"
                    />
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-text-secondary">공정 순서 설계</label>
                  
                  {/* 추가할 공정 선택 Dropdown or Select */}
                  <div className="flex items-center gap-2">
                    <select 
                      className="bg-bg-surface border border-border-default text-text-primary rounded text-sm p-1.5 focus:border-brand-500 outline-none"
                      onChange={(e) => {
                        const pid = e.target.value;
                        if (!pid) return;
                        const p = processes.find(x => x.id === pid);
                        if (p) {
                          setTemplateForm({
                            ...templateForm,
                            editingItems: [
                              ...templateForm.editingItems, 
                              { process_id: p.id, processes: p, id: Math.random().toString() }
                            ]
                          });
                        }
                        e.target.value = ''; // reset
                      }}
                    >
                      <option value="">+ 공정 추가</option>
                      {processes.map(p => (
                        <option key={p.id} value={p.id}>{p.name} {p.is_outsource ? '(외주)' : ''}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex-1 overflow-auto bg-bg-base rounded-md border border-border-default p-2 min-h-[200px]">
                  {templateForm.editingItems.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-text-secondary text-sm">
                      우측 상단의 '+ 공정 추가'를 눌러 순서를 설계하세요.
                    </div>
                  ) : (
                    <DragDropContext onDragEnd={onDragEnd}>
                      <Droppable droppableId="template-items">
                        {(provided) => (
                          <div 
                            {...provided.droppableProps} 
                            ref={provided.innerRef}
                            className="space-y-2"
                          >
                            {templateForm.editingItems.map((item, index) => (
                              <Draggable key={item.id} draggableId={item.id} index={index}>
                                {(provided) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    className="flex items-center gap-3 p-3 bg-bg-surface border border-border-default rounded-md shadow-sm group"
                                  >
                                    <div {...provided.dragHandleProps} className="text-text-tertiary cursor-grab hover:text-brand-500">
                                      <GripVertical size={18} />
                                    </div>
                                    <div className="w-6 h-6 rounded-full bg-brand-500/20 text-brand-500 flex items-center justify-center text-xs font-bold shrink-0">
                                      {index + 1}
                                    </div>
                                    <div className="flex-1 font-medium text-text-primary text-sm">
                                      {item.processes?.name}
                                    </div>
                                    {item.processes?.is_outsource && (
                                      <span className="text-[10px] bg-brand-500/10 text-brand-500 px-1.5 py-0.5 rounded">외주</span>
                                    )}
                                    <button 
                                      className="text-text-tertiary hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                      onClick={() => {
                                        const newItems = [...templateForm.editingItems];
                                        newItems.splice(index, 1);
                                        setTemplateForm({ ...templateForm, editingItems: newItems });
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
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-border-default mt-6 shrink-0">
                <Button variant="secondary" onClick={() => setTemplateForm(null)}>취소</Button>
                <Button onClick={handleSaveTemplate}>설계 완료</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
