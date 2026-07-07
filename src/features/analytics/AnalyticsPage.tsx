import React from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { Card } from '../../design-system/Card';
import { TrendingUp, Users, DollarSign, Package } from 'lucide-react';

const REVENUE_DATA = [
  { name: '1월', revenue: 4000, profit: 2400 },
  { name: '2월', revenue: 3000, profit: 1398 },
  { name: '3월', revenue: 2000, profit: 9800 },
  { name: '4월', revenue: 2780, profit: 3908 },
  { name: '5월', revenue: 1890, profit: 4800 },
  { name: '6월', revenue: 2390, profit: 3800 },
  { name: '7월', revenue: 3490, profit: 4300 },
];

const PROCESS_DATA = [
  { name: '선반', count: 400 },
  { name: '밀링', count: 300 },
  { name: '연마', count: 300 },
  { name: '와이어', count: 200 },
];
const COLORS = ['#0EA5E9', '#3FB950', '#D29922', '#F85149'];

const STATS = [
  { label: '총 매출', value: '₩124,500,000', icon: DollarSign, trend: '+12.5%', color: 'text-brand-500' },
  { label: '신규 수주', value: '45건', icon: Package, trend: '+5.2%', color: 'text-success' },
  { label: '활성 고객사', value: '12개사', icon: Users, trend: '0%', color: 'text-warning' },
  { label: '영업 이익률', value: '24.5%', icon: TrendingUp, trend: '+2.1%', color: 'text-brand-500' },
];

export const AnalyticsPage: React.FC = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">통계 및 분석</h1>
        <div className="flex gap-2">
          <select className="bg-bg-elevated border border-border-default rounded-md px-3 py-1.5 text-sm text-text-primary outline-none focus:border-brand-500 transition-colors">
            <option>2026년</option>
            <option>2025년</option>
          </select>
          <select className="bg-bg-elevated border border-border-default rounded-md px-3 py-1.5 text-sm text-text-primary outline-none focus:border-brand-500 transition-colors">
            <option>전체 기간</option>
            <option>상반기</option>
            <option>하반기</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map((stat, i) => (
          <Card key={i} className="p-4 flex flex-col gap-2">
            <div className="flex justify-between items-center text-text-secondary">
              <span className="text-sm font-medium">{stat.label}</span>
              <stat.icon size={16} />
            </div>
            <div className="text-2xl font-bold text-text-primary mt-1">{stat.value}</div>
            <div className="text-xs font-medium text-success mt-auto flex items-center gap-1">
              <TrendingUp size={12} />
              {stat.trend} (전월 대비)
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="col-span-1 lg:col-span-2 p-5 flex flex-col">
          <h2 className="text-lg font-bold text-text-primary mb-6">월별 매출 및 이익 추이</h2>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={REVENUE_DATA} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3FB950" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3FB950" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#30363D" vertical={false} />
                <XAxis dataKey="name" stroke="#8B949E" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#8B949E" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `₩${val}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#21262D', borderColor: '#30363D', borderRadius: '8px', color: '#E6EDF3' }}
                  itemStyle={{ color: '#E6EDF3' }}
                />
                <Area type="monotone" dataKey="revenue" name="매출" stroke="#0EA5E9" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                <Area type="monotone" dataKey="profit" name="이익" stroke="#3FB950" strokeWidth={2} fillOpacity={1} fill="url(#colorProfit)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="col-span-1 p-5 flex flex-col">
          <h2 className="text-lg font-bold text-text-primary mb-6">공정별 작업 비율</h2>
          <div className="flex-1 min-h-[300px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={PROCESS_DATA}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="count"
                  stroke="none"
                >
                  {PROCESS_DATA.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#21262D', borderColor: '#30363D', borderRadius: '8px', color: '#E6EDF3' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', color: '#8B949E' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
};
