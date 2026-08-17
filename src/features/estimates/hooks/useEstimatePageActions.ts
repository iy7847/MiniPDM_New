import { useState } from 'react';
import { supabase } from '../../../shared/services/supabase';
import { toast } from '../../../shared/stores/useToastStore';
import { calculateEstimate } from './useEstimateCalculations';
import { matchFilesToItems } from '../utils/fileMatching';
import type { Estimate, EstimateItem } from '../types';
import { createInitialItemForm } from '../types';

interface UseEstimatePageActionsProps {
  id: string | undefined;
  isNew: boolean;
  companyId: string | null;
  estimate: Estimate | null;
  setEstimate: (e: any) => void;
  items: EstimateItem[];
  setItems: (items: any) => void;
  metadata: any;
  saveDetail: (estimateData: any, itemsData: any[]) => Promise<any>;
  navigate: (path: string, options?: any) => void;
  modalsRef: React.RefObject<any>;
}

export function useEstimatePageActions({
  id, isNew, companyId, estimate, setEstimate, items, setItems, metadata, saveDetail, navigate, modalsRef
}: UseEstimatePageActionsProps) {
  
  const [isGeneratingProjectName, setIsGeneratingProjectName] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

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

  const handleStatusChange = async (newStatus: string) => {
    if (!id || isNew) return;
    try {
      await supabase.from('estimates').update({ status: newStatus }).eq('id', id);
      setEstimate({ ...estimate, status: newStatus as any });
      toast.success(newStatus === 'DRAFT' ? '견적서 잠금이 해제되었습니다. 이제 수정이 가능합니다.' : '상태가 변경되었습니다.');
    } catch (e) {
      toast.error('상태 변경 중 오류가 발생했습니다.');
    }
  };

  const handleSubmitEstimate = async () => {
    if (isNew) {
      toast.warning('먼저 견적서를 저장해주세요.');
      return;
    }
    
    const zeroPriceItems = items.filter(item => (item.unit_price || 0) === 0);
    if (zeroPriceItems.length > 0) {
      toast.error(`단가가 0원인 품목이 ${zeroPriceItems.length}개 있습니다. 모든 단가를 입력해야 확정할 수 있습니다.`);
      return;
    }

    if (companyId) {
      try {
        await saveDetail({ ...estimate, company_id: companyId, status: 'SENT' }, items);
        setEstimate({ ...estimate, status: 'SENT' });
        toast.success('견적서가 확정(제출)되었습니다.');
        modalsRef.current?.openSubmitModal();
      } catch (e) {
        toast.error('저장 중 오류가 발생했습니다.');
      }
    }
  };

  const handleMultiDuplicate = (quantities: number[]) => {
    if (!metadata || !metadata.companyInfo) {
      toast.error('단가 계산을 위한 설정 데이터를 불러오지 못했습니다.');
      return;
    }

    const { materials = [], postProcessings = [], heatTreatments = [], companyInfo } = metadata;
    const newClonedItems: any[] = [];
    const selectedItems = items.filter((item: any) => item.selected);
    
    selectedItems.forEach((item: any) => {
      const material = materials.find((m: any) => m.id === item.material_id);
      const heatTreatment = heatTreatments.find((h: any) => h.id === item.heat_treatment_id);
      const postProcessing = postProcessings.find((p: any) => p.id === item.post_processing_id);

      quantities.forEach(qty => {
        const calcResult = calculateEstimate({
          shape: item.shape || 'rect',
          spec_w: item.spec_w || 0,
          spec_d: item.spec_d || 0,
          spec_h: item.spec_h || 0,
          
          margin_w: item.margin_w || 0,
          margin_d: item.margin_d || 0,
          margin_h: item.margin_h || 0,
          raw_w_override: item.raw_w_override,
          raw_d_override: item.raw_d_override,
          raw_h_override: item.raw_h_override,
          
          density: material?.density || 0,
          material_price: material?.unit_price || 0,
          
          hourly_rate: item.hourly_rate || companyInfo.default_hourly_rate || 50000,
          process_time: item.process_time || 0,
          difficulty: item.difficulty || 'B',
          
          heat_treatment_price: heatTreatment?.price_per_kg || 0,
          post_process_price: postProcessing?.price_per_kg || 0,
          
          outsource_cost: item.outsource_cost || 0,
          profit_rate: item.profit_rate || companyInfo.default_profit_rate || 0,
          
          qty_input: qty,
          discount_policy: companyInfo.discount_policy_json,
          rounding_unit: companyInfo.rounding_unit !== undefined ? companyInfo.rounding_unit : 1000,
        });

        newClonedItems.push({
          ...item,
          id: undefined, // Treat as new
          qty: qty,
          calculated_price: calcResult.unit_price,
          unit_price: calcResult.unit_price,
          supply_price: calcResult.total_price,
          material_cost: calcResult.material_cost,
          post_process_cost: calcResult.post_process_cost,
          heat_treatment_cost: calcResult.heat_treatment_cost,
          processing_cost: calcResult.processing_cost,
          selected: false,
        });
      });
    });

    if (newClonedItems.length > 0) {
      setItems([...items, ...newClonedItems]);
      toast.success(`${selectedItems.length}개 품목이 각각 ${quantities.length}개의 새로운 수량으로 복제되었습니다.`);
      modalsRef.current?.closeAll();
    }
  };

  const handleSave = async () => {
    if (!companyId) return;
    try {
      // 미리 임시 ID를 실제 UUID로 확정 
      const itemsToSave = items.map(item => {
        if (!item.id || item.id === 'NEW-PART' || item.id.startsWith('temp-')) {
          return { ...item, id: crypto.randomUUID() };
        }
        return item;
      });

      const totalAmount = itemsToSave.reduce((sum, item) => sum + (item.supply_price || 0), 0);
      const savedData = await saveDetail({ ...estimate, company_id: companyId, total_amount: totalAmount }, itemsToSave);
      
      const newFilesToInsert: any[] = [];
      const currentYear = new Date().getFullYear().toString();
      const estId = estimate?.id || (savedData as any)?.id; // 타입 단언 추가
      
      if (estId) {
        const shortId = estId.substring(0, 8).toUpperCase();
        for (const item of itemsToSave) {
          const safePartName = (item.part_no || item.part_name || 'UNKNOWN').replace(/[^a-zA-Z0-9가-힣_-]/g, '');
          const targetFolderName = `${safePartName}_${item.id.split('-')[0]}`;
          const targetPath = `${currentYear}/Estimates/EST-${shortId}/${targetFolderName}`;
          
          if (item.tempFiles && item.tempFiles.length > 0) {
            for (const file of item.tempFiles) {
            if (window.fileSystem && window.fileSystem.saveFile) {
              let srcPath = (file as any).path || (file as any).file_path;
              if (!srcPath && (window as any).webUtils) {
                srcPath = (window as any).webUtils.getPathForFile(file);
              }
              
              let finalFilePath = `browser_temp/${Date.now()}_${file.name}`;
              let success = false;
              
              if (srcPath) {
                const res = await window.fileSystem.saveFile(srcPath, companyId, targetPath);
                if (res.success && res.filePath) {
                  finalFilePath = res.filePath;
                  success = true;
                }
              } else if ((window.fileSystem as any).saveFileFromBuffer && !srcPath) {
                const arrayBuffer = await file.arrayBuffer();
                const res = await (window.fileSystem as any).saveFileFromBuffer(arrayBuffer, companyId, targetPath, file.name);
                if (res.success && res.filePath) {
                  finalFilePath = res.filePath;
                  success = true;
                }
              }
              
              if (success) {
                newFilesToInsert.push({
                  estimate_item_id: item.id,
                  file_name: file.name,
                  file_path: finalFilePath,
                  file_type: file.type?.startsWith('image/') ? 'IMAGE' : (file.name.toLowerCase().endsWith('.pdf') ? 'PDF' : 'DOCUMENT'),
                  file_size: file.size || 0
                });
              }
            }
          }
        }
        }
        
        if (newFilesToInsert.length > 0) {
          const { error } = await supabase.from('files').insert(newFilesToInsert);
          if (error) throw error;
        }
      }

      toast.success('저장이 완료되었습니다.');
      if (isNew) {
        navigate('/estimates');
      } else if (newFilesToInsert.length > 0) {
        window.location.reload();
      }
    } catch (error) {
      console.error(error);
      toast.error('저장 중 오류가 발생했습니다.');
    }
  };

  const handleAddItem = async () => {
    if (isNew) {
      if (!estimate?.client_id) {
        alert('품목을 추가하기 전에 거래처를 먼저 선택해주세요.');
        return;
      }
      try {
        if (!companyId) {
           alert('회사 정보를 불러오지 못했습니다.');
           return;
        }
        const savedEstimate = await saveDetail({ ...estimate, company_id: companyId }, items);
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
      ...createInitialItemForm(metadata?.companyInfo),
      id: crypto.randomUUID(),
      part_no: 'NEW-PART',
      part_name: '새 품목',
      original_material_name: 'AL6061',
      qty: 1,
      unit_price: 0,
      supply_price: 0
    };
    // The previous implementation used `addItem` from `useEstimateDetail`.
    // I should return this item so the component can call `addItem` or I can manipulate `items` array directly.
    return newItem;
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, isLocked: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (isLocked) {
      toast.error('잠금(읽기 전용) 상태에서는 도면을 추가할 수 없습니다.');
      return;
    }
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    const excelFiles = files.filter(f => f.name.endsWith('.xlsx') || f.name.endsWith('.xls') || f.name.endsWith('.csv'));
    const otherFiles = files.filter(f => !excelFiles.includes(f));

    if (otherFiles.length > 0) {
      const { matched, unmatched } = matchFilesToItems(otherFiles, items);

      if (matched.length > 0) {
        const newItems = [...items];
        let matchCount = 0;
        
        matched.forEach(m => {
          const itemIndex = newItems.findIndex(it => {
            const itId = it.id || `temp-${it.part_no || it.part_name}`;
            return itId === m.itemId;
          });
          
          if (itemIndex !== -1) {
            const currentTempFiles = newItems[itemIndex].tempFiles || [];
            
            // 중복 파일명 체크
            const existingNames = new Set([...(newItems[itemIndex].files || []), ...currentTempFiles].map((f: any) => (f.name || f.file_name)));
            const newFiles = m.files.filter(f => !existingNames.has(f.name));

            if (newFiles.length > 0) {
              newItems[itemIndex] = {
                ...newItems[itemIndex],
                tempFiles: [...currentTempFiles, ...newFiles]
              };
              matchCount += newFiles.length;
            }
          }
        });

        if (matchCount > 0) {
          toast.success(`품목 번호/이름이 일치하는 ${matchCount}개의 도면이 첨부되었습니다.`);
          setItems(newItems);
        }
      }

      if (unmatched.length > 0) {
        toast.info(`${unmatched.length}개의 파일은 일치하는 품목이 없어 신규 등록창을 엽니다.`);
        modalsRef.current?.openParserModal(unmatched);
      }
    }
  };

  const handleRemoveSingleFile = async (itemId: string, file: any, skipConfirm?: boolean) => {
    if (!skipConfirm && !window.confirm('이 파일을 삭제하시겠습니까?')) return;
    
    const isTemp = !file.id;
    if (isTemp) {
      setItems(items.map(it => {
        if (it.id === itemId || `temp-${it.part_no || it.part_name}` === itemId) {
          return {
            ...it,
            tempFiles: (it.tempFiles || []).filter((f: any) => f.name !== file.name)
          };
        }
        return it;
      }));
      return;
    }
    
    try {
      const { error } = await supabase.from('files').delete().eq('id', file.id);
      if (error) throw error;
      setItems(items.map(it => {
        if (it.id === itemId) {
          return {
            ...it,
            files: (it.files || []).filter((f: any) => f.id !== file.id)
          };
        }
        return it;
      }));
      toast.success('파일이 삭제되었습니다.');
    } catch (err: any) {
      toast.error('파일 삭제 중 오류가 발생했습니다.');
      console.error(err);
    }
  };

  const handleRemoveMultipleFiles = async (itemId: string, filesToRemove: any[]) => {
    if (!window.confirm(`해당 타입의 첨부파일 ${filesToRemove.length}개를 모두 삭제하시겠습니까?`)) return;
    
    const dbFileIds = filesToRemove.filter(f => f.id).map(f => f.id);
    const tempFileNames = filesToRemove.filter(f => !f.id).map(f => f.name);

    if (dbFileIds.length > 0) {
      try {
        const { error } = await supabase.from('files').delete().in('id', dbFileIds);
        if (error) throw error;
      } catch (err: any) {
        toast.error('DB 파일 삭제 중 오류가 발생했습니다.');
        console.error(err);
        return;
      }
    }

    setItems(items.map(it => {
      if (it.id === itemId || `temp-${it.part_no || it.part_name}` === itemId) {
        return {
          ...it,
          files: (it.files || []).filter((f: any) => !dbFileIds.includes(f.id)),
          tempFiles: (it.tempFiles || []).filter((f: any) => !tempFileNames.includes(f.name))
        };
      }
      return it;
    }));
    
    toast.success('첨부파일이 삭제되었습니다.');
  };

  return {
    isGeneratingProjectName,
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
  };
}
