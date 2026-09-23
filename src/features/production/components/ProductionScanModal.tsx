import React, { useEffect, useState } from 'react';
import { Card, Button, Badge, BaseInput } from '../../../design-system';
import { X, CheckCircle, ArrowRight, Plus, Trash2, Truck, Undo2 } from 'lucide-react';
import { toast } from '@/shared/stores/useToastStore';
import { useProductionScan } from '../hooks/useProductionScan';
import type { ProcessLog, MasterProcess } from '../hooks/useProductionScan';
import { useConfirm } from '../../../app/providers/ConfirmProvider';

interface ProductionScanModalProps {
  barcode: string;
  onClose: () => void;
}

type ModalMode = 'IDLE' | 'START_NEW' | 'COMPLETE_EXISTING';

export const ProductionScanModal: React.FC<ProductionScanModalProps> = ({ barcode, onClose }) => {
  const { fetchScanData, startProcess, completeProcess, rollbackProcess, receiveOutsourceOrder, cancelShipping, loading, error } = useProductionScan();
  const { confirm } = useConfirm();
  
  const [data, setData] = useState<{
    item: any;
    logs: ProcessLog[];
    outsourceOrders: any[];
    masterProcesses: MasterProcess[];
    suppliers: any[];
  } | null>(null);

  const [mode, setMode] = useState<ModalMode>('IDLE');

  // 새 작업 시작 State
  const [startProcessType, setStartProcessType] = useState<'INTERNAL' | 'OUTSOURCE'>('INTERNAL');
  const [startProcessName, setStartProcessName] = useState('');
  const [startSupplierId, setStartSupplierId] = useState('');
  const [startQty, setStartQty] = useState<string>('');

  // 기존 작업 완료 State
  const [selectedJob, setSelectedJob] = useState<ProcessLog | null>(null);
  const [goodQty, setGoodQty] = useState<string>('');
  const [defectQty, setDefectQty] = useState<string>('0');
  const [defectReason, setDefectReason] = useState<string>('');
  const [nextStep, setNextStep] = useState<'IDLE' | 'INTERNAL' | 'OUTSOURCE'>('IDLE');
  const [nextProcessName, setNextProcessName] = useState('');
  const [nextSupplierId, setNextSupplierId] = useState('');

  const loadData = async () => {
    const res = await fetchScanData(barcode);
    if (res) {
      setData(res);
      setMode('IDLE');
    }
  };

  const handleCancelShipping = async () => {
    if (!data?.item) return;
    if (await confirm({
      title: '출하 상태 취소',
      description: '출하 준비 완료 상태를 취소하고 공정 진행 중으로 되돌리시겠습니까? 추가 가공이나 공정을 이어서 진행할 수 있습니다.',
      isDanger: false
    })) {
      const success = await cancelShipping(data.item.id);
      if (success) {
        toast.success('출하가 취소되고 공정 진행 중 상태로 복원되었습니다.');
        loadData();
      }
    }
  };

  useEffect(() => {
    loadData();
  }, [barcode]);

  if (!data) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
        <Card className="p-8 bg-bg-elevated border-border-strong text-center">
          {loading ? (
            <div className="text-text-primary text-xl">데이터를 불러오는 중입니다...</div>
          ) : (
            <div className="text-danger text-xl">
              {error || '바코드 정보를 찾을 수 없습니다.'}
              <Button onClick={onClose} className="mt-4 mx-auto block">닫기</Button>
            </div>
          )}
        </Card>
      </div>
    );
  }

  const { item, logs, outsourceOrders, masterProcesses, suppliers } = data;
  
  // 파생 상태 계산
  const totalQty = item.production_qty || 0;
  const activeLogs = logs.filter(l => l.status === '가공중' || l.status === '외주가공중');
  const plannedLogs = logs.filter(l => l.status === '대기').sort((a, b) => (a.sequence_no || 999) - (b.sequence_no || 999));
  const completedLogs = logs.filter(l => l.status === '완료').sort((a, b) => new Date(b.end_time || '').getTime() - new Date(a.end_time || '').getTime());
  const activeQty = activeLogs.reduce((sum, l) => sum + (l.start_qty || 0), 0);
  const availableQty = Math.max(0, totalQty - activeQty);

  const nextPlannedLog = selectedJob ? plannedLogs.find(l => (l.sequence_no || 999) > (selectedJob.sequence_no || -1)) : null;

  const handleStartSubmit = async () => {
    if (!startProcessName) {
      toast.error('진행할 공정을 선택해주세요.');
      return;
    }
    if (startProcessType === 'OUTSOURCE' && !startSupplierId) {
      toast.error('외주처를 선택해주세요.');
      return;
    }
    const qty = parseInt(startQty, 10) || 0;
    if (qty <= 0 || qty > availableQty) {
      toast.error(`시작 수량은 1에서 ${availableQty} 사이여야 합니다.`);
      return;
    }

    const sName = suppliers.find(s => s.id === startSupplierId)?.name || '';
    const isOutsource = startProcessType === 'OUTSOURCE';
    
    const success = await startProcess(
      item.id,
      startProcessName,
      qty,
      isOutsource,
      selectedJob?.id, 
      startSupplierId,
      sName
    );
    if (success) onClose();
  };

  const handleCompleteSubmit = async () => {
    if (!selectedJob) return;

    const good = parseInt(goodQty, 10) || 0;
    const defect = parseInt(defectQty, 10) || 0;
    const maxQty = selectedJob.start_qty || totalQty;

    if (good + defect <= 0) {
      toast.error('수량을 입력해주세요.');
      return;
    }
    if (good + defect > maxQty) {
      toast.error(`양품과 불량의 합계는 시작 수량(${maxQty}개)을 초과할 수 없습니다.`);
      return;
    }
    if (defect > 0 && !defectReason.trim()) {
      toast.error('불량 사유를 입력해주세요.');
      return;
    }

    if (nextStep === 'INTERNAL' && !nextProcessName && !nextPlannedLog) {
      toast.error('진행할 다음 공정을 선택해주세요.');
      return;
    }
    if (nextStep === 'OUTSOURCE' && !nextPlannedLog) {
      if (!nextProcessName) {
        toast.error('진행할 외주 공정을 선택해주세요.');
        return;
      }
      if (!nextSupplierId) {
        toast.error('외주처를 선택해주세요.');
        return;
      }
    }

    const nSupplierName = suppliers.find(s => s.id === nextSupplierId)?.name;

    const success = await completeProcess(
      selectedJob.id,
      item.id,
      good,
      defect,
      defectReason,
      nextPlannedLog ? 'IDLE' : nextStep, 
      nextPlannedLog ? undefined : nextProcessName,
      undefined, 
      nextPlannedLog ? undefined : nextSupplierId,
      nextPlannedLog ? undefined : nSupplierName
    );
    if (success) onClose();
  };

  const handleRollback = async () => {
    if (!selectedJob) return;
    if (await confirm({
      title: '작업 이력 취소',
      description: '현재 진행 중인 이 작업을 취소(삭제)하시겠습니까? 시작 전 상태로 되돌아갑니다.',
      isDanger: true
    })) {
      const success = await rollbackProcess(selectedJob.id);
      if (success) {
        toast.success('작업이 취소되었습니다.');
        onClose();
      }
    }
  };

  const handleDeleteCompletedLog = async (log: ProcessLog) => {
    if (await confirm({
      title: '완료 이력 삭제',
      description: `[${log.process_name}] 완료 이력을 삭제하시겠습니까? (삭제 후 대기 상태로 돌아가거나 완전히 삭제됩니다)`,
      isDanger: true
    })) {
      const success = await rollbackProcess(log.id);
      if (success) {
        toast.success('완료 이력이 삭제되었습니다.');
        loadData();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-bg-base border-border-strong shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex-none flex items-center justify-between px-8 py-5 border-b border-border-default bg-bg-surface">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-black text-text-primary font-mono">{item.part_no}</h2>
              <Badge variant={item.supply_type === 'OUTSOURCE' ? 'success' : 'secondary'} className="text-xs">
                {item.supply_type === 'OUTSOURCE' ? '외주 입고품 (사내)' : '사내 가공품'}
              </Badge>
              {item.production_status === 'SHIPPING_READY' && (
                <Badge variant="success" className="text-xs flex items-center gap-1 bg-success/20 text-success border-success/30 font-bold">
                  📦 출하 준비 완료
                </Badge>
              )}
            </div>
            <p className="text-text-secondary text-sm">{item.part_name} | {item.orders?.po_no}</p>
          </div>
          <button onClick={onClose} className="p-2 text-text-tertiary hover:text-text-primary transition-colors">
            <X className="w-7 h-7" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 bg-bg-base">

          {/* 요약 패널 */}
          <div className="mb-6 p-5 bg-bg-elevated border border-border-default rounded-xl flex items-center justify-between">
            <div className="text-center flex-1 border-r border-border-subtle">
              <p className="text-sm text-text-tertiary mb-1">목표 수량</p>
              <p className="text-2xl font-bold text-text-primary">{totalQty} <span className="text-sm font-normal">ea</span></p>
            </div>
            <div className="text-center flex-1 border-r border-border-subtle">
              <p className="text-sm text-text-tertiary mb-1">진행 중</p>
              <p className="text-2xl font-bold text-warning">{activeQty} <span className="text-sm font-normal">ea</span></p>
            </div>
            <div className="text-center flex-1">
              <p className="text-sm text-text-tertiary mb-1">잔여 대기 (시작 가능)</p>
              <p className="text-2xl font-bold text-success">{availableQty} <span className="text-sm font-normal">ea</span></p>
            </div>
          </div>

          {/* 메인 뷰 라우팅 */}
          {mode === 'IDLE' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-text-primary">진행 중인 작업 (종료하려면 클릭)</h3>
                <Button 
                  variant="primary" 
                  size="sm" 
                  disabled={availableQty <= 0}
                  onClick={() => {
                    setSelectedJob(null);
                    setStartQty(availableQty.toString());
                    setMode('START_NEW');
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" /> 새 작업 시작
                </Button>
              </div>
              
              {activeLogs.length === 0 ? (
                <div className="py-12 text-center text-text-tertiary border border-dashed border-border-strong rounded-xl">
                  현재 진행 중인 공정이 없습니다.
                </div>
              ) : (
                <div className="space-y-3">
                  {activeLogs.map(log => (
                    <div 
                      key={log.id} 
                      className="p-4 bg-bg-surface border border-border-default rounded-lg hover:border-brand-500 cursor-pointer transition-colors flex justify-between items-center"
                      onClick={() => {
                        setSelectedJob(log);
                        setGoodQty((log.start_qty || totalQty).toString());
                        setDefectQty('0');
                        setNextStep('IDLE');
                        setNextProcessName('');
                        setNextSupplierId('');
                        setMode('COMPLETE_EXISTING');
                      }}
                    >
                      <div>
                        <Badge variant={log.status === '외주가공중' ? 'warning' : 'primary'} className="mb-2">
                          {log.status}
                        </Badge>
                        <p className="text-lg font-bold text-text-primary">
                          {log.process_name}
                          {(() => {
                            const mp = masterProcesses.find(m => m.name === log.process_name || (log.process_id && m.id === log.process_id));
                            return mp?.description ? <span className="ml-2 text-sm font-normal text-text-secondary">({mp.description})</span> : null;
                          })()}
                        </p>
                        <p className="text-sm text-text-secondary mt-1">작업자: {log.worker || '미지정'} | 작업 중인 수량: <strong className="text-text-primary">{log.start_qty || totalQty}개</strong></p>
                      </div>
                      <ArrowRight className="text-text-tertiary" />
                    </div>
                  ))}
                </div>
              )}

              {plannedLogs.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-sm font-bold text-text-secondary mb-3">설계된 공정 (시작하려면 클릭)</h3>
                  <div className="space-y-3">
                    {plannedLogs.map(log => {
                      const masterProc = masterProcesses.find(
                        mp => mp.name === log.process_name || (log.process_id && mp.id === log.process_id)
                      );
                      const isOutsource = masterProc ? masterProc.is_outsource : (log.process_type === 'OUTSOURCE');

                      return (
                        <div 
                          key={log.id} 
                          className={`p-4 rounded-lg cursor-pointer transition-colors flex justify-between items-center border border-dashed ${
                            isOutsource 
                              ? 'bg-orange-500/5 border-orange-500/30 hover:border-orange-500 hover:bg-orange-500/10' 
                              : 'bg-bg-surface border-border-default hover:border-brand-500 hover:bg-brand-500/10'
                          }`}
                          onClick={() => {
                            setSelectedJob(log);
                            setStartQty(availableQty.toString());
                            setStartProcessType(isOutsource ? 'OUTSOURCE' : 'INTERNAL');
                            setStartProcessName(log.process_name);
                            setStartSupplierId('');
                            setMode('START_NEW');
                          }}
                        >
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="neutral">대기 중</Badge>
                              {isOutsource ? (
                                <span className="text-xs px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30 font-semibold">외주</span>
                              ) : (
                                <span className="text-xs px-2 py-0.5 rounded bg-brand-500/20 text-brand-400 border border-brand-500/30">사내</span>
                              )}
                            </div>
                            <p className={`text-lg font-bold ${isOutsource ? 'text-orange-300' : 'text-text-primary text-opacity-80'}`}>
                              {log.process_name}
                              {(() => {
                                const mp = masterProcesses.find(m => m.name === log.process_name || (log.process_id && m.id === log.process_id));
                                return mp?.description ? <span className={`ml-2 text-sm font-normal ${isOutsource ? 'text-orange-300/70' : 'text-text-secondary'}`}>({mp.description})</span> : null;
                              })()}
                            </p>
                          </div>
                          <Plus className={isOutsource ? 'text-orange-400' : 'text-brand-500'} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {(completedLogs.length > 0 || item.production_status === 'SHIPPING_READY') && (
                <div className="mt-8 border-t border-border-default pt-6">
                  <h3 className="text-sm font-bold text-text-secondary mb-4">완료된 작업 이력</h3>
                  <div className="space-y-3">
                    {/* 출하 준비 완료 상태인 경우 취소 카드 표시 */}
                    {item.production_status === 'SHIPPING_READY' && (
                      <div className="p-3.5 bg-success/10 border border-success/30 rounded-xl flex justify-between items-center shadow-sm animate-in fade-in">
                        <div>
                          <p className="font-bold text-success text-sm flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-success" />
                            📦 출하 준비 완료 (모든 공정 완료)
                          </p>
                          <p className="text-xs text-text-secondary mt-0.5">
                            모든 가공이 완료되어 출하 준비 상태입니다. 추가 공정이나 수정이 필요하면 취소할 수 있습니다.
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCancelShipping}
                          disabled={loading}
                          className="text-xs border-border-default hover:border-danger hover:text-danger hover:bg-danger/10 flex items-center gap-1.5 py-1.5 px-3 bg-bg-surface text-text-primary whitespace-nowrap ml-3"
                        >
                          <Undo2 size={13} />
                          출하 취소 (가공 재개)
                        </Button>
                      </div>
                    )}

                    {completedLogs.map(log => (
                      <div key={log.id} className="p-3.5 bg-bg-base border border-border-default rounded-xl flex justify-between items-center">
                        <div>
                          <p className="font-bold text-text-primary text-sm flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-success" />
                            {log.process_name}
                            {(() => {
                              const mp = masterProcesses.find(m => m.name === log.process_name || (log.process_id && m.id === log.process_id));
                              return mp?.description ? <span className="font-normal text-text-secondary text-xs">({mp.description})</span> : null;
                            })()}
                          </p>
                          <p className="text-xs text-text-tertiary mt-1">
                            {log.worker || '작업자 미지정'} | 양품: <strong className="text-success">{log.good_qty}</strong> 불량: <strong className="text-danger">{log.defect_qty}</strong> | 종료: {log.end_time ? new Date(log.end_time).toLocaleString() : '-'}
                          </p>
                        </div>
                        <Button 
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteCompletedLog(log)}
                          className="text-xs text-danger border-border-default hover:border-danger hover:bg-danger/10 hover:text-danger flex items-center gap-1 py-1 px-2.5 ml-2"
                          title="이 작업 이력을 삭제하고 이전 상태로 되돌립니다"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>이력 삭제</span>
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 작업 시작 폼 */}
          {mode === 'START_NEW' && (
            <div className="space-y-6 animate-in slide-in-from-right-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-brand-400">
                  {selectedJob ? `[${selectedJob.process_name}] 공정 시작` : '새 작업 시작'}
                </h3>
                {selectedJob && (
                  <Badge variant={startProcessType === 'OUTSOURCE' ? 'warning' : 'primary'}>
                    {startProcessType === 'OUTSOURCE' ? '외주 가공' : '사내 가공'}
                  </Badge>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">시작할 수량 (잔여: {availableQty})</label>
                <BaseInput 
                  type="number" 
                  className="text-xl font-mono py-3" 
                  value={startQty} 
                  onChange={(e) => setStartQty(e.target.value)} 
                  autoFocus
                />
              </div>

              {selectedJob ? (
                /* 이미 설계된 공정인 경우: 공정 안내 카드 */
                <div className="p-4 bg-bg-surface border border-border-default rounded-lg">
                  <p className="text-xs text-text-tertiary mb-1">설계된 공정명</p>
                  <p className="text-xl font-bold text-text-primary">
                    {startProcessName}
                    {(() => {
                      const mp = masterProcesses.find(m => m.name === startProcessName || (selectedJob?.process_id && m.id === selectedJob.process_id));
                      return mp?.description ? <span className="ml-2 text-base font-normal text-text-secondary">({mp.description})</span> : null;
                    })()}
                  </p>
                </div>
              ) : (
                /* 신규 임의 공정인 경우: 사내/외주 선택 및 공정 드롭다운 */
                <>
                  <div className="flex gap-3 mt-4">
                    <label className={`flex-1 flex flex-col items-center justify-center py-4 rounded-lg border cursor-pointer transition-all ${startProcessType === 'INTERNAL' ? 'bg-brand-500/20 border-brand-500 text-brand-400' : 'bg-bg-base border-border-default text-text-secondary'}`}>
                      <input type="radio" className="hidden" checked={startProcessType === 'INTERNAL'} onChange={() => { setStartProcessType('INTERNAL'); setStartProcessName(''); setStartSupplierId(''); }} />
                      <span className="font-bold">사내 가공</span>
                    </label>
                    <label className={`flex-1 flex flex-col items-center justify-center py-4 rounded-lg border cursor-pointer transition-all ${startProcessType === 'OUTSOURCE' ? 'bg-orange-500/20 border-orange-500 text-orange-400' : 'bg-bg-base border-border-default text-text-secondary'}`}>
                      <input type="radio" className="hidden" checked={startProcessType === 'OUTSOURCE'} onChange={() => { setStartProcessType('OUTSOURCE'); setStartProcessName(''); setStartSupplierId(''); }} />
                      <span className="font-bold">외주 가공</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">공정 선택</label>
                    <select 
                      className="w-full bg-bg-base border border-border-strong rounded-md px-4 py-3 text-white focus:border-brand-500"
                      value={startProcessName}
                      onChange={(e) => setStartProcessName(e.target.value)}
                    >
                      <option value="">진행할 공정을 선택하세요</option>
                      {masterProcesses
                        .filter(mp => startProcessType === 'OUTSOURCE' ? mp.is_outsource : !mp.is_outsource)
                        .map(mp => (
                          <option key={mp.id} value={mp.name}>
                            {mp.name}{mp.description ? ` (${mp.description})` : ''}
                          </option>
                        ))}
                    </select>
                  </div>
                </>
              )}

              {startProcessType === 'OUTSOURCE' && (
                <div>
                  <label className="block text-sm font-medium text-orange-400 mb-2">외주처 선택 (필수)</label>
                  <select 
                    className="w-full bg-bg-base border border-orange-500/30 rounded-md px-4 py-3 text-white focus:border-orange-500"
                    value={startSupplierId}
                    onChange={(e) => setStartSupplierId(e.target.value)}
                  >
                    <option value="">외주처를 선택하세요</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* 작업 완료 폼 */}
          {mode === 'COMPLETE_EXISTING' && selectedJob && (
            <div className="space-y-6 animate-in slide-in-from-right-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-success flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  {selectedJob.process_name} 완료 기록
                </h3>
                <Badge variant="neutral">시작했던 수량: {selectedJob.start_qty || totalQty}개</Badge>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">양품 수량</label>
                  <BaseInput 
                    type="number" 
                    className="text-xl font-mono py-3" 
                    value={goodQty} 
                    onChange={(e) => setGoodQty(e.target.value)} 
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">불량 수량</label>
                  <BaseInput 
                    type="number" 
                    className="text-xl font-mono py-3 text-danger" 
                    value={defectQty} 
                    onChange={(e) => setDefectQty(e.target.value)} 
                  />
                </div>
              </div>

              {parseInt(defectQty, 10) > 0 && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-text-secondary mb-2">불량 사유 (필수)</label>
                  <BaseInput 
                    placeholder="어떤 불량이 발생했나요?" 
                    value={defectReason}
                    onChange={(e) => setDefectReason(e.target.value)}
                  />
                </div>
              )}

              <div className="mt-6 border-t border-border-default pt-6">
                <h4 className="text-sm font-bold text-text-primary mb-4">다음 공정 안내</h4>
                
                {nextPlannedLog ? (
                  <div className="p-4 bg-brand-500/10 border border-brand-500/30 rounded-lg flex items-center justify-between">
                    <div>
                      <p className="text-sm text-text-secondary mb-1">설계된 다음 대기 공정</p>
                      <p className="text-lg font-bold text-brand-400">
                        {nextPlannedLog.process_name}
                        {(() => {
                          const mp = masterProcesses.find(m => m.name === nextPlannedLog.process_name || (nextPlannedLog.process_id && m.id === nextPlannedLog.process_id));
                          return mp?.description ? <span className="ml-2 text-sm font-normal text-text-secondary">({mp.description})</span> : null;
                        })()}
                      </p>
                    </div>
                    <ArrowRight className="text-brand-500" />
                  </div>
                ) : (
                  <>
                    <h4 className="text-sm font-bold text-text-primary mb-4 hidden">다음 공정 지정 (양품 수량에 대해)</h4>
                    <div className="flex gap-3 mb-4">
                      <label className={`flex-1 flex flex-col items-center justify-center py-3 rounded-lg border cursor-pointer transition-all ${nextStep === 'IDLE' ? 'bg-success/15 border-success text-success font-bold shadow-sm' : 'bg-bg-base border-border-default text-text-secondary'}`}>
                        <input type="radio" className="hidden" checked={nextStep === 'IDLE'} onChange={() => { setNextStep('IDLE'); setNextProcessName(''); setNextSupplierId(''); }} />
                        <span className="font-bold flex items-center gap-1.5">📦 출하 (공정 완료)</span>
                      </label>
                      <label className={`flex-1 flex flex-col items-center justify-center py-3 rounded-lg border cursor-pointer transition-all ${nextStep === 'INTERNAL' ? 'bg-brand-500/20 border-brand-500 text-brand-400' : 'bg-bg-base border-border-default text-text-secondary'}`}>
                        <input type="radio" className="hidden" checked={nextStep === 'INTERNAL'} onChange={() => { setNextStep('INTERNAL'); setNextProcessName(''); setNextSupplierId(''); }} />
                        <span className="font-bold">사내 가공 추가</span>
                      </label>
                      <label className={`flex-1 flex flex-col items-center justify-center py-3 rounded-lg border cursor-pointer transition-all ${nextStep === 'OUTSOURCE' ? 'bg-orange-500/20 border-orange-500 text-orange-400' : 'bg-bg-base border-border-default text-text-secondary'}`}>
                        <input type="radio" className="hidden" checked={nextStep === 'OUTSOURCE'} onChange={() => { setNextStep('OUTSOURCE'); setNextProcessName(''); setNextSupplierId(''); }} />
                        <span className="font-bold">외주 가공 추가</span>
                      </label>
                    </div>

                    {nextStep !== 'IDLE' && (
                      <div className="space-y-4 animate-in slide-in-from-top-2">
                        <div>
                          <label className="block text-sm font-medium text-text-secondary mb-2">공정 선택</label>
                          <select 
                            className="w-full bg-bg-base border border-border-strong rounded-md px-4 py-3 text-white focus:border-brand-500"
                            value={nextProcessName}
                            onChange={(e) => setNextProcessName(e.target.value)}
                          >
                            <option value="">진행할 공정을 선택하세요</option>
                            {masterProcesses
                              .filter(mp => nextStep === 'OUTSOURCE' ? mp.is_outsource : !mp.is_outsource)
                              .map(mp => (
                                <option key={mp.id} value={mp.name}>
                                  {mp.name}{mp.description ? ` (${mp.description})` : ''}
                                </option>
                              ))}
                          </select>
                        </div>

                        {nextStep === 'OUTSOURCE' && (
                          <div>
                            <label className="block text-sm font-medium text-orange-400 mb-2">외주처 선택</label>
                            <select 
                              className="w-full bg-bg-base border border-orange-500/30 rounded-md px-4 py-3 text-white focus:border-orange-500"
                              value={nextSupplierId}
                              onChange={(e) => setNextSupplierId(e.target.value)}
                            >
                              <option value="">외주처를 선택하세요</option>
                              {suppliers.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex-none p-5 border-t border-border-default bg-bg-surface flex justify-end gap-3">
          {mode !== 'IDLE' ? (
            <>
              {mode === 'COMPLETE_EXISTING' && (
                <Button 
                  variant="outline" 
                  className="mr-auto text-danger border-danger hover:bg-danger/10 hover:border-danger" 
                  onClick={handleRollback} 
                  disabled={loading}
                >
                  작업 취소(이력 삭제)
                </Button>
              )}
              <Button variant="outline" onClick={() => setMode('IDLE')} size="lg" className="w-32">이전</Button>
              <Button 
                variant="primary" 
                onClick={mode === 'START_NEW' ? handleStartSubmit : handleCompleteSubmit} 
                disabled={loading}
                size="lg"
                className="w-48 text-lg font-bold"
              >
                {loading ? '저장 중...' : (mode === 'START_NEW' ? (startProcessType === 'OUTSOURCE' ? '외주 반출(발주)' : '작업 시작') : '작업 완료')}
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={onClose} size="lg" className="w-32">닫기</Button>
          )}
        </div>
      </Card>
    </div>
  );
};
