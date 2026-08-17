import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  ShoppingCart, 
  Hammer, 
  Truck, 
  Package, 
  Users, 
  BarChart2, 
  Settings,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

const MENU_GROUPS = [
  {
    title: '현황판',
    items: [
      { path: '/', label: '대시보드', icon: LayoutDashboard },
    ]
  },
  {
    title: '영업 관리',
    items: [
      { path: '/estimates', label: '견적 관리', icon: FileText },
      { path: '/orders', label: '수주 관리', icon: ShoppingCart },
      { path: '/shipping', label: '출하 관리', icon: Truck },
    ]
  },
  {
    title: '생산 관리',
    items: [
      { path: '/production/list', label: '생산 관리', icon: Hammer },
      { path: '/production/shopfloor', label: '현장 실적 등록', icon: Hammer },
      { path: '/outsource', label: '외주/구매 관리', icon: Users },
      { path: '/receiving', label: '입고 처리', icon: Package },
    ]
  },
  {
    title: '기준 정보',
    items: [
      { path: '/materials', label: '단가 관리', icon: Package },
      { path: '/clients', label: '거래처 관리', icon: Users },
    ]
  },
  {
    title: '시스템',
    items: [
      { path: '/analytics', label: '통계 분석', icon: BarChart2 },
      { path: '/settings', label: '시스템 설정', icon: Settings },
    ]
  }
];

export const Sidebar: React.FC = () => {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('sidebar_expanded_groups');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return {
      '현황판': true,
      '영업 관리': true,
      '생산 관리': true,
      '기준 정보': true,
      '시스템': true
    };
  });

  const toggleGroup = (title: string) => {
    setExpandedGroups(prev => {
      const next = { ...prev, [title]: !prev[title] };
      localStorage.setItem('sidebar_expanded_groups', JSON.stringify(next));
      return next;
    });
  };

  return (
    <aside className="w-64 h-full bg-bg-surface border-r border-border-default flex flex-col transition-all">
      <div className="p-4 flex items-center gap-2 border-b border-border-default">
        <div className="w-8 h-8 rounded bg-brand-500 flex items-center justify-center text-white font-bold shrink-0">
          M
        </div>
        <span className="text-xl font-bold text-text-primary truncate">MiniPDM <span className="text-brand-500">v2.0</span></span>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {MENU_GROUPS.map((group) => {
          const isExpanded = expandedGroups[group.title];
          
          return (
            <div key={group.title} className="space-y-1">
              <button 
                onClick={() => toggleGroup(group.title)}
                className="w-full flex items-center justify-between px-2 py-1 mb-1 text-xs font-semibold text-text-secondary uppercase tracking-wider hover:text-text-primary transition-colors group"
              >
                <span>{group.title}</span>
                <span className="opacity-50 group-hover:opacity-100 transition-opacity">
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </span>
              </button>
              
              <div className={`space-y-1 overflow-hidden transition-all duration-200 ${isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                {group.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${
                        isActive
                          ? 'bg-brand-500/10 text-brand-500 font-medium'
                          : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
                      }`
                    }
                  >
                    <item.icon size={20} />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border-default text-xs text-text-secondary text-center shrink-0">
        &copy; 2026 AntiGravity
      </div>
    </aside>
  );
};
