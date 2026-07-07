import React, { useRef, useState } from 'react';
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
import { TrendingUp, Plus, X } from 'lucide-react';
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

interface DiscountPolicyTabProps {
  form: Partial<CompanySettings>;
  updateForm: (key: keyof CompanySettings, value: any) => void;
}

export const DiscountPolicyTab: React.FC<DiscountPolicyTabProps> = ({ form, updateForm }) => {
  const chartRef = useRef<any>(null);
  
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
        pointRadius: 6,
        pointHoverRadius: 8,
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
    color: '#8B949E', // text-muted
    plugins: {
      legend: {
        display: false // Use custom legend below
      },
      tooltip: {
        backgroundColor: '#21262D', // bg-elevated
        titleColor: '#E6EDF3', // text-primary
        bodyColor: '#8B949E', // text-muted
        borderColor: '#30363D', // border-default
        borderWidth: 1,
      },
      zoom: {
        pan: { enabled: true, mode: 'x' },
        zoom: {
          wheel: { enabled: true },
          pinch: { enabled: true },
          mode: 'x',
        }
      },
      dragData: {
        round: 1,
        showTooltip: true,
        dragX: false,
        dragY: true,
        onDrag: (_e: any) => {
          if (_e.target) _e.target.style.cursor = 'grabbing';
        },
        onDragEnd: (e: any, datasetIndex: number, index: number, value: any) => {
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
    if (quantities.length <= 2) {
      alert('최소 2개의 수량 기준이 필요합니다.');
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="bg-bg-surface p-6 shadow-soft border-0">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border-default">
          <div className="p-2 bg-brand-bg rounded-xl">
            <TrendingUp className="w-5 h-5 text-brand-500" />
          </div>
          <div>
            <h3 className="font-black text-text-primary uppercase tracking-tight">수량별 단가 적용률 정책</h3>
            <p className="text-[10px] font-bold text-text-muted mt-0.5">난이도 및 수량에 따른 할인율 커브를 드래그하여 조정하세요.</p>
          </div>
        </div>

        {/* 1. 컨트롤 패널 */}
        <div className="flex flex-wrap gap-2 mb-6">
          <span className="text-[10px] font-black text-text-muted flex items-center mr-2 uppercase tracking-widest">난이도 필터:</span>
          {DIFFICULTIES.map((grade, idx) => (
            <button
              key={grade}
              onClick={() => toggleVisibility(grade)}
              className={`px-3 py-1 text-xs font-black rounded-lg border transition-all ${
                visibleDatasets[grade]
                  ? 'bg-bg-surface border-border-strong shadow-sm'
                  : 'bg-bg-elevated border-border-default opacity-50'
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
            className="ml-auto text-[10px] text-brand-500 hover:text-brand-400 font-black hover:underline uppercase tracking-widest"
          >
            모두 보기
          </button>
        </div>

        {/* 2. 그래프 영역 */}
        <div className="w-full h-[400px] bg-bg-elevated p-4 rounded-2xl border border-border-default relative mb-8">
          <Line ref={chartRef} data={data} options={options} />
          <p className="text-[10px] text-text-muted text-center mt-3 font-bold">
            * 마우스 휠: <strong>확대/축소</strong> | 드래그: <strong>점 이동으로 값 조정</strong>
          </p>
        </div>

        {/* 3. 데이터 동기화 테이블 영역 */}
        <div className="w-full bg-bg-elevated rounded-2xl border border-border-default overflow-hidden flex flex-col">
          <div className="bg-bg-overlay border-b border-border-default p-3 text-center text-[10px] font-black text-text-muted uppercase tracking-widest">
            수량 및 단가 적용률 상세 (직접 입력)
          </div>
          <div className="flex-1 overflow-x-auto p-4">
            <table className="w-full text-xs text-left border-collapse min-w-[300px]">
              <thead>
                <tr>
                  <th className="font-black text-text-muted pb-3 border-b-2 border-border-default whitespace-nowrap text-center">난이도&nbsp; \ &nbsp;수량</th>
                  {quantities.map((qty, i) => (
                    <th key={i} className="pb-3 border-b-2 border-border-default text-center relative px-1 group">
                      <div className="flex items-center justify-center">
                        <input
                          type="number"
                          className="w-16 text-center font-black text-brand-500 bg-brand-bg border border-brand-500/30 rounded-lg px-1 py-1.5 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all"
                          value={qty}
                          onChange={(e) => handleQuantityChange(i, e.target.value)}
                        />
                        <span className="text-[9px] text-text-muted ml-1">ea</span>
                      </div>
                      <button
                        onClick={() => handleRemoveQuantity(i)}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-danger-bg text-danger rounded-full flex items-center justify-center text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                        title="이 수량 기준 삭제"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </th>
                  ))}
                  <th className="pb-3 border-b-2 border-border-default text-center align-bottom px-2">
                    <button
                      onClick={handleAddQuantity}
                      className="w-8 h-8 bg-bg-surface hover:bg-brand-bg text-text-muted hover:text-brand-500 rounded-full flex items-center justify-center font-bold text-lg transition-colors border border-dashed border-border-strong hover:border-brand-500"
                      title="수량 기준 추가"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
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
                          className="inline-flex items-center justify-center w-6 h-6 rounded-full font-black text-white shadow-soft"
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
                              className="w-16 text-center font-bold text-text-primary bg-bg-surface border border-border-default rounded-lg px-1 py-1.5 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all hover:bg-bg-overlay"
                              value={val}
                              onChange={(e) => handleTableInputChange(grade, cIdx, e.target.value)}
                              disabled={!isVisible}
                            />
                            <span className="text-[9px] text-text-muted ml-1">%</span>
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
