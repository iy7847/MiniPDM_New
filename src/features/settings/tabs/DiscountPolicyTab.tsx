import React, { useRef, useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import type { ChartData } from 'chart.js';
import { Line } from 'react-chartjs-2';
// @ts-ignore
import * as pluginDragData from 'chartjs-plugin-dragdata';
// @ts-ignore
import zoomPlugin from 'chartjs-plugin-zoom';

import { Card } from '@/design-system/Card';
import { TrendingUp, Plus, X, Lock, Unlock, RotateCcw, RefreshCw, Save, FolderOpen } from 'lucide-react';
import { toast } from '@/shared/stores/useToastStore';
import { useConfirm } from '@/app/providers/ConfirmProvider';
import type { CompanySettings } from '../services/settingsService';

// Chart.js 등록
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  pluginDragData,
  zoomPlugin
);

const DIFFICULTIES = ['A', 'B', 'C', 'D', 'E', 'F'];
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#f97316', '#ef4444', '#64748b']; // brand-500, success, warning, etc.

export const DEFAULT_POLICY: Record<string, number[]> = {
  'A': [100, 90, 80, 70, 60, 50],
  'B': [100, 92, 84, 76, 68, 60],
  'C': [100, 94, 88, 82, 76, 70],
  'D': [100, 96, 92, 88, 84, 80],
  'E': [100, 98, 96, 94, 92, 90],
  'F': [100, 99, 98, 97, 96, 95],
};

const DEFAULT_QUANTITIES = [1, 10, 50, 100, 500, 1000];
const BACKUP_STORAGE_KEY = 'minipdm_discount_policy_backup';

interface DiscountPolicyTabProps {
  form: Partial<CompanySettings>;
  updateForm: (key: keyof CompanySettings, value: any) => void;
}

export const DiscountPolicyTab: React.FC<DiscountPolicyTabProps> = ({ form, updateForm }) => {
  const chartRef = useRef<any>(null);
  const { confirm } = useConfirm();
  
  // 1. 실수 방지 핵심 안전장치: 편집 잠금 상태 (기본값: 잠금!)
  const [isLocked, setIsLocked] = useState(true);

  // 2. 초기 진입 시점 스냅샷 (되돌리기용)
  const initialPolicyRef = useRef<any>(null);
  useEffect(() => {
    if (!initialPolicyRef.current && form.discount_policy_json) {
      initialPolicyRef.current = JSON.parse(JSON.stringify(form.discount_policy_json));
    }
  }, [form.discount_policy_json]);

  const policyData = form.discount_policy_json || DEFAULT_POLICY;

  // 동적/레거시 데이터 파싱 로직
  const isDynamic = policyData && 'quantities' in policyData;
  const dynPolicy = policyData as any;
  const quantities: number[] = isDynamic ? (dynPolicy.quantities || DEFAULT_QUANTITIES) : DEFAULT_QUANTITIES;
  const ratesObj: Record<string, number[]> = isDynamic ? dynPolicy.rates : (policyData as any);

  // 필터 상태 관리
  const [visibleDatasets, setVisibleDatasets] = useState<Record<string, boolean>>({
    'A': true, 'B': true, 'C': true, 'D': true, 'E': true, 'F': true
  });

  const toggleVisibility = (grade: string) => {
    setVisibleDatasets(prev => ({ ...prev, [grade]: !prev[grade] }));
  };

  const handlePolicyChange = (newPolicy: any) => {
    updateForm('discount_policy_json', newPolicy);
  };

  // 잠금 토글 핸들러
  const handleToggleLock = () => {
    if (isLocked) {
      setIsLocked(false);
      toast.info('정책 편집 모드가 활성화되었습니다. 차트 드래그 및 수치 입력이 가능합니다.');
    } else {
      setIsLocked(true);
      toast.success('정책 편집이 잠겼습니다. 마우스 조작 실수로부터 보호됩니다.');
    }
  };

  // 되돌리기 핸들러 (초기 진입 시점으로 원복)
  const handleRevert = async () => {
    if (!initialPolicyRef.current) {
      toast.error('되돌릴 이전 상태가 없습니다.');
      return;
    }
    const isOk = await confirm({
      title: '변경사항 되돌리기',
      description: '이번 세션에서 수정한 할인율 정책을 처음 상태로 되돌리시겠습니까?\n저장하지 않은 모든 수정사항이 취소됩니다.',
      confirmLabel: '원래대로 되돌리기',
      isDanger: true,
    });
    if (isOk) {
      handlePolicyChange(JSON.parse(JSON.stringify(initialPolicyRef.current)));
      toast.success('초기 상태로 복원되었습니다.');
    }
  };

  // 기본값 복원 핸들러
  const handleResetDefault = async () => {
    const isOk = await confirm({
      title: '표준 기본 정책 복원',
      description: '시스템 권장 표준 할인율 정책(수량 1~1000ea, 표준 감쇄 커브)으로 초기화하시겠습니까?',
      confirmLabel: '기본값 복원',
      isDanger: true,
    });
    if (isOk) {
      handlePolicyChange({ quantities: DEFAULT_QUANTITIES, rates: DEFAULT_POLICY });
      toast.success('표준 기본 정책으로 복원되었습니다.');
    }
  };

  // 로컬 스냅샷 백업 저장
  const handleSaveBackup = () => {
    try {
      const currentData = { quantities, rates: ratesObj, savedAt: new Date().toISOString() };
      localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(currentData));
      toast.success('현재 할인율 정책이 안전 백업본으로 저장되었습니다.');
    } catch (e) {
      toast.error('백업 저장 중 오류가 발생했습니다.');
    }
  };

  // 로컬 백업본 불러오기
  const handleLoadBackup = async () => {
    try {
      const saved = localStorage.getItem(BACKUP_STORAGE_KEY);
      if (!saved) {
        toast.error('저장된 백업본이 없습니다.');
        return;
      }
      const parsed = JSON.parse(saved);
      const isOk = await confirm({
        title: '백업본 불러오기',
        description: `저장된 백업본(${new Date(parsed.savedAt).toLocaleString()})으로 할인율 정책을 복원하시겠습니까?`,
        confirmLabel: '백업본 불러오기',
        isDanger: false,
      });
      if (isOk) {
        handlePolicyChange({ quantities: parsed.quantities, rates: parsed.rates });
        toast.success('백업본 정책이 성공적으로 적용되었습니다.');
      }
    } catch (e) {
      toast.error('백업 불러오기 중 오류가 발생했습니다.');
    }
  };

  const currentMaxX = quantities.length > 0 ? quantities[quantities.length - 1] * 1.05 : 1000;

  const data: ChartData<'line'> = {
    labels: quantities,
    datasets: DIFFICULTIES.map((grade, index) => {
      const arr = ratesObj[grade] || DEFAULT_POLICY[grade];
      return {
        label: `난이도 ${grade}`,
        data: arr.map((y, i) => ({
          x: quantities[i],
          y: y
        })),
        borderColor: COLORS[index],
        backgroundColor: '#161B22', // bg-surface
        pointRadius: isLocked ? 5 : 7,
        pointHoverRadius: isLocked ? 5 : 9,
        pointBackgroundColor: COLORS[index],
        pointBorderColor: '#ffffff',
        pointBorderWidth: 1.5,
        tension: 0.4,
        cubicInterpolationMode: 'monotone',
        fill: false,
        hidden: !visibleDatasets[grade],
      }
    }),
  };

  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
    color: '#8B949E',
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: '#21262D',
        titleColor: '#E6EDF3',
        bodyColor: '#8B949E',
        borderColor: '#30363D',
        borderWidth: 1,
      },
      zoom: {
        pan: { enabled: !isLocked, mode: 'x' },
        zoom: {
          wheel: { enabled: !isLocked },
          pinch: { enabled: !isLocked },
          mode: 'x',
        }
      },
      dragData: {
        round: 1,
        showTooltip: !isLocked,
        dragX: false,
        dragY: !isLocked, // 잠겨있을 때는 Y축 드래그 원천 차단!
        onDrag: (_e: any) => {
          if (!isLocked && _e.target) _e.target.style.cursor = 'grabbing';
        },
        onDragEnd: (e: any, datasetIndex: number, index: number, value: any) => {
          if (isLocked) return;
          e.target.style.cursor = 'default';

          const grade = DIFFICULTIES[datasetIndex];
          const currentArr = [...(ratesObj[grade] || DEFAULT_POLICY[grade])];

          let yValue = (typeof value === 'object' && value !== null) ? value.y : value;
          yValue = Number(yValue) || 0;

          // 값 제한 로직
          const prevVal = index > 0 ? currentArr[index - 1] : 100;
          const nextVal = index < currentArr.length - 1 ? currentArr[index + 1] : 0;
          const adjustedValue = Math.round(Math.max(nextVal, Math.min(prevVal, yValue)) * 10) / 10;

          currentArr[index] = adjustedValue;
          const newRatesObj = { ...ratesObj };
          newRatesObj[grade] = currentArr;
          
          handlePolicyChange({ quantities, rates: newRatesObj });
        },
      },
    },
    scales: {
      y: {
        min: 0,
        max: 100,
        grid: { color: '#30363D' },
        ticks: { color: '#8B949E' },
        title: { display: true, text: '단가 적용률 (%)', color: '#8B949E', font: { weight: 'bold' } },
      },
      x: {
        type: 'linear',
        title: { display: true, text: '주문 수량 (EA)', color: '#8B949E', font: { weight: 'bold' } },
        min: 0,
        max: currentMaxX,
        grid: { color: '#30363D' },
        ticks: { color: '#8B949E' },
      }
    },
  };

  const handleTableInputChange = (grade: string, index: number, val: string) => {
    if (isLocked) return;
    const numericValue = parseFloat(val);
    if (isNaN(numericValue)) return;

    const currentArr = [...(ratesObj[grade] || DEFAULT_POLICY[grade])];
    const prevVal = index > 0 ? currentArr[index - 1] : 100;
    const nextVal = index < currentArr.length - 1 ? currentArr[index + 1] : 0;
    const safeValue = Math.max(nextVal, Math.min(prevVal, numericValue));
    
    currentArr[index] = safeValue;
    const newRatesObj = { ...ratesObj };
    newRatesObj[grade] = currentArr;
    handlePolicyChange({ quantities, rates: newRatesObj });
  };

  const handleQuantityChange = (index: number, val: string) => {
    if (isLocked) return;
    const numericValue = parseInt(val, 10);
    if (isNaN(numericValue) || numericValue < 1) return;

    const newQuantities = [...quantities];
    const prevVal = index > 0 ? newQuantities[index - 1] : 0;
    const nextVal = index < newQuantities.length - 1 ? newQuantities[index + 1] : Number.MAX_SAFE_INTEGER;
    const safeValue = Math.max(prevVal + 1, Math.min(nextVal - 1, numericValue));
    
    newQuantities[index] = safeValue;
    handlePolicyChange({ quantities: newQuantities, rates: ratesObj });
  };

  const handleAddQuantity = () => {
    if (isLocked) return;
    const newQuantities = [...quantities];
    const lastQty = quantities.length > 0 ? quantities[quantities.length - 1] : 0;

    let nextQty = lastQty;
    if (lastQty >= 1000) nextQty += 1000;
    else if (lastQty >= 100) nextQty += 100;
    else if (lastQty >= 10) nextQty += 10;
    else nextQty += 1;

    newQuantities.push(nextQty);

    const newRatesObj = { ...ratesObj };
    DIFFICULTIES.forEach(grade => {
      const arr = [...(ratesObj[grade] || DEFAULT_POLICY[grade])];
      const lastRate = arr.length > 0 ? arr[arr.length - 1] : 100;
      arr.push(lastRate);
      newRatesObj[grade] = arr;
    });

    handlePolicyChange({ quantities: newQuantities, rates: newRatesObj });
  };

  const handleRemoveQuantity = (index: number) => {
    if (isLocked) return;
    if (quantities.length <= 2) {
      toast.error('최소 2개의 수량 기준이 필요합니다.');
      return;
    }

    const newQuantities = [...quantities];
    newQuantities.splice(index, 1);

    const newRatesObj = { ...ratesObj };
    DIFFICULTIES.forEach(grade => {
      const arr = [...(ratesObj[grade] || DEFAULT_POLICY[grade])];
      arr.splice(index, 1);
      newRatesObj[grade] = arr;
    });

    handlePolicyChange({ quantities: newQuantities, rates: newRatesObj });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="bg-bg-surface p-6 shadow-soft border border-border-default">
        {/* 상단 헤더 및 안전장치 툴바 */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-border-default">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-500/10 rounded-xl border border-brand-500/20">
              <TrendingUp className="w-5 h-5 text-brand-400" />
            </div>
            <div>
              <h3 className="font-bold text-text-primary text-base flex items-center gap-2">
                수량별 단가 적용률 정책
                {isLocked ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Lock className="w-3 h-3" /> 안전 잠금 상태
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 animate-pulse">
                    <Unlock className="w-3 h-3" /> 편집 모드 활성화됨
                  </span>
                )}
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                {isLocked 
                  ? '마우스 조작 실수 방지를 위해 잠겨 있습니다. 값을 수정하시려면 [편집 모드 해제]를 누르세요.'
                  : '차트의 점을 마우스로 드래그하거나 하단 표에 직접 숫자를 입력하여 할인율을 조정하세요.'}
              </p>
            </div>
          </div>

          {/* 안전장치 컨트롤 버튼 군 */}
          <div className="flex flex-wrap items-center gap-2">
            {/* 1. 잠금 / 편집 토글 버튼 */}
            <button
              onClick={handleToggleLock}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${
                isLocked
                  ? 'bg-brand-500 hover:bg-brand-600 text-white'
                  : 'bg-amber-500 hover:bg-amber-600 text-black font-extrabold'
              }`}
            >
              {isLocked ? (
                <>
                  <Unlock className="w-3.5 h-3.5" />
                  편집 모드 켜기
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  편집 잠그기 (완료)
                </>
              )}
            </button>

            {/* 2. 변경 취소 (되돌리기) */}
            <button
              onClick={handleRevert}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-text-secondary hover:text-text-primary bg-bg-elevated hover:bg-bg-overlay border border-border-default transition-colors"
              title="이번 세션의 변경사항을 처음 상태로 되돌립니다."
            >
              <RotateCcw className="w-3.5 h-3.5 text-text-muted" />
              되돌리기
            </button>

            {/* 3. 기본값 복원 */}
            <button
              onClick={handleResetDefault}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-text-secondary hover:text-text-primary bg-bg-elevated hover:bg-bg-overlay border border-border-default transition-colors"
              title="시스템 권장 표준 정책으로 초기화합니다."
            >
              <RefreshCw className="w-3.5 h-3.5 text-text-muted" />
              기본값 복원
            </button>

            {/* 4. 백업 저장 / 불러오기 */}
            <div className="h-4 w-[1px] bg-border-default mx-1 hidden sm:block" />

            <button
              onClick={handleSaveBackup}
              className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-text-muted hover:text-text-secondary hover:bg-bg-elevated transition-colors"
              title="현재 정책을 브라우저 안전 백업본으로 저장합니다."
            >
              <Save className="w-3.5 h-3.5" />
              백업 저장
            </button>

            <button
              onClick={handleLoadBackup}
              className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-text-muted hover:text-text-secondary hover:bg-bg-elevated transition-colors"
              title="저장해둔 백업 정책을 불러옵니다."
            >
              <FolderOpen className="w-3.5 h-3.5" />
              백업 복원
            </button>
          </div>
        </div>

        {/* 안내 배너 (편집 모드일 때만 표시) */}
        {!isLocked && (
          <div className="mb-5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center justify-between animate-in fade-in duration-300">
            <div className="flex items-center gap-2">
              <span className="font-bold text-amber-400">💡 편집 안내:</span>
              <span>마우스로 그래프 곡선의 점을 위아래로 끌거나, 하단 테이블의 수치를 입력하면 즉시 반영됩니다. 실수하셨을 경우 [되돌리기]를 누르세요.</span>
            </div>
            <button 
              onClick={() => setIsLocked(true)}
              className="text-[11px] font-bold text-amber-400 hover:text-amber-200 underline ml-2 shrink-0"
            >
              편집 완료 (잠금)
            </button>
          </div>
        )}

        {/* 난이도 필터 패널 */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="text-[11px] font-bold text-text-secondary flex items-center mr-2">난이도 필터:</span>
          {DIFFICULTIES.map((grade, idx) => (
            <button
              key={grade}
              onClick={() => toggleVisibility(grade)}
              className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all ${
                visibleDatasets[grade]
                  ? 'bg-bg-surface border-border-strong shadow-sm'
                  : 'bg-bg-elevated border-border-default opacity-40'
              }`}
              style={{
                borderColor: visibleDatasets[grade] ? COLORS[idx] : undefined,
                color: visibleDatasets[grade] ? COLORS[idx] : undefined
              }}
            >
              {visibleDatasets[grade] ? `✔ ${grade}` : grade}
            </button>
          ))}
          <button
            onClick={() => setVisibleDatasets({ 'A': true, 'B': true, 'C': true, 'D': true, 'E': true, 'F': true })}
            className="ml-auto text-xs text-brand-400 hover:text-brand-300 font-bold hover:underline"
          >
            모두 보기
          </button>
        </div>

        {/* 그래프 영역 */}
        <div className={`w-full h-[400px] bg-bg-elevated p-4 rounded-2xl border transition-all relative mb-6 ${
          isLocked ? 'border-border-default' : 'border-amber-500/40 ring-1 ring-amber-500/20 shadow-lg'
        }`}>
          <Line ref={chartRef} data={data} options={options} />
          <p className="text-xs text-text-muted text-center mt-3">
            {isLocked ? (
              <span className="text-emerald-400/80 font-medium">🔒 잠금 상태: 그래프 이동 및 점 조작이 안전하게 보호되어 있습니다.</span>
            ) : (
              <span>* 마우스 휠: <strong>확대/축소</strong> | 드래그: <strong>점 이동으로 값 조정</strong></span>
            )}
          </p>
        </div>

        {/* 데이터 동기화 테이블 영역 */}
        <div className={`w-full bg-bg-elevated rounded-2xl border transition-all overflow-hidden flex flex-col ${
          isLocked ? 'border-border-default' : 'border-amber-500/30'
        }`}>
          <div className="bg-bg-overlay border-b border-border-default p-3 flex items-center justify-between text-xs font-bold text-text-secondary">
            <span>수량 및 단가 적용률 상세 (수치 직접 입력)</span>
            {isLocked && <span className="text-[11px] font-normal text-text-muted">🔒 읽기 전용 모드</span>}
          </div>
          <div className="flex-1 overflow-x-auto p-4">
            <table className="w-full text-xs text-left border-collapse min-w-[300px]">
              <thead>
                <tr>
                  <th className="font-bold text-text-secondary pb-3 border-b-2 border-border-default whitespace-nowrap text-center">
                    난이도&nbsp; \ &nbsp;수량
                  </th>
                  {quantities.map((qty, i) => (
                    <th key={i} className="pb-3 border-b-2 border-border-default text-center relative px-1 group">
                      <div className="flex items-center justify-center">
                        <input
                          type="number"
                          className={`w-16 text-center font-bold text-brand-400 bg-brand-500/10 border rounded-lg px-1 py-1.5 outline-none transition-all ${
                            isLocked 
                              ? 'border-brand-500/10 opacity-70 cursor-not-allowed' 
                              : 'border-brand-500/40 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 hover:border-brand-500/60'
                          }`}
                          value={qty}
                          onChange={(e) => handleQuantityChange(i, e.target.value)}
                          disabled={isLocked}
                        />
                        <span className="text-[10px] text-text-muted ml-1">ea</span>
                      </div>
                      {!isLocked && (
                        <button
                          onClick={() => handleRemoveQuantity(i)}
                          className="absolute -top-1 -right-1 w-4 h-4 bg-danger-bg text-danger rounded-full flex items-center justify-center text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                          title="이 수량 기준 삭제"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </th>
                  ))}
                  <th className="pb-3 border-b-2 border-border-default text-center align-bottom px-2">
                    {!isLocked && (
                      <button
                        onClick={handleAddQuantity}
                        className="w-8 h-8 bg-bg-surface hover:bg-brand-500/10 text-text-muted hover:text-brand-400 rounded-full flex items-center justify-center font-bold text-lg transition-colors border border-dashed border-border-strong hover:border-brand-500"
                        title="수량 기준 추가"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    )}
                  </th>
                </tr>
              </thead>
              <tbody>
                {DIFFICULTIES.map((grade, rIdx) => {
                  const isVisible = visibleDatasets[grade];
                  const arr = ratesObj[grade] || DEFAULT_POLICY[grade];
                  return (
                    <tr key={grade} className={`transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-30'}`}>
                      <td className="py-3 border-b border-border-default text-center">
                        <span
                          className="inline-flex items-center justify-center w-6 h-6 rounded-full font-bold text-white shadow-soft text-xs"
                          style={{ backgroundColor: COLORS[rIdx] }}
                        >
                          {grade}
                        </span>
                      </td>
                      {arr.map((val, cIdx) => (
                        <td key={cIdx} className="py-3 border-b border-border-default text-center px-1">
                          <div className="flex items-center justify-center">
                            <input
                              type="number"
                              step="0.1"
                              className={`w-16 text-center font-semibold text-text-primary rounded-lg px-1 py-1.5 outline-none transition-all ${
                                isLocked 
                                  ? 'bg-bg-base/60 border border-border-default/50 opacity-70 cursor-not-allowed text-text-secondary' 
                                  : 'bg-bg-surface border border-border-default focus:border-brand-500 focus:ring-1 focus:ring-brand-500 hover:bg-bg-overlay'
                              }`}
                              value={val}
                              onChange={(e) => handleTableInputChange(grade, cIdx, e.target.value)}
                              disabled={isLocked || !isVisible}
                            />
                            <span className="text-[10px] text-text-muted ml-1">%</span>
                          </div>
                        </td>
                      ))}
                      <td className="border-b border-border-default"></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  );
};
