import React, { useEffect } from 'react';
import { Command } from 'cmdk';
import {
  Search,
  FileText,
  ShoppingCart,
  Building2,
  Truck,
  Layers,
  LayoutDashboard,
  Hammer,
  Package,
  ScanLine,
  Sliders,
  DollarSign,
  X,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { useAppStore } from '@/shared/stores/useAppStore';
import { useNavigate } from 'react-router-dom';
import { useGlobalSearch } from './hooks/useGlobalSearch';

const QUICK_MENUS = [
  { label: '대시보드', path: '/', icon: LayoutDashboard, category: '현황판' },
  { label: '견적 관리', path: '/estimates', icon: FileText, category: '영업 관리' },
  { label: '수주 관리', path: '/orders', icon: ShoppingCart, category: '영업 관리' },
  { label: '출하 관리', path: '/shipping', icon: Truck, category: '영업 관리' },
  { label: '생산 관리', path: '/production/list', icon: Hammer, category: '생산 관리' },
  { label: '외주/구매 관리', path: '/outsource', icon: Package, category: '생산 관리' },
  { label: '통합 스캐너 (현장/입고)', path: '/scanner', icon: ScanLine, category: '생산 관리' },
  { label: '단가 관리', path: '/materials', icon: DollarSign, category: '기준 정보' },
  { label: '거래처 관리', path: '/clients', icon: Building2, category: '기준 정보' },
  { label: '시스템 설정', path: '/settings', icon: Sliders, category: '시스템' },
];

export const CommandPalette: React.FC = () => {
  const { isSearchOpen, closeSearch } = useAppStore();
  const navigate = useNavigate();
  const { query, setQuery, results, isLoading, totalResultsCount } = useGlobalSearch();

  // Ctrl+K / Cmd+K 글로벌 단축키 리스너
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        useAppStore.getState().toggleSearch();
      }
      if (e.key === 'Escape' && isSearchOpen) {
        closeSearch();
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [isSearchOpen, closeSearch]);

  // 모달 닫힐 때 검색어 초기화
  useEffect(() => {
    if (!isSearchOpen) {
      setQuery('');
    }
  }, [isSearchOpen, setQuery]);

  if (!isSearchOpen) return null;

  const handleSelect = (action: () => void) => {
    action();
    closeSearch();
  };

  const isSearching = query.trim().length > 0;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-24 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={closeSearch}
    >
      <Command
        className="w-full max-w-2xl bg-bg-surface border border-border-strong rounded-2xl shadow-2xl overflow-hidden flex flex-col text-text-primary animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        shouldFilter={false} // 자체 백엔드 Supabase 검색을 사용하므로 클라이언트 필터링 끔
      >
        {/* 상단 검색 인풋창 */}
        <div className="flex items-center px-4 py-3.5 border-b border-border-default gap-3 bg-bg-elevated/40">
          <Search className="text-brand-400 shrink-0" size={20} />
          <Command.Input
            autoFocus
            value={query}
            onValueChange={setQuery}
            placeholder="도면번호, 품명, 수주번호, 견적, 고객사, 출하 전표 검색..."
            className="flex-1 bg-transparent border-none outline-none text-text-primary placeholder:text-text-secondary text-base min-w-0"
          />
          {isLoading && (
            <Loader2 className="w-5 h-5 text-brand-400 animate-spin shrink-0" />
          )}
          <button
            onClick={closeSearch}
            className="text-text-secondary hover:text-text-primary p-1.5 rounded-lg hover:bg-bg-overlay transition-colors shrink-0"
            title="닫기 (ESC)"
          >
            <X size={18} />
          </button>
        </div>

        {/* 결과 리스트 */}
        <Command.List className="max-h-[60vh] overflow-y-auto p-3 scrollbar-thin space-y-3">
          {/* 검색 중이 아닐 때: 추천 메뉴 바로가기 */}
          {!isSearching && (
            <Command.Group
              heading="빠른 메뉴 바로가기"
              className="text-xs font-bold text-text-secondary [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-1">
                {QUICK_MENUS.map((menu) => {
                  const Icon = menu.icon;
                  return (
                    <Command.Item
                      key={menu.path}
                      onSelect={() => handleSelect(() => navigate(menu.path))}
                      className="flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer hover:bg-bg-elevated hover:text-brand-400 aria-selected:bg-bg-elevated aria-selected:text-brand-400 transition-all text-sm group border border-transparent hover:border-border-default"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-bg-elevated group-hover:bg-brand-500/10 text-text-secondary group-hover:text-brand-400 transition-colors">
                          <Icon size={16} />
                        </div>
                        <span className="font-medium text-text-primary group-hover:text-brand-300">
                          {menu.label}
                        </span>
                      </div>
                      <span className="text-[10px] text-text-muted font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                        이동 ↵
                      </span>
                    </Command.Item>
                  );
                })}
              </div>
            </Command.Group>
          )}

          {/* 검색 중일 때: 결과 없음 안내 */}
          {isSearching && !isLoading && totalResultsCount === 0 && (
            <Command.Empty className="py-12 text-center text-text-secondary">
              <Search className="w-10 h-10 text-text-muted mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium text-text-primary">
                &apos;{query}&apos;에 대한 검색 결과가 없습니다.
              </p>
              <p className="text-xs text-text-muted mt-1">
                도면번호, 품명, 수주번호, 또는 거래처 이름을 다시 확인해 보세요.
              </p>
            </Command.Empty>
          )}

          {/* 1. 도면 / 품목 검색 결과 */}
          {results.items.length > 0 && (
            <Command.Group
              heading={`부품 및 도면 (${results.items.length})`}
              className="text-xs font-bold text-purple-400 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:uppercase"
            >
              {results.items.map((item) => (
                <Command.Item
                  key={item.id}
                  onSelect={() =>
                    handleSelect(() =>
                      navigate(`/orders?search=${encodeURIComponent(item.po_no || item.part_no || item.part_name || '')}`)
                    )
                  }
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer hover:bg-purple-500/10 hover:text-purple-300 aria-selected:bg-purple-500/10 aria-selected:text-purple-300 transition-all text-sm border border-transparent hover:border-purple-500/20 my-1"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 shrink-0">
                      <Layers size={16} />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-text-primary truncate">
                          {item.part_name}
                        </span>
                        {item.part_no && (
                          <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-bg-elevated text-purple-300 border border-border-default shrink-0">
                            {item.part_no}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-text-secondary mt-0.5 font-mono">
                        {item.spec && <span>규격: {item.spec}</span>}
                        {item.po_no && <span>• 수주: {item.po_no}</span>}
                        {item.client_name && <span>• 고객사: {item.client_name}</span>}
                      </div>
                    </div>
                  </div>
                  <ArrowRight size={14} className="text-text-muted shrink-0 ml-2 opacity-50" />
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {/* 2. 수주 검색 결과 */}
          {results.orders.length > 0 && (
            <Command.Group
              heading={`수주 (${results.orders.length})`}
              className="text-xs font-bold text-emerald-400 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:uppercase"
            >
              {results.orders.map((ord) => (
                <Command.Item
                  key={ord.id}
                  onSelect={() =>
                    handleSelect(() =>
                      navigate(`/orders?search=${encodeURIComponent(ord.po_no || ord.order_number || '')}`)
                    )
                  }
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer hover:bg-emerald-500/10 hover:text-emerald-300 aria-selected:bg-emerald-500/10 aria-selected:text-emerald-300 transition-all text-sm border border-transparent hover:border-emerald-500/20 my-1"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
                      <ShoppingCart size={16} />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-text-primary">
                          {ord.po_no || ord.order_number}
                        </span>
                        {ord.client_name && (
                          <span className="text-xs text-text-secondary">
                            ({ord.client_name})
                          </span>
                        )}
                        {ord.status && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-elevated text-emerald-400 border border-emerald-500/30">
                            {ord.status}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-text-secondary mt-0.5 font-mono">
                        {ord.order_date && <span>수주일: {ord.order_date}</span>}
                        {ord.total_amount !== undefined && (
                          <span className="font-bold text-emerald-400">
                            • ₩{Number(ord.total_amount).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <ArrowRight size={14} className="text-text-muted shrink-0 ml-2 opacity-50" />
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {/* 3. 견적서 검색 결과 */}
          {results.estimates.length > 0 && (
            <Command.Group
              heading={`견적서 (${results.estimates.length})`}
              className="text-xs font-bold text-blue-400 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:uppercase"
            >
              {results.estimates.map((est) => (
                <Command.Item
                  key={est.id}
                  onSelect={() => handleSelect(() => navigate(`/estimates/${est.id}`))}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer hover:bg-blue-500/10 hover:text-blue-300 aria-selected:bg-blue-500/10 aria-selected:text-blue-300 transition-all text-sm border border-transparent hover:border-blue-500/20 my-1"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 shrink-0">
                      <FileText size={16} />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-text-primary truncate">
                          {est.project_name}
                        </span>
                        {est.quotation_no && (
                          <span className="font-mono text-xs text-text-secondary">
                            ({est.quotation_no})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-text-secondary mt-0.5 font-mono">
                        {est.client_name && <span>고객사: {est.client_name}</span>}
                        {est.created_at && (
                          <span>• {new Date(est.created_at).toLocaleDateString()}</span>
                        )}
                        {est.total_amount !== undefined && (
                          <span className="font-bold text-blue-400">
                            • ₩{Number(est.total_amount).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <ArrowRight size={14} className="text-text-muted shrink-0 ml-2 opacity-50" />
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {/* 4. 거래처 검색 결과 */}
          {results.clients.length > 0 && (
            <Command.Group
              heading={`거래처 (${results.clients.length})`}
              className="text-xs font-bold text-amber-400 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:uppercase"
            >
              {results.clients.map((client) => (
                <Command.Item
                  key={client.id}
                  onSelect={() =>
                    handleSelect(() =>
                      navigate(`/clients?search=${encodeURIComponent(client.name)}`)
                    )
                  }
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer hover:bg-amber-500/10 hover:text-amber-300 aria-selected:bg-amber-500/10 aria-selected:text-amber-300 transition-all text-sm border border-transparent hover:border-amber-500/20 my-1"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 shrink-0">
                      <Building2 size={16} />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-text-primary">{client.name}</span>
                      <div className="flex items-center gap-2 text-xs text-text-secondary mt-0.5 font-mono">
                        {client.biz_num && <span>사업자: {client.biz_num}</span>}
                        {client.manager_name && <span>• 담당: {client.manager_name}</span>}
                        {client.manager_phone && <span>• 연락처: {client.manager_phone}</span>}
                      </div>
                    </div>
                  </div>
                  <ArrowRight size={14} className="text-text-muted shrink-0 ml-2 opacity-50" />
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {/* 5. 출하 전표 검색 결과 */}
          {results.shipments.length > 0 && (
            <Command.Group
              heading={`출하 전표 (${results.shipments.length})`}
              className="text-xs font-bold text-cyan-400 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:uppercase"
            >
              {results.shipments.map((ship) => (
                <Command.Item
                  key={ship.id}
                  onSelect={() =>
                    handleSelect(() =>
                      navigate(
                        `/shipping?tab=shipped&search=${encodeURIComponent(ship.shipment_no)}`
                      )
                    )
                  }
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer hover:bg-cyan-500/10 hover:text-cyan-300 aria-selected:bg-cyan-500/10 aria-selected:text-cyan-300 transition-all text-sm border border-transparent hover:border-cyan-500/20 my-1"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 shrink-0">
                      <Truck size={16} />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-text-primary">
                          {ship.shipment_no}
                        </span>
                        {ship.recipient_name && (
                          <span className="text-xs text-text-secondary">
                            (수령: {ship.recipient_name})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-text-secondary mt-0.5 font-mono">
                        {ship.client_name && <span>고객사: {ship.client_name}</span>}
                        {ship.tracking_no && <span>• 송장: {ship.tracking_no}</span>}
                        {ship.shipped_at && (
                          <span>• 출하일: {new Date(ship.shipped_at).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <ArrowRight size={14} className="text-text-muted shrink-0 ml-2 opacity-50" />
                </Command.Item>
              ))}
            </Command.Group>
          )}
        </Command.List>

        {/* 하단 단축키 가이드 풋터 */}
        <div className="px-4 py-2.5 bg-bg-elevated/80 border-t border-border-default flex items-center justify-between text-xs text-text-secondary font-mono">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-bg-base border border-border-default text-[10px]">
                ↑
              </kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-bg-base border border-border-default text-[10px]">
                ↓
              </kbd>
              <span>이동</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-bg-base border border-border-default text-[10px]">
                ↵
              </kbd>
              <span>선택</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-bg-base border border-border-default text-[10px]">
                ESC
              </kbd>
              <span>닫기</span>
            </span>
          </div>
          <span className="text-[11px] text-text-muted">
            MiniPDM v2.0 Spotlight
          </span>
        </div>
      </Command>
    </div>
  );
};
