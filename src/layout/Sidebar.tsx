import React from 'react';
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
  Settings 
} from 'lucide-react';

const MENU_ITEMS = [
  { path: '/', label: '대시보드', icon: LayoutDashboard },
  { path: '/estimates', label: '견적', icon: FileText },
  { path: '/orders', label: '수주', icon: ShoppingCart },
  { path: '/production', label: '생산', icon: Hammer },
  { path: '/shipping', label: '출하', icon: Truck },
  { path: '/materials', label: '자재', icon: Package },
  { path: '/outsource', label: '외주 발주', icon: Users },
  { path: '/clients', label: '거래처', icon: Users },
  { path: '/analytics', label: '분석', icon: BarChart2 },
  { path: '/settings', label: '설정', icon: Settings },
];

export const Sidebar: React.FC = () => {
  return (
    <aside className="w-64 h-full bg-bg-surface border-r border-border-default flex flex-col transition-all">
      <div className="p-4 flex items-center gap-2 border-b border-border-default">
        <div className="w-8 h-8 rounded bg-brand-500 flex items-center justify-center text-white font-bold">
          M
        </div>
        <span className="text-xl font-bold text-text-primary">MiniPDM <span className="text-brand-500">v2.0</span></span>
      </div>

      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {MENU_ITEMS.map((item) => (
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
      </nav>

      <div className="p-4 border-t border-border-default text-xs text-text-secondary text-center">
        &copy; 2026 AntiGravity
      </div>
    </aside>
  );
};
