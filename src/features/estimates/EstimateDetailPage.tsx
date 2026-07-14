import React, { useState, type DragEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Save, Send, Search, UploadCloud, Wand2 } from 'lucide-react';
import { Button } from '../../design-system/Button';
import { BaseInput } from '../../design-system/BaseInput';
import { Card } from '../../design-system/Card';
import { Badge } from '../../design-system/Badge';
import { FloatingToolbar } from '../../design-system/FloatingToolbar';
import { EstimateItemModal } from './components/EstimateItemModal';
import { EstimateTable } from './components/EstimateTable';
import { HistorySearchDrawer } from './components/HistorySearchDrawer';
import { EstimateBatchToolbar } from './components/EstimateBatchToolbar';
import { useEstimateDetail, useEstimateMetadata } from './hooks/useEstimate';
import type { EstimateItem } from './types';
import { useAuth } from '../../app/providers/AuthProvider';
import { supabase } from '../../shared/services/supabase';
import { useClients } from '../clients/hooks/useClients';
import { ClientModal } from '../clients/components/ClientModal';
import { BaseCombobox } from '../../design-system/BaseCombobox';
import { BaseSelect } from '../../design-system/BaseSelect';
import { NumberInput } from '../../design-system/NumberInput';
import type { ClientFormData } from '../../shared/types/client';
import { INITIAL_ITEM_FORM } from './types';
import { read, utils } from 'xlsx';
import { ImportItemsModal } from './components/ImportItemsModal';
import { PreviewModal } from './components/PreviewModal';
import { Printer } from 'lucide-react';
import { matchFilesToItems } from './utils/fileMatching';
import { FilenameParserModal } from './components/FilenameParserModal';
import { SmartPdfImporter } from './components/SmartPdfImporter';

export const EstimateDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { estimate, setEstimate, items, setItems, loading, saving, saveDetail, updateItem, addItem, removeItems, reload } = useEstimateDetail(id);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importModalInitialRows, setImportModalInitialRows] = useState<string[][]>([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isParserModalOpen, setIsParserModalOpen] = useState(false);
  const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);
  const [droppedFiles, setDroppedFiles] = useState<File[]>([]);

  const { user } = useAuth();
  const [editingItemForModal, setEditingItemForModal] = useState<EstimateItem | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const metadata = useEstimateMetadata(companyId);
  const [defaultExchangeRate, setDefaultExchangeRate] = useState<number>(1400.0);
  const { clients, fetchClients, saveClient } = useClients();

  React.useEffect(() => {
    async function init() {
      if (user) {
        const { data } = await supabase.from('profiles').select('company_id').eq('id', user.id).single();
        if (data?.company_id) {
          setCompanyId(data.company_id);
          fetchClients(data.company_id);

          const { data: company } = await supabase.from('companies').select('default_exchange_rate').eq('id', data.company_id).single();
          if (company?.default_exchange_rate) {
            setDefaultExchangeRate(company.default_exchange_rate);
          }
        }
      }
    }
    init();
  }, [user, fetchClients]);

  const clientOptions = clients.map(c => ({ value: c.id, label: c.name }));

  const handleSaveClient = async (formData: ClientFormData) => {
    if (!companyId) return;
    await saveClient(companyId, formData);
  };

  const handleClientChange = (val: string) => {
    const client = clients.find(c => c.id === val);
    if (!client) {
      setEstimate({ ...estimate, client_id: val });
      return;
    }
    
    // Auto-apply currency and exchange rate based on client's currency and company's default settings
    const newCurrency = client.currency || 'KRW';
    const newRate = newCurrency === 'KRW' ? 1.0 : defaultExchangeRate;
    
    setEstimate({ 
      ...estimate, 
      client_id: val,
      currency: newCurrency,
      base_exchange_rate: newRate
    });
  };

  const [showForeign, setShowForeign] = useState(false);
  const isForeignMode = showForeign && estimate?.currency !== 'KRW' && (estimate?.base_exchange_rate || 0) > 0;

  const [isGeneratingProjectName, setIsGeneratingProjectName] = useState(false);
  const handleGenerateProjectName = async () => {
    if (!companyId) return;
    setIsGeneratingProjectName(true);
    try {
      const now = new Date();
      const year = now.getFullYear().toString().slice(2);
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const day = now.getDate().toString().padStart(2, '0');
      const prefix = `ES${year}${month}${day}`;

      const { data: latest } = await supabase
        .from('estimates')
        .select('project_name')
        .eq('company_id', companyId)
        .ilike('project_name', `${prefix}%`)
        .order('project_name', { ascending: false })
        .limit(1)
        .maybeSingle();

      let seq = 1;
      if (latest && latest.project_name) {
        const parts = latest.project_name.split('-');
        if (parts.length === 2 && !isNaN(Number(parts[1]))) {
          seq = Number(parts[1]) + 1;
        }
      }

      const newName = `${prefix}-${seq.toString().padStart(3, '0')}`;
      setEstimate({ ...estimate, project_name: newName });
    } catch (e) {
      console.error('Failed to generate project name', e);
    } finally {
      setIsGeneratingProjectName(false);
    }
  };

  // Derive selected rows from items
  const selectedRows = items.filter((item: any) => item.selected).map(item => item.id!);

  const isNew = id === 'new';

  // handleRowClick is no longer needed since Table handles its own expansion

  const handleBulkDelete = () => {
    removeItems(selectedRows);
  };

  const handleSave = async () => {
    if (!companyId) return;
    await saveDetail({ ...estimate, company_id: companyId }, items);
    if (isNew) {
      navigate('/estimates');
    }
  };

  const handleAddItem = async () => {
    if (isNew) {
      if (!estimate.client_id) {
        alert('품목을 추가하기 전에 거래처를 먼저 선택해주세요.');
        return;
      }
      try {
        if (!companyId) {
           alert('회사 정보를 불러오지 못했습니다.');
           return;
        }
        const savedEstimate = await saveDetail({ ...estimate, company_id: companyId }, items);
        // Navigate to the real URL so subsequent saves work
        if (savedEstimate?.id) {
          navigate(`/estimates/${savedEstimate.id}`, { replace: true });
        }
      } catch (e: any) {
        console.error(e);
        alert('임시 견적서를 생성하는 도중 오류가 발생했습니다.');
        return;
      }
    }

    const newItem: EstimateItem = {
      ...INITIAL_ITEM_FORM,
      id: crypto.randomUUID(),
      part_no: 'NEW-PART',
      part_name: '새 품목',
      original_material_name: 'AL6061',
      qty: 1,
      unit_price: 0,
      supply_price: 0
    };
    addItem(newItem);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    console.log("DROP EVENT TRIGGERED. Files:", files.map(f => f.name));
    if (files.length === 0) return;

    const excelFiles = files.filter(f => f.name.endsWith('.xlsx') || f.name.endsWith('.xls') || f.name.endsWith('.csv'));
    const otherFiles = files.filter(f => !excelFiles.includes(f));
    console.log("excelFiles:", excelFiles.length, "otherFiles:", otherFiles.length);

    // 사용자의 명시적인 요청에 따라: 드래그 앤 드롭으로는 엑셀 자동 임포트 팝업을 띄우지 않습니다.
    // 엑셀 파일은 전용 [엑셀/표 붙여넣기] 버튼이나 붙여넣기(Ctrl+V)를 통해서만 작동하도록 합니다.
    // 따라서 여기서는 엑셀 파일을 무시하거나 일반 첨부파일로 처리합니다.
    // 도면 및 기타 일반 첨부파일만 매칭/파싱 프로세스로 넘깁니다.

    if (otherFiles.length > 0) {
      // 1. 도면 파일 매칭 진행
      const { matched, unmatched } = matchFilesToItems(otherFiles, items);

      // 2. 매칭된 파일 병합 (tempFiles)
      if (matched.length > 0) {
        const newItems = [...items];
        let matchCount = 0;
        
        matched.forEach(m => {
          const itemIndex = newItems.findIndex(it => it.id === m.itemId);
          if (itemIndex !== -1) {
            const currentTempFiles = newItems[itemIndex].tempFiles || [];
            newItems[itemIndex] = {
              ...newItems[itemIndex],
              tempFiles: [...currentTempFiles, ...m.files]
            };
            matchCount++;
          }
        });

        if (matchCount > 0) {
          setItems(newItems as any);
        }
      }

      // 3. 매칭 실패한 파일은 파서 모달로 전달
      if (unmatched.length > 0) {
        setDroppedFiles(unmatched);
        setIsParserModalOpen(true);
      }
    }
  };

  const subTotal = items.reduce((sum, item) => sum + (item.supply_price || 0), 0);
  const totalAmount = isForeignMode ? subTotal / (estimate?.base_exchange_rate || 1) : subTotal; // 부가세 별도 (리스트 합계와 동일하게 맞춤)

  if (loading) {
    return <div className="p-6 text-text-secondary">데이터를 불러오는 중입니다...</div>;
  }

  const activeItem = items.find(item => item.id === selectedItemId);

  return (
    <div 
      className="flex flex-col h-full bg-bg-base animate-in fade-in relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Smart Dropzone Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-brand-500/10 border-4 border-dashed border-brand-500 rounded-lg flex flex-col items-center justify-center backdrop-blur-sm transition-all pointer-events-none">
          <UploadCloud size={64} className="text-brand-500 mb-4 animate-bounce" />
          <h2 className="text-2xl font-bold text-brand-500">도면 파일(PDF, 3D 등)을 여기에 놓아주세요</h2>
          <p className="text-brand-500/80 mt-2">자동으로 분석하여 품목 리스트에 추가합니다.</p>
        </div>
      )}

      {/* Merged Header (Top Navigation + Basic Info + Totals) */}
      <div className="bg-bg-surface border-b border-border-default z-10 shadow-sm flex flex-col shrink-0">
        {/* Top Row: Title, Totals, Actions */}
        <div className="px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => navigate('/estimates')}
              className="p-2 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-text-primary">
                {isNew ? '새 견적 작성' : `견적 상세 (EST-${(estimate?.id || '').substring(0, 8).toUpperCase()})`}
              </h1>
              {!isNew && (
                <div className="flex items-center">
                  {estimate?.status === 'DRAFT' && <Badge variant="warning">작성중</Badge>}
                  {estimate?.status === 'SENT' && <Badge variant="default">견적제출</Badge>}
                  {estimate?.status === 'ORDERED' && <Badge variant="success">수주완료</Badge>}
                  {estimate?.status === 'ARCHIVED' && <Badge variant="default">보관됨</Badge>}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            {/* Total Amounts */}
            <div className="flex items-center gap-4 bg-bg-elevated/30 py-1.5 px-4 rounded-lg border border-border-default/50">
               <div className="text-right flex items-center gap-3">
                  <div className="text-xs text-text-secondary font-medium">총 견적 금액</div>
                  <div className="text-2xl font-bold text-brand-400 leading-none">
                    {totalAmount.toLocaleString(undefined, isForeignMode ? { maximumFractionDigits: 2 } : {})} <span className="text-base font-normal text-brand-400/70 ml-0.5">{isForeignMode ? estimate?.currency : '원'}</span>
                  </div>
               </div>
            </div>
            
            <div className="flex space-x-2">
              {!isNew && (
                <Button variant="secondary" className="flex items-center gap-2" onClick={() => setIsPreviewOpen(true)}>
                  <Printer size={16} />
                  출력 / 전송
                </Button>
              )}
              <Button variant="primary" className="flex items-center gap-2" onClick={handleSave} disabled={saving}>
                <Save size={16} />
                {saving ? '저장 중...' : '일괄 저장'}
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom Row: Basic Info Ribbon */}
        <div className="px-6 pb-4">
          <div className="flex items-center gap-6 bg-bg-elevated/20 px-4 py-2.5 rounded-lg border border-border-default/50">
             {/* Project Name */}
             <div className="flex-1 flex items-center gap-3">
                <label className="text-xs font-medium text-text-secondary whitespace-nowrap">프로젝트</label>
                <div className="flex-1 flex items-center gap-1">
                  <input 
                    className="w-full bg-bg-surface border border-border-default rounded h-8 text-sm px-3 outline-none focus:border-brand-500 text-text-primary"
                    placeholder="프로젝트명" 
                    value={estimate?.project_name || ''} 
                    onChange={(e) => setEstimate({ ...estimate, project_name: e.target.value })} 
                  />
                  <button onClick={handleGenerateProjectName} className="text-brand-500 hover:text-brand-400 p-1.5 bg-brand-500/10 hover:bg-brand-500/20 rounded transition-colors" title="자동 생성"><Wand2 size={14}/></button>
                </div>
             </div>
             
             {/* Client */}
             <div className="flex-1 flex items-center gap-3">
                <label className="text-xs font-medium text-text-secondary whitespace-nowrap">거래처</label>
                <div className="flex-1 flex items-center gap-1">
                  <div className="flex-1 h-8">
                    <BaseCombobox 
                      value={estimate?.client_id || ''} 
                      onChange={handleClientChange} 
                      options={clientOptions}
                      placeholder="선택..." 
                      inputClassName="w-full px-3 py-1.5 h-8 text-sm rounded border border-border-default bg-bg-surface text-text-primary focus:outline-none focus:border-brand-500"
                    />
                  </div>
                  <button onClick={() => setIsClientModalOpen(true)} className="text-brand-500 hover:text-brand-400 p-1.5 bg-brand-500/10 hover:bg-brand-500/20 rounded transition-colors" title="신규 등록"><Plus size={14}/></button>
                </div>
             </div>

             {/* Currency & Date */}
             <div className="flex items-center gap-5">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-text-secondary whitespace-nowrap">통화</label>
                  <select
                    className="bg-bg-surface border border-border-default text-text-primary rounded h-8 text-sm px-2 outline-none focus:border-brand-500 min-w-[80px]"
                    value={estimate?.currency || 'KRW'}
                    onChange={(e) => setEstimate({ ...estimate, currency: e.target.value })}
                  >
                    <option value="KRW">KRW</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="JPY">JPY</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-text-secondary whitespace-nowrap">환율</label>
                  <div className="w-[100px]">
                    <NumberInput
                      value={estimate?.base_exchange_rate || 1}
                      onChange={(val) => setEstimate({ ...estimate, base_exchange_rate: val })}
                      className="!w-[100px]"
                      inputClassName="!h-8 !py-1.5 !px-2 !text-sm !bg-bg-surface"
                    />
                  </div>
                  {estimate?.currency !== 'KRW' && (
                    <button 
                      onClick={() => setShowForeign(!showForeign)}
                      className={`text-[11px] px-2 py-1 rounded transition-colors border ${showForeign ? 'bg-brand-500/20 border-brand-500 text-brand-400 font-bold' : 'bg-bg-surface border-border-default text-text-secondary'}`}
                    >
                      외화 적용
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-text-secondary whitespace-nowrap">작성일</label>
                  <input 
                    type="date"
                    className="bg-bg-surface border border-border-default rounded h-8 text-sm px-2 outline-none focus:border-brand-500 text-text-primary"
                    value={estimate?.created_at ? estimate.created_at.substring(0, 10) : ''} 
                    onChange={(e) => setEstimate({ ...estimate, created_at: e.target.value })} 
                  />
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* Main Content Area (1-Panel) */}
      <div className="flex-1 overflow-hidden flex flex-col relative bg-bg-base">
        <div className="flex-1 flex flex-col p-6 overflow-hidden">
          {/* 품목 리스트 */}
          <Card className="flex-1 flex flex-col p-6 relative overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold text-text-primary">품목 리스트</h3>
                {items.length > 0 && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-bg-elevated border border-border-default text-[11px] text-text-secondary shadow-sm">
                    💡 화면 어디든 파일을 드롭하여 추가하세요
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex items-center gap-1.5 text-brand-500 border-brand-500/30 hover:bg-brand-500/10" onClick={() => {
                  setImportModalInitialRows([]);
                  setIsImportModalOpen(true);
                }}>
                  <UploadCloud size={14} />
                  엑셀/표 붙여넣기
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="flex items-center gap-1.5 text-purple-400 border-purple-500/30 hover:bg-purple-500/10 transition-colors shadow-[0_0_15px_rgba(168,85,247,0.15)] hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] bg-purple-500/5 backdrop-blur-md" 
                  onClick={() => setIsOcrModalOpen(true)}
                >
                  <Wand2 size={14} />
                  도면 분할 / OCR
                </Button>
                <Button size="sm" variant="secondary" className="flex items-center gap-1.5" onClick={() => setIsHistoryOpen(true)}>
                  <Search size={14} />
                  단가 이력 검색
                </Button>
                <Button size="sm" variant="primary" className="flex items-center gap-1.5" onClick={handleAddItem}>
                  <Plus size={14} />
                  품목 추가
                </Button>
              </div>
            </div>
            
            <EstimateBatchToolbar
              selectedCount={selectedRows.length}
              onClearSelection={() => setItems(items.map(item => ({ ...item, selected: false } as any)))}
              onDelete={handleBulkDelete}
              onApplyDeliveryDays={(days) => {
                const newItems = items.map(item => 
                  item.selected ? { ...item, work_days: days } : item
                ) as any;
                setItems(newItems);
              }}
            />

            <EstimateTable 
              items={items} 
              onChange={setItems} 
              onAddManualItem={handleAddItem}
              isReadOnly={estimate.status === 'SENT' || estimate.status === 'ORDERED'}
              companyInfo={metadata?.companyInfo}
              metadata={metadata}
              estimateId={id || undefined}
              currency={estimate?.currency || 'KRW'}
              exchangeRate={estimate?.base_exchange_rate || 1}
              showForeign={isForeignMode}
              onSaveSuccess={reload}
              onOpenModal={(item) => {
                setEditingItemForModal(item);
                setIsModalOpen(true);
              }}
            />
            
          </Card>
        </div>
      </div>

      {isModalOpen && editingItemForModal && metadata && (
        <EstimateItemModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingItemForModal(null);
          }}
          estimateId={id || null}
          metadata={metadata}
          currency={estimate?.currency || 'KRW'}
          exchangeRate={estimate?.base_exchange_rate || 1}
          editingItem={editingItemForModal}
          onSaveSuccess={() => {
            reload();
            setIsModalOpen(false);
            setEditingItemForModal(null);
          }}
          onSaveFiles={async () => {}}
          onDeleteExistingFile={async () => {}}
          existingItems={items}
        />
      )}

      <HistorySearchDrawer 
        isOpen={isHistoryOpen} 
        onClose={() => setIsHistoryOpen(false)} 
        companyId={companyId}
        onApplyItem={(itemInfo) => {
          // Simply add a new item with the retrieved information
          const newItem: EstimateItem = {
            ...INITIAL_ITEM_FORM,
            ...itemInfo,
            id: Date.now().toString(), // Create new ID
            estimate_id: undefined,    // Clear old estimate link
            qty: 1,                    // Reset quantity
          };
          // Recalculate total supply price based on unit price and new qty
          newItem.supply_price = (newItem.unit_price || 0) * newItem.qty;
          addItem(newItem);
        }}
      />

      {isClientModalOpen && (
        <ClientModal
          isOpen={isClientModalOpen}
          onClose={() => setIsClientModalOpen(false)}
          onSave={handleSaveClient}
        />
      )}

      {isImportModalOpen && (
        <ImportItemsModal
          isOpen={isImportModalOpen}
          onClose={() => {
            setIsImportModalOpen(false);
            setImportModalInitialRows([]);
          }}
          onConfirm={(newItems) => {
            // Append mapped items
            const currentItems = [...items];
            newItems.forEach(item => {
              const newItem: EstimateItem = {
                ...INITIAL_ITEM_FORM,
                ...item,
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              };
              currentItems.push(newItem);
            });
            setItems(currentItems as any);
          }}
          initialRawRows={importModalInitialRows}
        />
      )}

      {isPreviewOpen && (
        <PreviewModal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          estimate={estimate}
          items={items}
          clientInfo={clients.find(c => c.id === estimate.client_id)}
        />
      )}

      {isParserModalOpen && (
        <FilenameParserModal
          isOpen={isParserModalOpen}
          onClose={() => setIsParserModalOpen(false)}
          files={droppedFiles}
          onParseComplete={(parsedData) => {
            console.log('Parsed data (new items):', parsedData);
            if (parsedData.length > 0) {
              setItems(prev => [...prev, ...parsedData] as any);
            }
          }}
        />
      )}

      {isOcrModalOpen && (
        <SmartPdfImporter
          isOpen={isOcrModalOpen}
          onClose={() => setIsOcrModalOpen(false)}
          onImportComplete={(files: File[]) => {
            setDroppedFiles(prev => [...prev, ...files]);
            setIsParserModalOpen(true);
          }}
        />
      )}
    </div>
  );
};
