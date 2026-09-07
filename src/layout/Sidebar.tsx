import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
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
  ChevronRight,
  ScanLine,
  Crown
} from 'lucide-react';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { useLicense } from '@/shared/hooks/useLicense';
import type { UserPermissions } from '@/shared/types/auth';
import kepLogo from '@/assets/kep_logo.png';

interface MenuItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  permission?: keyof UserPermissions;
}

interface MenuGroup {
  title: string;
  items: MenuItem[];
}

const MENU_GROUPS: MenuGroup[] = [
  {
    title: '현황판',
    items: [
      { path: '/', label: '대시보드', icon: LayoutDashboard },
    ]
  },
  {
    title: '영업 관리',
    items: [
      { path: '/estimates', label: '견적 관리', icon: FileText, permission: 'can_view_estimates' },
      { path: '/orders', label: '수주 관리', icon: ShoppingCart, permission: 'can_view_orders' },
      { path: '/shipping', label: '출하 관리', icon: Truck, permission: 'can_view_orders' },
    ]
  },
  {
    title: '생산 관리',
    items: [
      { path: '/production/list', label: '생산 관리', icon: Hammer, permission: 'can_manage_production' },
      { path: '/outsource', label: '외주/구매 관리', icon: Users, permission: 'can_manage_production' },
      { path: '/scanner', label: '통합 스캐너 (현장/입고)', icon: ScanLine, permission: 'can_manage_production' },
    ]
  },
  {
    title: '기준 정보',
    items: [
      { path: '/materials', label: '단가 관리', icon: Package, permission: 'can_manage_materials' },
      { path: '/clients', label: '거래처 관리', icon: Users, permission: 'can_manage_clients' },
      { path: '/master/routing', label: '공정/라우팅 관리', icon: Settings, permission: 'can_manage_production' },
    ]
  },
  {
    title: '시스템',
    items: [
      { path: '/analytics', label: '통계 분석', icon: BarChart2, permission: 'can_view_analytics' },
      { path: '/settings', label: '시스템 설정', icon: Settings, permission: 'can_manage_settings' },
    ]
  }
];

export const Sidebar: React.FC = () => {
  const { hasPermission, isAdmin } = usePermissions();
  const { isMasterAdmin } = useLicense();

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

  // 권한에 따른 메뉴 그룹 필터링
  const visibleMenuGroups = MENU_GROUPS.map(group => ({
    ...group,
    items: group.items.filter(item => {
      if (isAdmin) return true;
      if (item.permission) {
        return hasPermission(item.permission);
      }
      return true;
    })
  })).filter(group => group.items.length > 0);

  return (
    <aside className="w-64 h-full bg-bg-surface border-r border-border-default flex flex-col transition-all">
      <div className="p-4 flex items-center gap-3 border-b border-border-default">
        <div className="relative w-9 h-9 shrink-0 rounded-xl overflow-hidden border border-brand-500/30 shadow-md shadow-brand-500/10 bg-[#0D1117]">
          <img 
            src={kepLogo} 
            alt="KEP" 
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 leading-none">
            <span className="text-[10px] font-black tracking-widest text-brand-400 uppercase">KEP</span>
            <span className="text-[10px] text-text-secondary/50 font-medium">|</span>
            <span className="text-[9px] font-semibold text-text-secondary tracking-wider uppercase">Solution</span>
          </div>
          <span className="text-lg font-black text-text-primary tracking-tight truncate mt-0.5">
            MiniPDM <span className="text-brand-400 font-bold text-xs">v2.0</span>
          </span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {visibleMenuGroups.map((group) => {
          const isExpanded = expandedGroups[group.title] ?? true;
          
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

        {isMasterAdmin && (
          <div className="pt-3 mt-2 border-t border-amber-500/20">
            <div className="px-2 py-1 mb-1.5 text-[11px] font-black text-amber-400/90 uppercase tracking-wider flex items-center gap-1.5">
              <Crown size={13} className="text-amber-400" />
              <span>슈퍼 관리자 (KEP)</span>
            </div>
            <NavLink
              to="/master/licenses"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
                  isActive
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold shadow-lg shadow-amber-950/20'
                    : 'bg-amber-500/10 text-amber-400/90 border-amber-500/20 hover:bg-amber-500/15 hover:text-amber-200'
                }`
              }
            >
              <Crown size={18} className="text-amber-400 shrink-0" />
              <div className="flex flex-col text-left">
                <span className="font-bold text-xs">고객사 라이선스 관리</span>
                <span className="text-[10px] text-amber-400/60 font-normal">전국 고객사 계약 제어</span>
              </div>
            </NavLink>
          </div>
        )}
      </nav>

      <div className="p-4 border-t border-border-default text-xs text-text-secondary text-center shrink-0">
        &copy; 2026 KEP. All rights reserved.
      </div>
    </aside>
  );
};
