
import React from 'react';
import { ViewType, User } from '../types';

interface SidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  user: User;
  onLogout: () => void | Promise<void>;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange, user, onLogout }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Análise', icon: 'dashboard' },
    { id: 'cash-fund', label: 'Fundo de Caixa', icon: 'account_balance_wallet' },
    { id: 'mileage', label: 'Quilometragem', icon: 'speed' },
    { id: 'keg-sales', label: 'Venda de Barris', icon: 'propane_tank' },
  ];

  return (
    <aside className="hidden md:flex w-64 flex-col bg-sidebar text-white transition-all duration-300 shrink-0 border-r border-white/5">
      <div className="flex items-center gap-3 px-6 py-8">
        <div className="flex items-center justify-center rounded-lg bg-primary/20 p-2 text-primary">
          <span className="material-symbols-outlined text-white" style={{ fontSize: '32px' }}>rocket_launch</span>
        </div>
        <div className="flex flex-col">
          <h1 className="text-xl font-bold tracking-tight text-white">Volare</h1>
          <p className="text-xs text-sidebar-text font-medium">Gestão & Operação</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id as ViewType)}
            className={`w-full group flex items-center gap-3 rounded-lg px-3 py-3 transition-all ${currentView.startsWith(item.id)
              ? 'bg-primary text-white shadow-md'
              : 'text-sidebar-text hover:bg-white/5 hover:text-white'
              }`}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span className="text-sm font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="border-t border-white/10 px-4 py-4 space-y-1">
        <button
          onClick={() => onViewChange('settings')}
          className={`w-full group flex items-center gap-3 rounded-lg px-3 py-3 transition-all ${currentView === 'settings'
            ? 'bg-primary text-white shadow-md'
            : 'text-sidebar-text hover:bg-white/5 hover:text-white'
            }`}
        >
          <span className="material-symbols-outlined">settings</span>
          <span className="text-sm font-medium">Configurações</span>
        </button>

        <div className="mt-4 flex flex-col gap-2 rounded-xl bg-white/5 p-4 border border-white/5">
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 overflow-hidden rounded-full bg-gray-500 bg-cover bg-center border-2 border-primary shrink-0"
              style={{ backgroundImage: `url('${user.avatar}')` }}
            />
            <div className="flex flex-col overflow-hidden">
              <span className="truncate text-sm font-bold text-white">{user.name}</span>
              <span className="truncate text-xs text-sidebar-text">{user.role}</span>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="mt-2 flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-white/5 hover:bg-rose-500/20 text-rose-400 text-xs font-bold transition-all border border-rose-500/10"
          >
            <span className="material-symbols-outlined text-[16px]">logout</span>
            Sair do Sistema
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
