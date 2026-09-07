import React, { useState, useEffect } from 'react';
import { X, FileText, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/design-system/Button';
import { BaseInput } from '@/design-system/BaseInput';
import { NumberInput } from '@/design-system/NumberInput';
import { BaseSelect } from '@/design-system/BaseSelect';
import { MaterialShapeInputs, SHAPE_OPTIONS, DEFAULT_SHAPES, calculateMaterialVolume } from './MaterialShapeInputs';
import type { ShapeCategory, MaterialDimensions } from './MaterialShapeInputs';
import { supabase } from '@/shared/services/supabase';

export interface MaterialOrderGroup {
  id: string;
  items: any[];
  formData: {
    material_id?: string | null;
    material_name: string;
    spec: string;
    quantity: number;
    weight: number;
    unit_price: number;
    estimated_price: number;
    shape: string;
    shapeCategory: ShapeCategory;
    dims: MaterialDimensions;
  };
}

interface MaterialCalculatorModalProps {
  isOpen: boolean;
  group: MaterialOrderGroup;
  onSave: (groupId: string, newFormData: MaterialOrderGroup['formData']) => void;
  onClose: () => void;
}

export function MaterialCalculatorModal({ isOpen, group, onSave, onClose }: MaterialCalculatorModalProps) {
  const [formData, setFormData] = useState(group.formData);
  const [density, setDensity] = useState<number>(0);
  const [materialUnitPrice, setMaterialUnitPrice] = useState<number>(0);
  const [materialsList, setMaterialsList] = useState<{code?: string, name: string, density: number, unit_price: number}[]>([]);
  
  // PDF Viewer states
  const [files, setFiles] = useState<any[]>([]);
  const [activeFileIndex, setActiveFileIndex] = useState<number>(0);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);

  // Initialize files from items
  useEffect(() => {
    if (!isOpen) return;
    setFormData(group.formData);
    
    // Combine all files from subItems
    const subItems = group.items.filter(item => Array.isArray(item.files));
    let allFiles = subItems.reduce((acc: any[], item: any) => {
      return [...acc, ...item.files];
    }, []);
    
    // Filter to only include PDFs as requested by user
    allFiles = allFiles.filter(f => {
      const ext = (f.file_name || f.name || '').split('.').pop()?.toLowerCase();
      return ext === 'pdf';
    });
    
    setFiles(allFiles);
    setActiveFileIndex(0);

    // Fetch materials list
    const fetchMaterials = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single();
      if (!profile?.company_id) return;

      const { data } = await supabase
        .from('materials')
        .select('id, code, name, density, unit_price, category')
        .eq('company_id', profile.company_id)
        .order('name');
      if (data) {
        // Deduplicate by name or code to prevent React key warnings
        const uniqueMaterials = data.filter((v, i, a) => a.findIndex(t => t.name === v.name) === i);
        setMaterialsList(uniqueMaterials);
        
        // Try to auto-match the material name from the item to the list
        let match = null;
        if (group.formData.material_id) {
          match = uniqueMaterials.find(m => m.id === group.formData.material_id);
        }
        
        if (!match && group.formData.material_name) {
          const searchName = group.formData.material_name.toLowerCase();
          // Find the best match (longest code/name that is included)
          let bestMatch = null;
          let longestMatchLength = 0;
          
          uniqueMaterials.forEach(m => {
            const codeStr = (m.code || '').toLowerCase();
            const nameStr = (m.name || '').toLowerCase();
            
            if (codeStr && searchName.includes(codeStr) && codeStr.length > longestMatchLength) {
              bestMatch = m;
              longestMatchLength = codeStr.length;
            }
            if (nameStr && searchName.includes(nameStr) && nameStr.length > longestMatchLength) {
              bestMatch = m;
              longestMatchLength = nameStr.length;
            }
          });
          match = bestMatch;
        }

        if (match) {
            setFormData(prev => {
              const updates: any = { 
                material_id: match.id,
                material_name: match.code || match.name 
              };
              return { ...prev, ...updates };
            });
          }
        }
      };
      fetchMaterials();
  }, [isOpen, group]);

  // Load selected file
  useEffect(() => {
    const loadFile = async () => {
      if (files.length === 0) return;
      const file = files[activeFileIndex];
      if (!file) return;

      setLoadingFile(true);
      setFileUrl(null);

      try {
        let filePath = file.file_path || file.path;
        if (!filePath) throw new Error('파일 경로가 없습니다.');
        
        if (!filePath.match(/^[a-zA-Z]:[\\/]/) && !filePath.startsWith('/')) {
          const companyRootPath = localStorage.getItem('company_root_path') || 'D:\\99_ETC\\임시데이터';
          filePath = `${companyRootPath}\\${filePath}`;
        }

        const ext = (file.file_name || file.name || '').split('.').pop()?.toLowerCase();
        
        // If it's an IPC environment (Electron)
        if ((window as any).ipcRenderer) {
          const res = await (window as any).ipcRenderer.invoke('read-local-file', filePath);
          if (res.success) {
            let mimeType = 'application/octet-stream';
            if (ext === 'pdf') mimeType = 'application/pdf';
            else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) mimeType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
            
            const fileObj = new File([res.data], file.file_name || 'file', { type: mimeType });
            const blobUrl = URL.createObjectURL(fileObj);
            setFileUrl(ext === 'pdf' ? `${blobUrl}#toolbar=0&navpanes=0` : blobUrl);
          } else {
            console.error('File load error:', res.error);
          }
        } else {
          // Web environment (fallback)
          const { data } = supabase.storage.from('estimates').getPublicUrl(filePath);
          if (data?.publicUrl) {
            setFileUrl(ext === 'pdf' ? `${data.publicUrl}#toolbar=0&navpanes=0` : data.publicUrl);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingFile(false);
      }
    };

    loadFile();
  }, [activeFileIndex, files]);

  // Fetch material properties when material_id or material_name changes
  useEffect(() => {
    if (!formData.material_name && !formData.material_id) return;
    
    // Check if we already have it in the list
    let mat = null;
    if (formData.material_id) {
      mat = materialsList.find(m => m.id === formData.material_id);
    }
    if (!mat && formData.material_name) {
      mat = materialsList.find(m => (m.code || m.name) === formData.material_name || m.name === formData.material_name);
    }

    if (mat) {
      setDensity(Number(mat.density) || 0);
      setMaterialUnitPrice(Number(mat.unit_price) || 0);
      return;
    }

    // Fallback: fetch from DB if not in the list (e.g., list not loaded yet)
    const timer = setTimeout(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single();
      if (!profile?.company_id) return;

      let query = supabase.from('materials').select('density, unit_price').eq('company_id', profile.company_id);
      
      if (formData.material_id) {
        query = query.eq('id', formData.material_id);
      } else {
        query = query.or(`code.eq."${formData.material_name}",name.eq."${formData.material_name}"`);
      }

      const { data } = await query.limit(1).maybeSingle();
        
      if (data) {
        setDensity(Number(data.density) || 0);
        setMaterialUnitPrice(Number(data.unit_price) || 0);
      } else {
        setDensity(0);
        setMaterialUnitPrice(0);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [formData.material_name, formData.material_id, materialsList]);

  // Auto calculate
  useEffect(() => {
    const vol = calculateMaterialVolume(formData.shape, formData.dims);
    const calculatedWeight = vol * density / 1000000;
    const totalEstPrice = Math.round(calculatedWeight * materialUnitPrice * formData.quantity);
    
    let newSpec = formData.spec;
    if (Object.keys(formData.dims).length > 0) {
      if (formData.shapeCategory === '판재/각재류') {
        newSpec = `${formData.dims.t || 0}t x ${formData.dims.w || 0} x ${formData.dims.d || 0}`;
      } else if (formData.shapeCategory === '봉재류') {
        const isHex = formData.shape === '육각봉';
        newSpec = `${isHex ? 'HEX' : 'Ø'}${formData.dims.w || 0} x ${formData.dims.l || 0}L`;
      } else if (formData.shape === '원형 파이프') {
        newSpec = `Ø${formData.dims.w || 0} x ${formData.dims.t || 0}t x ${formData.dims.l || 0}L`;
      } else if (formData.shape === '사각 파이프' || formData.shapeCategory === '형강류') {
        newSpec = `${formData.dims.w || 0} x ${formData.dims.h || 0} x ${formData.dims.t || 0}t x ${formData.dims.l || 0}L`;
      }
    }

    const unitPrice = Math.round(calculatedWeight * materialUnitPrice);

    setFormData(prev => ({
      ...prev,
      weight: Number(calculatedWeight.toFixed(2)),
      estimated_price: totalEstPrice,
      ...(Object.keys(formData.dims).length > 0 ? { spec: newSpec } : {})
    }));
  }, [formData.shape, formData.dims, density, materialUnitPrice, formData.quantity, formData.shapeCategory]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-bg-surface border border-border-default rounded-xl shadow-2xl w-full h-full max-w-[1600px] flex overflow-hidden">
        
        {/* Left Panel: Calculator */}
        <div className="w-[450px] shrink-0 border-r border-border-default flex flex-col bg-bg-surface">
          <div className="flex items-center justify-between p-4 border-b border-border-default">
            <div>
              <h3 className="text-xl font-bold text-text-primary">소재 계산기</h3>
              <p className="text-xs text-text-secondary mt-1">도면을 확인하며 소재 치수를 입력하세요.</p>
            </div>
            <button onClick={onClose} className="text-text-secondary hover:text-text-primary p-2">
              <X size={24} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-text-secondary">소재명 (재질)</label>
                <div className="flex gap-2">
                  <BaseSelect 
                    value={formData.material_id || formData.material_name}
                    onChange={(e) => {
                      if (e.target.value) {
                        const selectedMat = materialsList.find(m => m.id === e.target.value || (m.code || m.name) === e.target.value);
                        if (selectedMat) {
                          setFormData({ 
                            ...formData, 
                            material_id: selectedMat.id,
                            material_name: selectedMat.code || selectedMat.name 
                          });
                        } else {
                          setFormData({ ...formData, material_name: e.target.value, material_id: null });
                        }
                      }
                    }}
                    className="flex-1"
                    options={[
                      ...materialsList.map(m => ({ 
                        value: m.id, 
                        label: m.code ? `${m.code} (${m.name})` : m.name 
                      }))
                    ]}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-text-secondary">소재 분류</label>
                  <BaseSelect
                    value={formData.shapeCategory}
                    onChange={(e) => {
                      const newCategory = e.target.value as ShapeCategory;
                      const newShape = DEFAULT_SHAPES[newCategory];
                      let newDims = { ...formData.dims };
                      
                      // Smart remap
                      if (formData.shapeCategory === '판재/각재류' && newCategory === '봉재류') {
                        if (newDims.d !== undefined && newDims.l === undefined) {
                          newDims.l = newDims.d;
                        }
                      } else if (formData.shapeCategory === '봉재류' && newCategory === '판재/각재류') {
                        if (newDims.l !== undefined && newDims.d === undefined) {
                          newDims.d = newDims.l;
                        }
                      }
                      
                      setFormData({ 
                        ...formData, 
                        shapeCategory: newCategory,
                        shape: newShape,
                        dims: newDims
                      });
                    }}
                    options={Object.keys(SHAPE_OPTIONS).map(cat => ({ value: cat, label: cat }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-text-secondary">상세 형태</label>
                  <BaseSelect
                    value={formData.shape}
                    onChange={(e) => setFormData({ ...formData, shape: e.target.value })}
                    options={SHAPE_OPTIONS[formData.shapeCategory].map(opt => ({ value: opt, label: opt }))}
                  />
                </div>
              </div>

              <MaterialShapeInputs 
                category={formData.shapeCategory}
                shape={formData.shape}
                dims={formData.dims}
                onChange={(newDims) => setFormData({ ...formData, dims: newDims })}
              />

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-text-secondary">발주 규격 (자동생성)</label>
                <BaseInput
                  value={formData.spec}
                  readOnly
                  className="bg-bg-elevated cursor-not-allowed text-text-secondary"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-text-secondary">수량</label>
                  <NumberInput
                    value={formData.quantity}
                    onChange={(val) => setFormData({ ...formData, quantity: val || 1 })}
                    min={1}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-text-secondary">예상 중량 (kg)</label>
                  <NumberInput
                    value={formData.weight}
                    readOnly
                    className="bg-bg-elevated cursor-not-allowed"
                    inputClassName="text-text-secondary"
                  />
                </div>
              </div>

              <div className="p-4 bg-bg-elevated border border-border-default rounded-lg">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-bold text-brand-400">시스템 예상 금액</span>
                  <span className="text-lg font-black text-brand-500">
                    ₩{formData.estimated_price.toLocaleString()}
                  </span>
                </div>
                <p className="text-[11px] text-text-secondary text-right">
                  (비중: {density}, kg당: ₩{(materialUnitPrice || 0).toLocaleString()})
                </p>
              </div>
            </div>
          </div>
          
          <div className="p-4 border-t border-border-default">
            <Button 
              variant="primary" 
              className="w-full font-bold h-12 text-lg shadow-glow" 
              onClick={() => onSave(group.id, formData)}
            >
              저장 후 닫기
            </Button>
          </div>
        </div>

        {/* Right Panel: Document Viewer */}
        <div className="flex-1 bg-bg-elevated flex flex-col relative">
          <div className="h-14 border-b border-border-default bg-bg-surface flex items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-text-secondary" />
              <span className="font-bold text-text-primary">참조 도면 뷰어</span>
              <span className="text-xs text-text-secondary px-2 py-1 bg-bg-elevated rounded-md border border-border-default">
                {files.length}개의 파일
              </span>
            </div>
            
            {files.length > 1 && (
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setActiveFileIndex(prev => Math.max(0, prev - 1))}
                  disabled={activeFileIndex === 0}
                  className="p-1.5 bg-bg-elevated border border-border-default rounded-md hover:bg-bg-surface disabled:opacity-50"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm font-medium w-12 text-center">
                  {activeFileIndex + 1} / {files.length}
                </span>
                <button 
                  onClick={() => setActiveFileIndex(prev => Math.min(files.length - 1, prev + 1))}
                  disabled={activeFileIndex === files.length - 1}
                  className="p-1.5 bg-bg-elevated border border-border-default rounded-md hover:bg-bg-surface disabled:opacity-50"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
          
          <div className="flex-1 overflow-hidden relative flex items-center justify-center bg-[#1e1e1e]">
            {loadingFile ? (
              <div className="flex flex-col items-center text-text-secondary">
                <Loader2 size={32} className="animate-spin mb-4 text-brand-500" />
                <p>파일을 불러오는 중...</p>
              </div>
            ) : fileUrl ? (
              files[activeFileIndex]?.file_name?.toLowerCase().endsWith('.pdf') || files[activeFileIndex]?.original_name?.toLowerCase().endsWith('.pdf') || files[activeFileIndex]?.name?.toLowerCase().endsWith('.pdf') ? (
                <iframe src={fileUrl} className="w-full h-full border-none" />
              ) : (
                <img src={fileUrl} alt="도면" className="max-w-full max-h-full object-contain" />
              )
            ) : (
              <div className="text-text-secondary flex flex-col items-center opacity-50">
                <FileText size={48} className="mb-4" />
                <p>확인할 수 있는 첨부 파일이 없습니다.</p>
              </div>
            )}
          </div>
          
          {fileUrl && files[activeFileIndex] && (
            <div className="absolute bottom-4 right-4 bg-black/70 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-full border border-white/10 shadow-lg truncate max-w-[300px]">
              {files[activeFileIndex].original_name || files[activeFileIndex].file_name || files[activeFileIndex].name}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
