import React from 'react';
import { Card, Badge, CountUp } from '../../design-system';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowUpRight, ArrowDownRight, Clock, AlertTriangle } from 'lucide-react';
import { useDashboardStats } from './hooks/useDashboardStats';

export const DashboardPage: React.FC = () => {
  const { stats, loading, error } = useDashboardStats();

  if (error) {
    return <div className="p-6 text-danger">오류가 발생했습니다: {error.message}</div>;
  }

  if (loading || !stats) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <h1 className="text-2xl font-bold">대시보드</h1>
        
        {/* KPI Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-5 flex flex-col gap-2">
              <div className="h-4 w-20 bg-border rounded animate-pulse"></div>
              <div className="flex items-end justify-between mt-2">
                <div className="h-8 w-32 bg-border rounded animate-pulse"></div>
                <div className="h-4 w-12 bg-border rounded animate-pulse"></div>
              </div>
            </Card>
          ))}
        </div>

        {/* Main Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="h-6 w-32 bg-border rounded animate-pulse"></div>
              <div className="h-8 w-24 bg-border rounded animate-pulse"></div>
            </div>
            <div className="h-[300px] w-full mt-4 bg-border/50 rounded animate-pulse"></div>
          </Card>

          <Card className="p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-border-default pb-3">
              <div className="h-6 w-32 bg-border rounded animate-pulse"></div>
            </div>
            <div className="flex flex-col gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="p-3 bg-bg-base rounded border border-border-default h-[104px] animate-pulse"></div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h1 className="text-2xl font-bold">대시보드</h1>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 flex flex-col gap-2">
          <span className="text-text-secondary text-sm font-medium">이번달 매출</span>
          <div className="flex items-end justify-between">
            <span className="text-2xl font-bold">
              <CountUp value={stats.monthlyRevenue} prefix="₩ " separator="," />
            </span>
            <span className={`flex items-center text-sm ${stats.revenueGrowth >= 0 ? 'text-success' : 'text-danger'}`}>
              {stats.revenueGrowth >= 0 ? <ArrowUpRight size={16} className="mr-1" /> : <ArrowDownRight size={16} className="mr-1" />}
              {Math.abs(stats.revenueGrowth)}%
            </span>
          </div>
        </Card>
        <Card className="p-5 flex flex-col gap-2">
          <span className="text-text-secondary text-sm font-medium">진행 수주</span>
          <div className="flex items-end justify-between">
            <span className="text-2xl font-bold">
              <CountUp value={stats.activeOrders} suffix=" 건" />
            </span>
            <span className={`flex items-center text-sm ${stats.ordersGrowth >= 0 ? 'text-success' : 'text-danger'}`}>
              {stats.ordersGrowth >= 0 ? <ArrowUpRight size={16} className="mr-1" /> : <ArrowDownRight size={16} className="mr-1" />}
              {Math.abs(stats.ordersGrowth)} 건
            </span>
          </div>
        </Card>
        <Card className="p-5 flex flex-col gap-2">
          <span className="text-text-secondary text-sm font-medium">대기 견적</span>
          <div className="flex items-end justify-between">
            <span className="text-2xl font-bold">
              <CountUp value={stats.pendingQuotes} suffix=" 건" />
            </span>
            <span className={`flex items-center text-sm ${stats.quotesGrowth >= 0 ? 'text-success' : 'text-danger'}`}>
              {stats.quotesGrowth >= 0 ? <ArrowUpRight size={16} className="mr-1" /> : <ArrowDownRight size={16} className="mr-1" />}
              {Math.abs(stats.quotesGrowth)} 건
            </span>
          </div>
        </Card>
        <Card className="p-5 flex flex-col gap-2">
          <span className="text-text-secondary text-sm font-medium">견적 전환율</span>
          <div className="flex items-end justify-between">
            <span className="text-2xl font-bold">
              <CountUp value={stats.quoteConversionRate} decimals={1} suffix="%" />
            </span>
            <span className={`flex items-center text-sm ${stats.conversionGrowth >= 0 ? 'text-success' : 'text-danger'}`}>
              {stats.conversionGrowth >= 0 ? <ArrowUpRight size={16} className="mr-1" /> : <ArrowDownRight size={16} className="mr-1" />}
              {Math.abs(stats.conversionGrowth)}%
            </span>
          </div>
        </Card>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Chart (2/3) */}
        <Card className="lg:col-span-2 p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">12개월 매출 추이</h2>
            <select className="bg-bg-elevated border border-border-default rounded text-sm p-1 text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-500">
              <option>2026년</option>
              <option>2025년</option>
            </select>
          </div>
          <div className="h-[300px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.revenueChart} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#30363D" vertical={false} />
                <XAxis dataKey="name" stroke="#8B949E" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#8B949E" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₩${value/1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#21262D', borderColor: '#30363D', color: '#E6EDF3', borderRadius: '8px' }}
                  itemStyle={{ color: '#0EA5E9' }}
                />
                <Line type="monotone" dataKey="매출" stroke="#0EA5E9" strokeWidth={3} dot={{ r: 4, fill: '#0EA5E9', strokeWidth: 0 }} activeDot={{ r: 6, strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Right: Urgent Orders (1/3) */}
        <Card className="p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-border-default pb-3">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <AlertTriangle size={18} className="text-warning" />
              납기 임박 수주
            </h2>
          </div>
          <div className="flex flex-col gap-3 overflow-y-auto pr-1">
            {stats.urgentOrders.map((order) => (
              <div key={order.id} className="p-3 bg-bg-base rounded border border-border-default hover:border-brand-500/50 transition-colors cursor-pointer group">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs text-text-secondary font-mono">{order.id}</span>
                  <Badge variant={order.dDay <= 1 ? 'danger' : 'warning'} className="text-[10px] px-1.5 py-0">
                    D-{order.dDay}
                  </Badge>
                </div>
                <h3 className="text-sm font-bold text-text-primary group-hover:text-brand-500 transition-colors">{order.client}</h3>
                <p className="text-xs text-text-secondary mt-1 truncate">{order.item}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-text-secondary flex items-center gap-1">
                    <Clock size={12} />
                    {order.status}
                  </span>
                  <span className="text-brand-500 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                    자세히 보기 &rarr;
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
