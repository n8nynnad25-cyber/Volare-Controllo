
import React from 'react';
import { ViewType } from '../types';

interface HeaderProps {
  view: ViewType;
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ view, onMenuClick }) => {
  const getTitle = () => {
    switch (view) {
      case 'dashboard': return 'Análise';
      case 'cash-fund': return 'Fundo de Caixa';
      case 'cash-fund-new': return 'Novo Registo de Caixa';
      case 'mileage': return 'Dashboard de Quilometragem';
      case 'mileage-new': return 'Registo de Quilometragem';
      case 'keg-sales': return 'Controlo de Venda de Barris';
      case 'keg-sales-new': return 'Registo Venda de Barris';
      default: return 'Volare';
    }
  };

  const getSubtitle = () => {
    switch (view) {
      case 'dashboard': return 'Visão geral financeira e operacional do sistema.';
      case 'cash-fund': return 'Visão geral das movimentações financeiras.';
      case 'mileage': return 'Visão geral de eficiência, custos e consumo da frota.';
      case 'keg-sales': return 'Visão geral operacional e financeira de barris.';
      default: return 'Gestão e Operação';
    }
  };

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 bg-white px-4 md:px-8 py-4 md:py-6 shadow-sm border-b border-slate-100 z-10 shrink-0 sticky top-0 md:relative">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg md:hidden transition-colors"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
        <div className="flex flex-col">
          <h2 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 line-clamp-1">{getTitle()}</h2>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5 line-clamp-1 hidden sm:block">{getSubtitle()}</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button className="flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200 transition-colors">
          <span className="material-symbols-outlined text-[20px]">calendar_today</span>
          <span className="capitalize">{new Date().toLocaleDateString('pt-pt', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </button>
        <button className="relative rounded-full bg-slate-100 p-2.5 text-slate-600 hover:bg-slate-200 transition-colors">
          <span className="material-symbols-outlined">notifications</span>
          <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-primary border-2 border-white"></span>
        </button>
      </div>
    </header>
  );
};

export default Header;
