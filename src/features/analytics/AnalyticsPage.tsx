import React from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { Card } from '@/design-system/Card';
import { PageHeader } from '@/design-system/PageHeader';
import { TrendingUp, Users, DollarSign, Package, Calendar, RefreshCw } from 'lucide-react';
import { useAnalytics } from './hooks/useAnalytics';

const COLORS = ['#0EA5E9', '#3FB950', '#D29922', '#F85149', '#A371F7', '#F0883E'];

export const AnalyticsPage: React.FC = () => {
  const { selectedYear, setSelectedYear, data, isLoading, reload } = useAnalytics();

  const stats = [
    { 
      label: '연간 수주 총액', 
      value: `₩${(data?.stats.totalOrderAmount || 0).toLocaleString('ko-KR')}`, 
      icon: DollarSign, 
      subText: `${selectedYear}년 누적 수주`, 
      color: 'text-brand-400' 
    },
    { 
      label: '신규 수주 건수', 
      value: `${data?.stats.orderCount || 0}건`, 
      icon: Package, 
      subText: `${selectedYear}년 등록 건수`, 
      color: 'text-success' 
    },
    { 
      label: '외주 실매입 총액', 
      value: `₩${(data?.stats.totalOutsourceAmount || 0).toLocaleString('ko-KR')}`, 
      icon: TrendingUp, 
      subText: `${selectedYear}년 외주 집행액`, 
      color: 'text-warning' 
    },
    { 
      label: '활성 거래처', 
      value: `${data?.stats.activeClientCount || 0}개사`, 
      icon: Users, 
      subText: `${selectedYear}년 거래 고객사`, 
      color: 'text-brand-400' 
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 상단 헤더 & 연도 선택 */}
      <PageHeader
        icon={TrendingUp}
        title="통계 및 경영 분석"
        description="실제 수주, 출하, 외주 매입 및 공정 실적 데이터를 기반으로 회사의 핵심 경영 지표를 시각화합니다."
        actions={
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-elevated border border-border-default rounded-xl">
              <Calendar size={15} className="text-brand-400" />
              <select 
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-transparent text-sm font-semibold text-text-primary outline-none cursor-pointer"
              >
                <option value={2026} className="bg-bg-surface">2026년</option>
                <option value={2025} className="bg-bg-surface">2025년</option>
                <option value={2024} className="bg-bg-surface">2024년</option>
              </select>
            </div>

            <button
              onClick={reload}
              disabled={isLoading}
              className="p-2 bg-bg-elevated hover:bg-bg-surface border border-border-default rounded-xl text-text-secondary hover:text-brand-400 transition-colors"
              title="새로고침"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        }
      />

      {/* 4대 핵심 경영 KPI 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <Card key={i} className="p-5 flex flex-col gap-2 relative overflow-hidden group hover:border-brand-500/40 transition-all">
            <div className="flex justify-between items-center text-text-secondary">
              <span className="text-xs font-semibold uppercase tracking-wider">{stat.label}</span>
              <div className={`p-2 rounded-lg bg-bg-elevated ${stat.color} border border-border-default`}>
                <stat.icon size={16} />
              </div>
            </div>
            <div className="text-2xl font-bold text-text-primary mt-1 font-mono tracking-tight">
              {isLoading ? '...' : stat.value}
            </div>
            <div className="text-[11px] font-medium text-text-muted mt-auto pt-2 border-t border-border-default/40">
              {stat.subText}
            </div>
          </Card>
        ))}
      </div>

      {/* 메인 차트 그리드 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 월별 수주 추이 차트 (AreaChart) */}
        <Card className="col-span-1 lg:col-span-2 p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-text-primary">월별 수주 실적 추이</h2>
              <p className="text-xs text-text-muted mt-0.5">{selectedYear}년 1월 ~ 12월 월간 수주 발생 금액</p>
            </div>
            <span className="text-xs font-mono text-brand-400 px-2.5 py-1 rounded-md bg-brand-500/10 border border-brand-500/20">
              단위: 원(₩)
            </span>
          </div>

          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.monthlyRevenue || []} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#30363D" vertical={false} />
                <XAxis dataKey="name" stroke="#8B949E" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis 
                  stroke="#8B949E" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(val) => {
                    if (val === 0) return '₩0';
                    if (val >= 10000) return `₩${(val / 10000).toLocaleString()}만`;
                    return `₩${val.toLocaleString()}`;
                  }} 
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#21262D', borderColor: '#30363D', borderRadius: '8px', color: '#E6EDF3', fontSize: '12px' }}
                  formatter={(val: any) => [`₩${Number(val).toLocaleString('ko-KR')}`, '수주액']}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  name="수주액" 
                  stroke="#0EA5E9" 
                  strokeWidth={2.5} 
                  fillOpacity={1} 
                  fill="url(#colorRevenue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* 고객사별 수주 점유율 (Donut Chart) */}
        <Card className="col-span-1 p-5 flex flex-col">
          <div className="mb-4">
            <h2 className="text-base font-bold text-text-primary">고객사별 수주 비중</h2>
            <p className="text-xs text-text-muted mt-0.5">{selectedYear}년 거래처별 수주 점유율</p>
          </div>

          <div className="flex-1 min-h-[300px] flex items-center justify-center">
            {(!data?.clientShare || data.clientShare.length === 0) ? (
              <div className="text-center text-text-muted text-xs py-12">
                해당 연도에 등록된 수주 데이터가 없습니다.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.clientShare}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={4}
                    dataKey="chartValue"
                    stroke="none"
                  >
                    {data.clientShare.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#21262D', borderColor: '#30363D', borderRadius: '8px', color: '#E6EDF3', fontSize: '12px' }}
                    formatter={(_val: any, _name: any, item: any) => {
                      const rawAmount = item?.payload?.amount || 0;
                      const percent = item?.payload?.percent || 0;
                      return rawAmount > 0 
                        ? [`₩${Number(rawAmount).toLocaleString('ko-KR')} (${percent}%)`, '수주액']
                        : ['수주 등록 (금액 미입력)', '상태'];
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ fontSize: '12px', color: '#8B949E', paddingTop: '10px' }}
                    formatter={(value, entry: any) => {
                      const percent = entry?.payload?.percent;
                      return (
                        <span className="text-text-secondary text-xs">
                          {value} {percent !== undefined ? `(${percent}%)` : ''}
                        </span>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* 하단 2차 그리드: 공정별 생산 실적 현황 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5 flex flex-col">
          <div className="mb-4">
            <h2 className="text-base font-bold text-text-primary">공정별 생산 가공 실적</h2>
            <p className="text-xs text-text-muted mt-0.5">실제 현장 스캔 및 공정 로그에 기록된 양품 가공 수량</p>
          </div>

          <div className="flex-1 min-h-[260px] flex items-center justify-center">
            {(!data?.processShare || data.processShare.every(p => p.count === 0)) ? (
              <div className="text-center text-text-muted text-xs py-10">
                현재 등록된 공정 가공 실적이 없습니다. (현장 스캐너 작업 시 자동 집계)
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.processShare.filter(p => p.count > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="count"
                    stroke="none"
                  >
                    {data.processShare.map((_entry, index) => (
                      <Cell key={`proc-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#21262D', borderColor: '#30363D', borderRadius: '8px', color: '#E6EDF3', fontSize: '12px' }}
                    formatter={(val: any) => [`${Number(val).toLocaleString()}개`, '가공 수량']}
                  />
                  <Legend 
                    wrapperStyle={{ fontSize: '12px', color: '#8B949E' }} 
                    formatter={(value) => <span className="text-text-secondary text-xs">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card className="p-5 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-text-primary">주요 경영 요약 및 제조 인사이트</h2>
            <p className="text-xs text-text-muted mt-0.5">{selectedYear}년 MiniPDM 종합 요약</p>

            <div className="mt-5 space-y-3.5">
              <div className="p-3.5 rounded-xl bg-bg-elevated border border-border-default flex items-center justify-between">
                <span className="text-xs text-text-secondary font-medium">거래처 집중도 (1위 고객사)</span>
                <span className="text-sm font-bold text-brand-400 font-mono">
                  {data?.clientShare[0] ? `${data.clientShare[0].name} (${data.clientShare[0].percent}%)` : '-'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-bg-elevated border border-border-default flex items-center justify-between">
                <span className="text-xs text-text-secondary font-medium">평균 수주 단가</span>
                <span className="text-sm font-bold text-success font-mono">
                  {data?.stats.orderCount && data.stats.orderCount > 0
                    ? `₩${Math.round(data.stats.totalOrderAmount / data.stats.orderCount).toLocaleString('ko-KR')}`
                    : '₩0'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-bg-elevated border border-border-default flex items-center justify-between">
                <span className="text-xs text-text-secondary font-medium">외주 매입 비중 (수주액 대비)</span>
                <span className="text-sm font-bold text-warning font-mono">
                  {data?.stats.totalOrderAmount && data.stats.totalOrderAmount > 0
                    ? `${Math.round((data.stats.totalOutsourceAmount / data.stats.totalOrderAmount) * 100)}%`
                    : '0%'}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border-default/40 text-xs text-text-muted font-mono text-center">
            * 통계 데이터는 수주 확정 및 공정 완료 시 실시간으로 자동 갱신됩니다.
          </div>
        </Card>
      </div>
    </div>
  );
};
