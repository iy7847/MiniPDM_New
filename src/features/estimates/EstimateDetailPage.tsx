import React, { useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { UploadCloud, Search, Wand2, Plus } from 'lucide-react';
import { Button } from '../../design-system/Button';
import { Card } from '../../design-system/Card';
import { EstimateTable } from './components/EstimateTable';
import { EstimateBatchToolbar } from './components/EstimateBatchToolbar';
import { useEstimateDetail, useEstimateMetadata } from './hooks/useEstimate';
import { useAuth } from '../../app/providers/AuthProvider';
import { supabase } from '../../shared/services/supabase';
import { toast } from '../../shared/stores/useToastStore';
import { useClients } from '../clients/hooks/useClients';
import { EstimateHeader } from './components/EstimateHeader';
import { EstimateBasicInfo } from './components/EstimateBasicInfo';
import { EstimateDetailModals, type EstimateDetailModalsRef } from './components/EstimateDetailModals';
import { CustomQuotationTemplate } from './components/CustomQuotationTemplate';
import { CustomColumnDropdown } from './components/CustomColumnDropdown';
import { useEstimatePageActions } from './hooks/useEstimatePageActions';

export const EstimateDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { estimate, setEstimate, items, setItems, loading, saving, saveDetail, removeItems, reload } = useEstimateDetail(id);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const { user } = useAuth();
  const metadata = useEstimateMetadata(companyId);
  const [defaultExchangeRate, setDefaultExchangeRate] = useState<number>(1400.0);
  const { clients, fetchClients, saveClient } = useClients();

  const modalsRef = useRef<EstimateDetailModalsRef>(null);

  const [showForeign, setShowForeign] = useState(false);
  const isForeignMode = showForeign && estimate?.currency !== 'KRW' && (estimate?.base_exchange_rate || 0) > 0;
  const isNew = id === 'new';
  const isLocked = estimate?.status === 'SENT' || estimate?.status === 'ORDERED';

  const totalAmount = isForeignMode && (estimate?.base_exchange_rate || 0) > 0
    ? items.reduce((sum, item) => sum + (Math.ceil(((item.supply_price || 0) / estimate.base_exchange_rate!) * 100) / 100), 0)
    : items.reduce((sum, item) => sum + (item.supply_price || 0), 0);

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

  React.useEffect(() => {
    if (id === 'new' && location.state?.importedItems && items.length === 0 && !loading) {
      const imported = location.state.importedItems.map((item: any) => {
        const { id, estimate_id, created_at, estimate, material, files, ...rest } = item;
        return {
          ...rest,
          files,
          id: 'temp-' + Math.random().toString(36).substr(2, 9)
        };
      });
      setItems(imported);
      navigate('.', { replace: true, state: {} });
    }
  }, [id, location.state, items.length, loading, setItems, navigate]);

  const {
    isDragging,
    handleGenerateProjectName,
    handleStatusChange,
    handleSubmitEstimate,
    handleMultiDuplicate,
    handleSave,
    handleAddItem,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleRemoveSingleFile,
    handleRemoveMultipleFiles
  } = useEstimatePageActions({
    id,
    isNew,
    companyId,
    estimate: estimate as any,
    setEstimate,
    items: items as any,
    setItems,
    metadata,
    saveDetail,
    navigate,
    modalsRef
  });

  const handleClientChange = (val: string) => {
    const client = clients.find(c => c.id === val);
    if (!client) {
      setEstimate({ ...estimate, client_id: val });
      return;
    }
    const newCurrency = client.currency || 'KRW';
    const newRate = newCurrency === 'KRW' ? 1.0 : defaultExchangeRate;
    setEstimate({ 
      ...estimate, 
      client_id: val,
      currency: newCurrency,
      base_exchange_rate: newRate
    });
  };

  const handleConvertOrder = async (selectedItemsToOrder: any[], customTotalAmount: number) => {
    const selectedItemIds = selectedItemsToOrder.map(item => item.id);
    if (!user?.id || !companyId || !estimate?.id || selectedItemIds.length === 0) {
      toast.error('필수 정보가 누락되었습니다.');
      return;
    }

    if (!estimate.client_id) {
      toast.error('거래처가 지정되지 않은 견적서는 수주로 전환할 수 없습니다. 거래처를 먼저 지정해주세요.');
      return;
    }

    if (selectedItemIds.some(id => !id || id === 'NEW-PART' || String(id).startsWith('temp-'))) {
      toast.error('저장되지 않은 임시 품목이 포함되어 있습니다. 견적서를 저장한 후 다시 시도해주세요.');
      return;
    }
    
    try {
      // 1. RPC 호출 (반환값: JSONB)
      const { data: responseData, error } = await supabase.rpc('convert_estimate_to_order', {
        p_estimate_id: estimate.id,
        p_company_id: companyId,
        p_user_id: user.id,
        p_selected_item_ids: selectedItemIds
      });

      if (error) throw error;

      // responseData 형태: { order_id, po_no, mapping: { [estimate_item_id]: order_item_id } }
      const poNo = responseData?.po_no || 'UNKNOWN_PO';
      const itemMappings = responseData?.mapping || {};
      const orderId = responseData?.order_id;

      // 1.5. 수동으로 수정한 수주 총액과 품목별 발주 수량/금액을 DB에 업데이트
      if (orderId) {
        // 수주 총액 업데이트
        await supabase
          .from('orders')
          .update({ total_amount: customTotalAmount })
          .eq('id', orderId);

        // 품목별 수량 및 금액 업데이트
        for (const item of selectedItemsToOrder) {
          const orderItemId = itemMappings[item.id];
          if (orderItemId) {
            await supabase
              .from('order_items')
              .update({
                qty: item.order_qty,
                supply_price: item.custom_order_amount,
                unit_price: item.unit_price || (item.custom_order_amount ? Math.round(item.custom_order_amount / item.order_qty) : 0)
              })
              .eq('id', orderItemId);
          }
        }

        // 견적서 상태를 ORDERED(수주 완료)로 업데이트
        await supabase
          .from('estimates')
          .update({ status: 'ORDERED' })
          .eq('id', estimate.id);
      }

      // 2. 파일 복사 및 DB 등록 처리
      const newFilesToInsert: any[] = [];

      for (const item of selectedItemsToOrder) {
        if (!item.files || item.files.length === 0) continue;
        
        const orderItemId = itemMappings[item.id];
        if (!orderItemId) continue;

        for (const file of item.files) {
          if (!file.file_path) continue;

          // 대상 경로: [현재 연도]/Orders/[PO번호]/[품번 또는 품명]
          const currentYear = new Date().getFullYear().toString();
          const targetFolderName = item.part_no || item.part_name || 'UNKNOWN';
          const targetPath = `${currentYear}/Orders/${poNo}/${targetFolderName}`;

          // window.fileSystem API로 물리적 복사 실행
          // (일렉트론 프리로드 스크립트에 saveFile이 구현되어 있다고 가정, 구버전 useFileHandler와 동일한 방식)
          if (window.fileSystem && window.fileSystem.saveFile) {
            try {
              const res = await window.fileSystem.saveFile(file.file_path, companyId, targetPath);
              if (res.success && res.filePath) {
                newFilesToInsert.push({
                  order_item_id: orderItemId,
                  file_name: file.file_name,
                  file_path: res.filePath,
                  file_type: file.file_type || 'DOCUMENT',
                  file_size: file.file_size || 0
                });
              } else {
                console.warn(`파일 복사 실패: ${file.file_name}`, res.error);
              }
            } catch (fsErr) {
              console.error(`파일 복사 중 에러: ${file.file_name}`, fsErr);
            }
          }
        }
      }

      // 3. 복사된 파일 DB 등록
      if (newFilesToInsert.length > 0) {
        const { error: insertError } = await supabase.from('files').insert(newFilesToInsert);
        if (insertError) {
          console.error('파일 DB 등록 에러:', insertError);
          // 실패하더라도 수주 자체는 완료되었으므로 알림만 줌
          toast.error('수주는 생성되었으나, 일부 도면 파일의 DB 등록에 실패했습니다.');
        }
      }
      
      toast.success('수주 확정이 성공적으로 완료되었습니다! 수주 관리 메뉴에서 확인하세요.');
      reload();
    } catch (err: any) {
      console.error(err);
      toast.error(`수주 전환 중 오류가 발생했습니다:\n${err.message || err.details || JSON.stringify(err)}`);
    }
  };

  const selectedRows = items.filter((item: any) => item.selected).map(item => item.id!);
  const handleBulkDelete = () => removeItems(selectedRows);

  if (loading) {
    return <div className="p-6 text-text-secondary">데이터를 불러오는 중입니다...</div>;
  }

  const handleOpenOrderModal = async () => {
    if (isNew || !estimate?.id) {
      toast.warning('신규 견적서입니다. 먼저 저장한 후 수주 전환을 진행해주세요.');
      return;
    }
    if (!estimate.client_id) {
      toast.error('거래처가 지정되지 않았습니다. 거래처를 먼저 선택해주세요.');
      return;
    }
    const hasTempItems = items.some(item => !item.id || item.id === 'NEW-PART' || String(item.id).startsWith('temp-'));
    if (hasTempItems) {
      toast.info('미저장 품목이 있어 견적서를 자동 저장합니다.');
      await handleSave();
    }
    modalsRef.current?.openOrderModal();
  };

  return (
    <div 
      className="flex flex-col h-full bg-bg-base animate-in fade-in relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={(e) => handleDrop(e, isLocked)}
    >
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-brand-500/10 border-4 border-dashed border-brand-500 rounded-lg flex flex-col items-center justify-center backdrop-blur-sm transition-all pointer-events-none">
          <UploadCloud size={64} className="text-brand-500 mb-4 animate-bounce" />
          <h2 className="text-2xl font-bold text-brand-500">도면 파일(PDF, 3D 등)을 여기에 놓아주세요</h2>
          <p className="text-brand-500/80 mt-2">자동으로 분석하여 품목 리스트에 추가합니다.</p>
        </div>
      )}

      <div className="bg-bg-surface border-b border-border-default z-10 shadow-sm flex flex-col shrink-0">
        <EstimateHeader
          isNew={isNew}
          estimate={estimate as any}
          items={items as any}
          companyId={companyId}
          saving={saving}
          isLocked={isLocked}
          totalAmount={totalAmount}
          isForeignMode={isForeignMode}
          onNavigateBack={() => navigate('/estimates')}
          onStatusChange={handleStatusChange}
          onSubmitEstimate={handleSubmitEstimate}
          onOpenOrderModal={handleOpenOrderModal}
          onOpenPreviewModal={() => modalsRef.current?.openPreviewModal()}
          onSave={handleSave}
        />
        
        <EstimateBasicInfo
          estimate={estimate as any}
          setEstimate={setEstimate}
          clients={clients}
          handleClientChange={handleClientChange}
          handleGenerateProjectName={handleGenerateProjectName}
          showForeign={showForeign}
          setShowForeign={setShowForeign}
          onOpenClientModal={() => modalsRef.current?.openClientModal()}
          isLocked={isLocked}
        />
      </div>

      <div className="flex-1 overflow-hidden flex flex-col relative bg-bg-base">
        <div className="flex-1 flex flex-col p-6 overflow-hidden">
          <Card className="flex-1 flex flex-col p-6 relative overflow-hidden">
            <div className="flex justify-between items-center mb-4 min-h-[40px]">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold text-text-primary">견적 품목 상세 내역</h3>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-bg-elevated border border-border-default text-[11px] text-text-secondary shadow-sm">
                  💡 파일을 드롭하여 추가하세요
                </span>
              </div>

              {selectedRows.length > 0 && !isLocked ? (
                <div className="flex-1 flex justify-end ml-4">
                  <EstimateBatchToolbar
                    selectedCount={selectedRows.length}
                    onClearSelection={() => setItems(items.map(item => ({ ...item, selected: false } as any)))}
                    onDelete={handleBulkDelete}
                    onClickDuplicate={() => modalsRef.current?.openDuplicateModal()}
                    onApplyDeliveryDays={(days) => {
                      const newItems = items.map(item => 
                        item.selected ? { ...item, work_days: days } : item
                      );
                      setItems(newItems as any);
                    }}
                  />
                </div>
              ) : !isLocked ? (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex items-center gap-1.5 text-brand-500 border-brand-500/30 hover:bg-brand-500/10" onClick={() => modalsRef.current?.openImportModal()}>
                    <UploadCloud size={14} />
                    엑셀/표 붙여넣기
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="flex items-center gap-1.5 text-purple-400 border-purple-500/30 hover:bg-purple-500/10 transition-colors shadow-[0_0_15px_rgba(168,85,247,0.15)] hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] bg-purple-500/5 backdrop-blur-md" 
                    onClick={() => modalsRef.current?.openOcrModal()}
                  >
                    <Wand2 size={14} />
                    도면 분할 / OCR
                  </Button>

                  <CustomColumnDropdown
                    currentColumns={estimate?.custom_columns || []}
                    companyId={companyId}
                    onToggleColumn={(col) => {
                      // Normalize any legacy objects to strings
                      const currentCols = (estimate?.custom_columns || []).map((c: any) => 
                        typeof c === 'object' ? c.name || c.id || String(c) : String(c)
                      );
                      const isExisting = currentCols.includes(col);
                      
                      setEstimate({
                        ...estimate,
                        custom_columns: isExisting
                          ? currentCols.filter((c: string) => c !== col)
                          : [...currentCols, col]
                      } as any);

                      if (isExisting) {
                        setItems(prevItems => prevItems.map(item => {
                          if (!item.custom_costs || typeof item.custom_costs !== 'object') return item;
                          const nextCosts = { ...item.custom_costs };
                          delete nextCosts[col];
                          // Also clean up any legacy object key if it exists
                          delete nextCosts['[object Object]'];
                          return {
                            ...item,
                            custom_costs: nextCosts
                          };
                        }));
                      }
                    }}
                  />

                  <Button size="sm" variant="primary" className="flex items-center gap-1.5" onClick={async () => {
                    const newItem = await handleAddItem();
                    if (newItem) {
                       setItems([...items, newItem]);
                    }
                  }}>
                    <Plus size={14} />
                    품목 추가
                  </Button>
                </div>
              ) : null}
            </div>

            <EstimateTable 
              items={items} 
              onChange={setItems} 
              onAddManualItem={async () => {
                  const newItem = await handleAddItem();
                  if (newItem) {
                      setItems([...items, newItem]);
                  }
              }}
              onRemoveSingleFile={handleRemoveSingleFile}
              onRemoveMultipleFiles={handleRemoveMultipleFiles}
              onSaveFiles={async (itemId: string, filesToSave: File[]) => {
                setItems(prev => prev.map(it => {
                  if (it.id === itemId || `temp-${it.part_no || it.part_name}` === itemId) {
                    const existingNames = new Set(filesToSave.map(f => f.name));
                    const remainingTemp = (it.tempFiles || []).filter((f: any) => !existingNames.has(f.name));
                    return {
                      ...it,
                      tempFiles: [...remainingTemp, ...filesToSave]
                    };
                  }
                  return it;
                }));
              }}
              isReadOnly={isLocked}
              companyInfo={metadata?.companyInfo}
              metadata={metadata}
              estimate={estimate}
              estimateId={id || undefined}
              currency={estimate?.currency || 'KRW'}
              exchangeRate={estimate?.base_exchange_rate || 1}
              showForeign={isForeignMode}
              onSaveSuccess={reload}
              onOpenModal={(item) => modalsRef.current?.openItemModal(item as any)}
            />
          </Card>
        </div>
      </div>

      <EstimateDetailModals
        ref={modalsRef}
        estimateId={id || null}
        estimate={estimate as any}
        items={items as any}
        clients={clients}
        companyId={companyId}
        metadata={metadata}
        isLocked={isLocked}
        showForeign={isForeignMode}
        onReload={reload}
        onAddItem={(newItem) => setItems([...items, newItem])}
        onAddItems={(newItems) => setItems([...items, ...newItems])}
        onUpdateItem={(updatedItem) => setItems(items.map((it: any) => it.id === updatedItem.id ? updatedItem : it))}
        onSaveClient={async (formData) => { if (companyId) await saveClient(companyId, formData); }}
        onMultiDuplicate={handleMultiDuplicate}
        onExportExcel={() => {}}
        onConvertOrder={handleConvertOrder}
      />
    </div>
  );
};
