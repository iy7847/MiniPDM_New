import React, { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { Search, FileText, ShoppingCart, Users, X } from 'lucide-react';
import { useAppStore } from '../../shared/stores/useAppStore';
import { useNavigate } from 'react-router-dom';

const MOCK_DATA = {
  estimates: [
    { id: 'EST-2607-01', title: '금속 가공 부품 100개' },
    { id: 'EST-2607-02', title: '알루미늄 브라켓 세트' }
  ],
  orders: [
    { id: 'ORD-2607-15', title: '현대모비스 샘플 발주' }
  ],
  clients: [
    { id: 'C001', name: '현대모비스' },
    { id: 'C002', name: '기아자동차' }
  ]
};

export const CommandPalette: React.FC = () => {
  const { isSearchOpen, closeSearch } = useAppStore();
  const navigate = useNavigate();
  const [value, setValue] = useState('');

  // Cmd+K to open
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        useAppStore.getState().toggleSearch();
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  if (!isSearchOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-32 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={closeSearch}>
      <Command 
        className="w-full max-w-2xl bg-bg-elevated border border-border-default rounded-xl shadow-2xl overflow-hidden flex flex-col text-text-primary animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        value={value}
        onValueChange={setValue}
      >
        <div className="flex items-center px-4 py-3 border-b border-border-default gap-3">
          <Search className="text-text-secondary shrink-0" size={20} />
          <Command.Input 
            autoFocus
            placeholder="견적, 수주, 거래처 등을 검색하세요..." 
            className="flex-1 bg-transparent border-none outline-none text-text-primary placeholder:text-text-secondary min-w-0"
          />
          <button onClick={closeSearch} className="text-text-secondary hover:text-text-primary p-1 rounded-md hover:bg-bg-overlay transition-colors">
            <X size={16} />
          </button>
        </div>

        <Command.List className="max-h-[60vh] overflow-y-auto p-2 scrollbar-thin">
          <Command.Empty className="p-8 text-center text-text-secondary">검색 결과가 없습니다.</Command.Empty>

          <Command.Group heading="견적서" className="px-2 py-1 text-xs text-text-secondary mb-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold">
            {MOCK_DATA.estimates.map((est) => (
              <Command.Item 
                key={est.id} 
                value={est.title}
                onSelect={() => {
                  navigate(`/estimates/${est.id}`);
                  closeSearch();
                }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-brand-500/10 hover:text-brand-500 aria-selected:bg-brand-500/10 aria-selected:text-brand-500 transition-colors text-sm"
              >
                <FileText size={16} />
                <div className="flex flex-col">
                  <span className="font-medium">{est.title}</span>
                  <span className="text-xs opacity-70">{est.id}</span>
                </div>
              </Command.Item>
            ))}
          </Command.Group>

          <Command.Group heading="수주" className="px-2 py-1 text-xs text-text-secondary mb-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold">
            {MOCK_DATA.orders.map((ord) => (
              <Command.Item 
                key={ord.id}
                value={ord.title}
                onSelect={() => {
                  navigate(`/orders`);
                  closeSearch();
                }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-brand-500/10 hover:text-brand-500 aria-selected:bg-brand-500/10 aria-selected:text-brand-500 transition-colors text-sm"
              >
                <ShoppingCart size={16} />
                <div className="flex flex-col">
                  <span className="font-medium">{ord.title}</span>
                  <span className="text-xs opacity-70">{ord.id}</span>
                </div>
              </Command.Item>
            ))}
          </Command.Group>

          <Command.Group heading="거래처" className="px-2 py-1 text-xs text-text-secondary mb-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold">
            {MOCK_DATA.clients.map((client) => (
              <Command.Item 
                key={client.id}
                value={client.name}
                onSelect={() => {
                  navigate(`/partners/${client.id}`);
                  closeSearch();
                }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-brand-500/10 hover:text-brand-500 aria-selected:bg-brand-500/10 aria-selected:text-brand-500 transition-colors text-sm"
              >
                <Users size={16} />
                <div className="flex flex-col">
                  <span className="font-medium">{client.name}</span>
                  <span className="text-xs opacity-70">{client.id}</span>
                </div>
              </Command.Item>
            ))}
          </Command.Group>
        </Command.List>
      </Command>
    </div>
  );
};
