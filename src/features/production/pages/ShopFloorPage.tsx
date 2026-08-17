import React, { useState } from 'react';
import { Card, Button, BaseInput, BaseSelect, NumberInput, Badge } from '../../../design-system';
import { KioskLayout } from '../../../design-system/KioskLayout';
import { KioskLargeButton } from '../../../design-system/KioskLargeButton';
import { ImageUploader } from '../../../design-system/ImageUploader';
import { useBarcodeScanner } from '../../../hooks/useBarcodeScanner';
import { useShopFloor } from '../hooks/useShopFloor';
import { ScanLine, Play, CheckCircle, ArrowRightLeft, AlertCircle, RefreshCw } from 'lucide-react';

export const ShopFloorPage = () => {
  const [barcodeInput, setBarcodeInput] = useState('');
  
  // 공정 상태 관리
  const [selectedProcess, setSelectedProcess] = useState('선반');
  const [completeQty, setCompleteQty] = useState(0);
  
  // 불량 관리
  const [isDefectMode, setIsDefectMode] = useState(false);
  const [defectQty, setDefectQty] = useState(0);
  const [defectReason, setDefectReason] = useState('');
  const [defectImage, setDefectImage] = useState<File | null>(null);

  const {
    loading,
    scannedPart,
    isWorking,
    fetchPartByBarcode,
    startProcess,
    completeProcess,
    clearScan
  } = useShopFloor();

  // 글로벌 바코드 스캐너 훅 연동
  useBarcodeScanner({
    onScan: (barcode) => {
      setBarcodeInput(barcode);
      handleSearch(barcode);
    },
    debounceTime: 50
  });

  const handleSearch = async (code: string) => {
    if (!code) return;
    const res = await fetchPartByBarcode(code);
    if (res.success && scannedPart) {
      setCompleteQty(scannedPart.qty);
      setDefectQty(0);
      setIsDefectMode(false);
    }
  };

  const handleManualSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch(barcodeInput);
    }
  };

  const handleStartWork = async () => {
    await startProcess(selectedProcess);
    if (scannedPart) {
      setCompleteQty(scannedPart.qty);
      setDefectQty(0);
    }
  };

  const handleCompleteWork = async () => {
    // 검증
    if (completeQty + defectQty > (scannedPart?.qty || 0)) {
      alert('완료 수량과 불량 수량의 합이 총 수량을 초과할 수 없습니다.');
      return;
    }
    
    const res = await completeProcess(completeQty, defectQty, defectReason);
    if (res?.success) {
      if (defectQty > 0 && res.rpcData) {
        alert(`공정 처리 완료.\n불량 수량(${defectQty}개)에 대해 새 파생 오더(${res.rpcData.new_item_no})가 생성되었습니다.\n바코드를 재출력하여 도면에 부착해주세요.`);
      } else {
        alert('공정 처리가 완료되었습니다.');
      }
      setBarcodeInput('');
      setIsDefectMode(false);
      setDefectQty(0);
      setDefectReason('');
      setDefectImage(null);
    } else {
      alert('공정 처리에 실패했습니다: ' + res?.error);
    }
  };

  const header = (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <ScanLine className="text-brand-500" size={32} />
          현장 키오스크
        </h1>
        <p className="text-text-secondary mt-2 text-lg">도면의 바코드를 스캔하여 실적을 등록하세요.</p>
      </div>
      <div className="w-1/3">
        <BaseInput 
          className="text-xl h-14"
          leftIcon={<ScanLine size={24} className="text-brand-500" />}
          placeholder="바코드 수동 입력 후 Enter..."
          value={barcodeInput}
          onChange={(e) => setBarcodeInput(e.target.value)}
          onKeyDown={handleManualSearch}
          disabled={loading || isWorking}
          autoFocus
        />
      </div>
    </div>
  );

  const content = (
    <div className="max-w-5xl mx-auto w-full space-y-8">
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-text-secondary">
          <RefreshCw size={48} className="animate-spin mb-4 text-brand-500" />
          <p className="text-xl">데이터를 불러오는 중입니다...</p>
        </div>
      ) : scannedPart ? (
        <div className="animate-in slide-in-from-bottom-8 duration-500 space-y-6">
          {/* 부품 정보 헤더 */}
          <Card className="p-8 bg-bg-surface border-border-default">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Badge variant="primary" className="text-sm px-3 py-1">{scannedPart.client}</Badge>
                  <span className="text-text-secondary font-mono">{scannedPart.orderId}</span>
                </div>
                <div className="text-xs font-bold text-brand-500 mb-1">도면번호: {scannedPart.part_no || '-'}</div>
                <h2 className="text-3xl font-bold text-text-primary mb-2">{scannedPart.part_name}</h2>
                <p className="text-xl text-text-secondary font-mono">{scannedPart.spec} / 총 수량: {scannedPart.qty}개</p>
              </div>
              <div className="text-right flex flex-col items-end gap-2">
                <Button variant="outline" size="sm" onClick={clearScan} disabled={isWorking}>
                  닫기 (X)
                </Button>
                <div className="text-sm text-text-secondary mt-2">식별 바코드</div>
                <div className="text-xl font-bold text-brand-300 font-mono">{scannedPart.id.split('-').pop()}</div>
              </div>
            </div>
          </Card>

          {/* 공정 선택 및 액션 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 좌측: 작업 컨트롤 */}
            <Card className="p-6 bg-bg-surface border-border-default space-y-6">
              {!isWorking ? (
                <>
                  <div>
                    <label className="block text-lg font-medium text-text-secondary mb-3">현재 진행할 공정 선택</label>
                    <BaseSelect 
                      className="h-14 text-xl"
                      value={selectedProcess}
                      onChange={(e) => setSelectedProcess(e.target.value)}
                      options={[
                        { value: '선반', label: '선반 (Lathe)' },
                        { value: '밀링', label: '밀링 (Milling)' },
                        { value: 'MCT', label: '머시닝센터 (MCT)' },
                        { value: '탭', label: '탭/보루반 (Tap)' },
                        { value: '출하 검사', label: '최종 검사/출하' }
                      ]}
                    />
                  </div>
                  <KioskLargeButton variant="primary" icon={<Play />} onClick={handleStartWork}>
                    작업 시작
                  </KioskLargeButton>
                </>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 text-brand-400 font-bold text-xl">
                    <div className="w-4 h-4 rounded-full bg-brand-500 animate-pulse"></div>
                    [{selectedProcess}] 작업 진행 중...
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-text-secondary mb-2">양품 수량</label>
                      <NumberInput 
                        className="h-14 text-2xl font-bold text-brand-400"
                        value={completeQty}
                        onChange={(val) => setCompleteQty(Number(val))}
                        min={0}
                        max={scannedPart.qty}
                      />
                    </div>
                    
                    {/* 불량 입력 토글 영역 */}
                    {!isDefectMode ? (
                      <Button variant="outline" className="w-full text-danger border-danger hover:bg-danger/10" onClick={() => setIsDefectMode(true)}>
                        <AlertCircle size={18} className="mr-2" /> 불량이 발생했나요?
                      </Button>
                    ) : (
                      <div className="p-4 border border-danger/50 rounded-lg bg-danger/5 space-y-4 animate-in fade-in">
                        <div className="flex justify-between items-center">
                          <label className="text-danger font-bold">불량 수량</label>
                          <Button variant="ghost" size="sm" className="text-text-secondary" onClick={() => { setIsDefectMode(false); setDefectQty(0); }}>취소</Button>
                        </div>
                        <NumberInput 
                          className="h-12 text-xl"
                          value={defectQty}
                          onChange={(val) => setDefectQty(Number(val))}
                          min={1}
                          max={scannedPart.qty}
                        />
                        <BaseInput 
                          placeholder="불량 사유 간략히 입력..."
                          value={defectReason}
                          onChange={(e) => setDefectReason(e.target.value)}
                        />
                        <ImageUploader onImageSelected={setDefectImage} />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Card>

            {/* 우측: 현장 예외 처리 및 히스토리 */}
            <div className="space-y-6">
              <Card className="p-6 bg-bg-surface border-border-default space-y-4">
                <label className="block text-lg font-medium text-text-secondary mb-2">공정 이력</label>
                {scannedPart.history.length === 0 ? (
                  <p className="text-text-disabled">기록된 이력이 없습니다.</p>
                ) : (
                  <ul className="space-y-3">
                    {scannedPart.history.map((log: any, i) => (
                      <li key={log.id || i} className="p-3 bg-bg-elevated rounded border border-border-default flex justify-between items-center">
                        <div>
                          <Badge variant={log.status === '완료' ? 'success' : log.status === '불량' ? 'danger' : 'warning'}>{log.status}</Badge>
                          <span className="ml-2 font-bold text-text-primary">{log.process_name}</span>
                        </div>
                        <div className="text-sm text-text-secondary">{log.worker} | {new Date(log.start_time).toLocaleTimeString('ko-KR', { hour: '2-digit', minute:'2-digit' })}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              {isWorking && (
                <KioskLargeButton variant="outline" className="text-text-secondary hover:text-text-primary h-[80px]" icon={<ArrowRightLeft />}>
                  중간 외주로 전환 (종료)
                </KioskLargeButton>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-32 text-text-disabled">
          <ScanLine size={80} className="mb-6 opacity-20" />
          <p className="text-2xl font-bold mb-2">바코드 스캔 대기 중</p>
          <p className="text-lg">도면의 바코드를 스캐너로 읽어주세요.</p>
        </div>
      )}
    </div>
  );

  const footer = isWorking && scannedPart ? (
    <div className="max-w-5xl mx-auto w-full flex gap-4">
      <KioskLargeButton variant="success" icon={<CheckCircle />} onClick={handleCompleteWork}>
        작업 완료 보고 (다음 공정으로)
      </KioskLargeButton>
    </div>
  ) : null;

  return (
    <KioskLayout 
      header={header}
      content={content}
      footer={footer}
    />
  );
};
