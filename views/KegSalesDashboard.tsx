
import React, { useState, useMemo } from 'react';
import { AppState, Keg, KegMovement, KegStatus, KegSale } from '../types';
import { BRAND_COLORS } from '../constants';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, LineChart, Line, Cell, Legend, AreaChart, Area
} from 'recharts';
import { formatCurrency } from '../src/utils/format';
import { getBrandColor } from '../src/utils/colors';

interface KegSalesDashboardProps {
  state: AppState;
  onAdd?: () => void;
  onEdit?: (sale: KegSale) => void;
  onDelete?: (id: string) => void;
  onUpdateKeg?: (id: string, updates: Partial<Keg>) => void;
  onRegisterLoss?: (kegId: string, liters: number, description: string) => void;
  onDeleteKeg?: (id: string) => void;
  onTransferKeg?: (id: string, liters: number, destination: string) => void;
  onEditKeg?: (keg: Keg) => void;
  onConfirmRequest?: (message: string) => Promise<boolean>;
  onBulkDelete?: (ids: string[]) => void;
  onBulkUpdate?: (ids: string[], updates: Partial<Keg>) => void;
  onBulkTransfer?: (ids: string[], destination: string) => void;
  onBulkRegisterLoss?: (items: { id: string, liters: number }[]) => void;
}

const KegSalesDashboard: React.FC<KegSalesDashboardProps> = ({
  state, onAdd, onEdit, onDelete, onUpdateKeg, onRegisterLoss, onDeleteKeg, onTransferKeg, onEditKeg, onConfirmRequest,
  onBulkDelete, onBulkUpdate, onBulkTransfer, onBulkRegisterLoss
}) => {
  const [selectedBrand, setSelectedBrand] = useState<string>('Todos');
  const [activeTab, setActiveTab] = useState<'inventory' | 'history' | 'analysis'>('inventory');
  const [selectedKegIds, setSelectedKegIds] = useState<string[]>([]);

  // Estados para Filtro
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [filterSearch, setFilterSearch] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<KegStatus | 'Todos'>('Todos');

  // Filtros de Marcas
  const brands = useMemo(() => ['Todos', ...Array.from(new Set(state.kegBrands.map(b => b.name)))], [state.kegBrands]);

  // Função para limpar filtros
  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setSelectedBrand('Todos');
    setFilterSearch('');
    setFilterStatus('Todos');
  };

  // Função auxiliar para filtrar por intervalo de datas
  const isWithinPeriod = (dateString: string) => {
    if (!startDate && !endDate) return true; // Se não houver datas, mostrar tudo

    const date = new Date(dateString);
    date.setHours(0, 0, 0, 0);

    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      if (date < start) return false;
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      if (date > end) return false;
    }

    return true;
  };

  const filteredKegs = useMemo(() => {
    let result = state.kegs;
    if (selectedBrand !== 'Todos') result = result.filter(k => k.brand === selectedBrand);
    if (filterStatus !== 'Todos') result = result.filter(k => k.status === filterStatus);
    if (filterSearch) {
      const s = filterSearch.toLowerCase();
      result = result.filter(k => k.code.toLowerCase().includes(s) || k.brand.toLowerCase().includes(s));
    }
    result = result.filter(k => isWithinPeriod(k.purchaseDate));
    return result;
  }, [state.kegs, selectedBrand, filterStatus, filterSearch, startDate, endDate]);

  // Bulk Selection Handlers
  const toggleSelectKeg = (id: string) => {
    setSelectedKegIds(prev =>
      prev.includes(id) ? prev.filter(kId => kId !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedKegIds.length === filteredKegs.length) {
      setSelectedKegIds([]);
    } else {
      setSelectedKegIds(filteredKegs.map(k => k.id));
    }
  };

  const selectedKegs = useMemo(() =>
    state.kegs.filter(k => selectedKegIds.includes(k.id)),
    [state.kegs, selectedKegIds]
  );

  const filteredMovements = useMemo(() => {
    let result = state.kegMovements;

    // Brand filter
    if (selectedBrand !== 'Todos') {
      result = result.filter(m => {
        const keg = state.kegs.find(k => k.id === m.kegId);
        return keg?.brand === selectedBrand;
      });
    }

    // Status filter
    if (filterStatus !== 'Todos') {
      result = result.filter(m => {
        const keg = state.kegs.find(k => k.id === m.kegId);
        return keg?.status === filterStatus;
      });
    }

    // Search filter
    if (filterSearch) {
      const s = filterSearch.toLowerCase();
      result = result.filter(m => {
        const keg = state.kegs.find(k => k.id === m.kegId);
        return m.description.toLowerCase().includes(s) || (keg?.code.toLowerCase().includes(s) || keg?.brand.toLowerCase().includes(s));
      });
    }

    // Time filter
    result = result.filter(m => isWithinPeriod(m.date));

    return result;
  }, [state.kegMovements, state.kegs, selectedBrand, filterStatus, filterSearch, startDate, endDate]);

  // --- Processamento de Dados para Gráficos ---

  const salesVsLossData = useMemo(() => {
    const data: Record<string, { name: string, Vendas: number, Perdas: number }> = {};
    filteredMovements.forEach(m => {
      const keg = state.kegs.find(k => k.id === m.kegId);
      const code = keg?.code || 'Desconhecido';
      if (!data[code]) data[code] = { name: code, Vendas: 0, Perdas: 0 };
      if (m.type === 'Venda') data[code].Vendas += m.liters;
      if (m.type === 'Perda') data[code].Perdas += m.liters;
    });
    // Ordena pelo volume total e mostra os top 15 para manter o gráfico legível
    return Object.values(data)
      .sort((a, b) => (b.Vendas + b.Perdas) - (a.Vendas + a.Perdas))
      .slice(0, 15);
  }, [filteredMovements, state.kegs]);

  const salesEvolutionData = useMemo(() => {
    const daily: Record<string, number> = {};
    const movements = filteredMovements
      .filter(m => m.type === 'Venda')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    movements.forEach(m => {
      const date = new Date(m.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      daily[date] = (daily[date] || 0) + m.liters;
    });

    return Object.entries(daily).map(([date, litros]) => ({ date, litros: litros }));
  }, [filteredMovements]);

  const monthlySalesData = useMemo(() => {
    const months: Record<string, { litros: number, kegs: Set<string> }> = {};
    const movements = filteredMovements.filter(m => m.type === 'Venda');

    movements.forEach(m => {
      const date = new Date(m.date);
      const monthYear = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      if (!months[monthYear]) {
        months[monthYear] = { litros: 0, kegs: new Set() };
      }
      months[monthYear].litros += m.liters;
      months[monthYear].kegs.add(m.kegId);
    });

    return Object.entries(months).map(([month, stats]) => ({
      month,
      litros: Math.round(stats.litros),
      barris: stats.kegs.size
    }));
  }, [filteredMovements]);

  const kpis = useMemo(() => {
    const totalComprado = filteredKegs.reduce((acc, k) => acc + k.capacity, 0);
    const totalVendido = filteredMovements.filter(m => m.type === 'Venda').reduce((acc, m) => acc + m.liters, 0);
    const totalPerdido = filteredMovements.filter(m => m.type === 'Perda').reduce((acc, m) => acc + m.liters, 0);
    const totalRestante = filteredKegs.reduce((acc, k) => acc + k.currentLiters, 0);

    return { totalComprado, totalVendido, totalPerdido, totalRestante };
  }, [filteredKegs, filteredMovements]);

  const handleActivate = async (keg: Keg) => {
    const confirmed = onConfirmRequest
      ? await onConfirmRequest(`Deseja ATIVAR este barril de ${keg.brand} agora?`)
      : confirm(`Deseja ATIVAR este barril de ${keg.brand} agora?`);

    if (confirmed && onUpdateKeg) {
      onUpdateKeg(keg.id, {
        status: 'Ativo',
        activationDate: new Date().toISOString()
      });
    }
  };

  const handleRegisterLoss = async (keg: Keg) => {
    const confirmed = onConfirmRequest
      ? await onConfirmRequest(`Deseja marcar este barril como ESTRAGADO? Os ${keg.currentLiters.toFixed(1)}L restantes serão registados como PERDA no sistema.`)
      : confirm(`Deseja marcar este barril como ESTRAGADO? Os ${keg.currentLiters.toFixed(1)}L restantes serão registados como PERDA no sistema.`);

    if (confirmed && onRegisterLoss) {
      onRegisterLoss(keg.id, keg.currentLiters, `Perda manual: Barril estragado (${keg.brand})`);
    }
  };

  const handleTransfer = async (keg: Keg) => {
    const destination = prompt("Para qual restaurante/entidade deseja transferir/emprestar este barril?");
    if (!destination) return;

    const confirmed = onConfirmRequest
      ? await onConfirmRequest(`Deseja confirmar a TRANSFERÊNCIA deste barril de ${keg.brand} para ${destination}? O saldo de ${keg.currentLiters.toFixed(1)}L sairá do estoque.`)
      : confirm(`Deseja confirmar a TRANSFERÊNCIA deste barril de ${keg.brand} para ${destination}? O saldo de ${keg.currentLiters.toFixed(1)}L sairá do estoque.`);

    if (confirmed && onTransferKeg) {
      onTransferKeg(keg.id, keg.currentLiters, destination);
    }
  };

  const handleBulkActivate = async () => {
    const activeable = selectedKegs.filter(k => k.status === 'Novo');
    if (activeable.length === 0) return;

    const confirmed = onConfirmRequest
      ? await onConfirmRequest(`Deseja ATIVAR ${activeable.length} barris selecionados?`)
      : confirm(`Deseja ATIVAR ${activeable.length} barris selecionados?`);

    if (confirmed) {
      if (onBulkUpdate) {
        onBulkUpdate(activeable.map(k => k.id), {
          status: 'Ativo',
          activationDate: new Date().toISOString()
        });
      } else if (onUpdateKeg) {
        for (const k of activeable) {
          await onUpdateKeg(k.id, { status: 'Ativo', activationDate: new Date().toISOString() });
        }
      }
      setSelectedKegIds([]);
    }
  };

  const handleBulkDelete = async () => {
    const confirmed = onConfirmRequest
      ? await onConfirmRequest(`Tem certeza que deseja APAGAR ${selectedKegIds.length} barris selecionados? Esta ação não pode ser desfeita.`)
      : confirm(`Tem certeza que deseja APAGAR ${selectedKegIds.length} barris selecionados? Esta ação não pode ser desfeita.`);

    if (confirmed) {
      if (onBulkDelete) {
        onBulkDelete(selectedKegIds);
      } else if (onDeleteKeg) {
        for (const id of selectedKegIds) {
          await onDeleteKeg(id);
        }
      }
      setSelectedKegIds([]);
    }
  };

  const handleBulkTransfer = async () => {
    const transferable = selectedKegs.filter(k => k.status === 'Novo' || k.status === 'Ativo');
    if (transferable.length === 0) return;

    const destination = prompt(`Para qual destino deseja transferir os ${transferable.length} barris?`);
    if (!destination) return;

    const confirmed = onConfirmRequest
      ? await onConfirmRequest(`Confirma a transferência de ${transferable.length} barris para ${destination}?`)
      : confirm(`Confirma a transferência de ${transferable.length} barris para ${destination}?`);

    if (confirmed) {
      if (onBulkTransfer) {
        onBulkTransfer(transferable.map(k => k.id), destination);
      } else if (onTransferKeg) {
        for (const k of transferable) {
          await onTransferKeg(k.id, k.currentLiters, destination);
        }
      }
      setSelectedKegIds([]);
    }
  };

  const handleBulkLoss = async () => {
    const lossable = selectedKegs.filter(k => k.status === 'Novo' || k.status === 'Ativo');
    if (lossable.length === 0) return;

    const confirmed = onConfirmRequest
      ? await onConfirmRequest(`Deseja marcar ${lossable.length} barris como ESTRAGADOS? Todo o volume restante será registado como PERDA.`)
      : confirm(`Deseja marcar ${lossable.length} barris como ESTRAGADOS? Todo o volume restante será registado como PERDA.`);

    if (confirmed) {
      if (onBulkRegisterLoss) {
        onBulkRegisterLoss(lossable.map(k => ({ id: k.id, liters: k.currentLiters })));
      } else if (onRegisterLoss) {
        for (const k of lossable) {
          await onRegisterLoss(k.id, k.currentLiters, `Perda em massa: Barril estragado (${k.brand})`);
        }
      }
      setSelectedKegIds([]);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Data', 'Marca', 'Código Barril', 'Tipo Movimento', 'Litros', 'Descrição'];
    const rows = filteredMovements.map(m => {
      const keg = state.kegs.find(k => k.id === m.kegId);
      return [
        new Date(m.date).toLocaleDateString('pt-BR'),
        keg?.brand || 'N/A',
        keg?.code || 'N/A',
        m.type,
        m.liters.toString().replace('.', ','),
        m.description
      ];
    });

    const csvContent = [headers, ...rows].map(e => e.join(";")).join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `relatorio_barris_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500 pb-20">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Gestão de Inventário de Barris</h2>
          <p className="text-slate-500 font-medium italic">Análise detalhada de consumo, fluxo e perdas de estoque.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="h-12 px-4 rounded-xl border-2 border-slate-200 text-slate-400 font-black flex items-center gap-2 hover:bg-slate-50 transition-all uppercase text-[10px] tracking-widest"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            Exportar
          </button>

          {onAdd && (
            <button onClick={onAdd} className="bg-primary text-white h-12 px-6 rounded-xl text-xs font-black hover:bg-primary-hover flex items-center gap-2 shadow-lg shadow-primary/20 transition-all uppercase tracking-widest">
              <span className="material-symbols-outlined text-[18px]">add_box</span>
              Novo
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricBox label="Litros Comprados" value={`${kpis.totalComprado.toFixed(1)}L`} icon="inventory_2" color="blue" />
        <MetricBox label="Litros Vendidos" value={`${kpis.totalVendido.toFixed(1)}L`} icon="point_of_sale" color="emerald" />
        <MetricBox label="Litros Perdidos" value={`${kpis.totalPerdido.toFixed(1)}L`} icon="report_problem" color="rose" />
        <MetricBox label="Saldo Restante" value={`${kpis.totalRestante.toFixed(1)}L`} icon="propane_tank" color="orange" />
      </div>

      {/* Global Filter Bar for Kegs */}
      <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm flex flex-col gap-4">
        <div className="flex items-center gap-2 px-1">
          <span className={`material-symbols-outlined ${(filterSearch || selectedBrand !== 'Todos' || filterStatus !== 'Todos' || startDate || endDate) ? 'text-primary' : 'text-slate-400'}`}>filter_list</span>
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filtros de Auditoria</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative group">
            <span className={`material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] transition-colors ${filterSearch ? 'text-primary' : 'text-slate-400 group-focus-within:text-primary'}`}>search</span>
            <input
              type="text"
              placeholder="Código ou marca..."
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 border rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all ${filterSearch ? 'border-primary text-primary bg-primary/5' : 'bg-slate-50 border-slate-100 text-slate-600 focus:bg-white'}`}
            />
          </div>

          {/* Brand Filter */}
          <div className="relative">
            <span className={`material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] ${selectedBrand !== 'Todos' ? 'text-primary' : 'text-slate-400'}`}>workspace_premium</span>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className={`w-full pl-10 pr-10 py-2 border rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer ${selectedBrand !== 'Todos' ? 'border-primary text-primary bg-primary/5' : 'bg-slate-50 border-slate-100 text-slate-600 focus:bg-white'}`}
            >
              {brands.map(b => <option key={b} value={b}>{b === 'Todos' ? 'Todas Marcas' : b}</option>)}
            </select>
            <span className={`material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[16px] pointer-events-none ${selectedBrand !== 'Todos' ? 'text-primary' : 'text-slate-400'}`}>expand_more</span>
          </div>

          {/* Status Filter */}
          <div className="relative">
            <span className={`material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] ${filterStatus !== 'Todos' ? 'text-primary' : 'text-slate-400'}`}>info</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className={`w-full pl-10 pr-10 py-2 border rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer ${filterStatus !== 'Todos' ? 'border-primary text-primary bg-primary/5' : 'bg-slate-50 border-slate-100 text-slate-600 focus:bg-white'}`}
            >
              <option value="Todos">Todos Status</option>
              <option value="Novo">Novo</option>
              <option value="Ativo">Ativo</option>
              <option value="Esgotado">Esgotado</option>
              <option value="Transferido">Transferido</option>
              <option value="Estragado">Estragado</option>
            </select>
            <span className={`material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[16px] pointer-events-none ${filterStatus !== 'Todos' ? 'text-primary' : 'text-slate-400'}`}>expand_more</span>
          </div>

          {/* Date Range Start */}
          <div className="relative group">
            <span className={`material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] transition-colors ${startDate ? 'text-primary' : 'text-slate-400'}`}>calendar_today</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 border rounded-xl text-[10px] font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all ${startDate ? 'border-primary text-primary bg-primary/5' : 'bg-slate-50 border-slate-100 text-slate-600 focus:bg-white'}`}
            />
          </div>

          {/* Date Range End */}
          <div className="relative group flex gap-2">
            <div className="relative flex-1">
              <span className={`material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] transition-colors ${endDate ? 'text-primary' : 'text-slate-400'}`}>event_available</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 border rounded-xl text-[10px] font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all ${endDate ? 'border-primary text-primary bg-primary/5' : 'bg-slate-50 border-slate-100 text-slate-600 focus:bg-white'}`}
              />
            </div>

            {(startDate || endDate || selectedBrand !== 'Todos' || filterStatus !== 'Todos' || filterSearch) && (
              <button
                onClick={clearFilters}
                className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors shrink-0 animate-in fade-in zoom-in duration-300"
                title="Limpar Filtros"
              >
                <span className="material-symbols-outlined text-[20px]">filter_alt_off</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-8">
        {[
          { id: 'inventory', label: 'Inventário Atual', icon: 'list_alt' },
          { id: 'analysis', label: 'Análise de Dados', icon: 'analytics' },
          { id: 'history', label: 'Histórico de Movimentos', icon: 'history' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-4 text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === tab.id ? 'border-b-4 border-primary text-primary' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'inventory' && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b">
              <tr>
                <th className="px-6 py-5 w-10">
                  <div className="flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={filteredKegs.length > 0 && selectedKegIds.length === filteredKegs.length}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                    />
                  </div>
                </th>
                <th className="px-6 py-5">Código</th>
                <th className="px-8 py-5">Marca</th>
                <th className="px-8 py-5">Capacidade</th>
                <th className="px-8 py-5">Saldo Atual</th>
                <th className="px-8 py-5">Status</th>
                <th className="px-8 py-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y font-bold text-xs">
              {filteredKegs.map(keg => (
                <tr
                  key={keg.id}
                  className={`hover:bg-slate-50 transition-colors ${selectedKegIds.includes(keg.id) ? 'bg-primary/5' : ''}`}
                  onClick={() => toggleSelectKeg(keg.id)}
                >
                  <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={selectedKegIds.includes(keg.id)}
                        onChange={() => toggleSelectKeg(keg.id)}
                        className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-slate-500">{keg.code}</td>
                  <td className="px-8 py-4 uppercase text-slate-900">{keg.brand}</td>
                  <td className="px-8 py-4 text-slate-400">{keg.capacity}L</td>
                  <td className="px-8 py-4">
                    <div className="flex flex-col gap-1 w-32">
                      <div className="flex justify-between text-[9px] mb-1">
                        <span>{keg.currentLiters.toFixed(1)}L</span>
                        <span>{Math.round((keg.currentLiters / keg.capacity) * 100)}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${keg.currentLiters < 10 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                          style={{ width: `${(keg.currentLiters / keg.capacity) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-4">
                    <span className={`px-3 py-1 rounded-full text-[9px] uppercase tracking-tighter ${keg.status === 'Novo' ? 'bg-blue-100 text-blue-700' :
                      keg.status === 'Ativo' ? 'bg-emerald-100 text-emerald-700 shadow-sm shadow-emerald-100 animate-pulse' :
                        keg.status === 'Transferido' ? 'bg-purple-100 text-purple-700' :
                          keg.status === 'Esgotado' ? 'bg-slate-100 text-slate-500' :
                            'bg-rose-100 text-rose-700'
                      }`}>
                      {keg.status}
                    </span>
                  </td>
                  <td className="px-8 py-4 text-right">
                    <div className="flex justify-end gap-1">
                      {onEditKeg && (
                        <button onClick={() => onEditKeg(keg)} className="p-2 hover:bg-slate-100 text-slate-400 rounded-lg transition-all" title="Editar Barril">
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                      )}
                      {keg.status === 'Novo' && (
                        <button onClick={() => handleActivate(keg)} className="p-2 hover:bg-emerald-50 text-emerald-600 rounded-lg transition-all" title="Ativar Barril">
                          <span className="material-symbols-outlined text-[18px]">play_circle</span>
                        </button>
                      )}
                      {(keg.status === 'Ativo' || keg.status === 'Novo') && (
                        <>
                          <button onClick={() => handleRegisterLoss(keg)} className="p-2 hover:bg-rose-50 text-rose-600 rounded-lg transition-all" title="Registar Perda">
                            <span className="material-symbols-outlined text-[18px]">report_problem</span>
                          </button>
                          <button onClick={() => handleTransfer(keg)} className="p-2 hover:bg-purple-50 text-purple-600 rounded-lg transition-all" title="Transferir/Emprestar">
                            <span className="material-symbols-outlined text-[18px]">move_up</span>
                          </button>
                        </>
                      )}
                      {onDeleteKeg && (
                        <button onClick={() => {
                          if (confirm(`Tem certeza que deseja apagar o barril ${keg.code}?`)) onDeleteKeg(keg.id);
                        }} className="p-2 hover:bg-rose-100 text-rose-400 rounded-lg transition-all" title="Apagar Registo">
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredKegs.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-8 py-20 text-center text-slate-400 italic">Nenhum barril encontrado no intervalo selecionado.</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Bulk Action Bar */}
          {selectedKegIds.length > 0 && (
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-10 duration-500">
              <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-2xl flex items-center gap-8 border border-slate-800">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Selecionados</span>
                  <span className="text-xl font-black">{selectedKegIds.length} <span className="text-xs text-slate-400">Barril(s)</span></span>
                </div>

                <div className="h-8 w-px bg-slate-800"></div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleBulkActivate(); }}
                    className="flex flex-col items-center gap-1 px-4 py-2 hover:bg-slate-800 rounded-xl transition-all group"
                  >
                    <span className="material-symbols-outlined text-[20px] text-emerald-400 group-hover:scale-110">play_circle</span>
                    <span className="text-[9px] font-bold uppercase tracking-widest">Ativar</span>
                  </button>

                  <button
                    onClick={(e) => { e.stopPropagation(); handleBulkTransfer(); }}
                    className="flex flex-col items-center gap-1 px-4 py-2 hover:bg-slate-800 rounded-xl transition-all group"
                  >
                    <span className="material-symbols-outlined text-[20px] text-purple-400 group-hover:scale-110">move_up</span>
                    <span className="text-[9px] font-bold uppercase tracking-widest">Transferir</span>
                  </button>

                  <button
                    onClick={(e) => { e.stopPropagation(); handleBulkLoss(); }}
                    className="flex flex-col items-center gap-1 px-4 py-2 hover:bg-slate-800 rounded-xl transition-all group"
                  >
                    <span className="material-symbols-outlined text-[20px] text-rose-400 group-hover:scale-110">report_problem</span>
                    <span className="text-[9px] font-bold uppercase tracking-widest">Perda</span>
                  </button>

                  <button
                    onClick={(e) => { e.stopPropagation(); handleBulkDelete(); }}
                    className="flex flex-col items-center gap-1 px-4 py-2 hover:bg-slate-800 rounded-xl transition-all group"
                  >
                    <span className="material-symbols-outlined text-[20px] text-slate-400 group-hover:text-rose-500 transition-colors group-hover:scale-110">delete</span>
                    <span className="text-[9px] font-bold uppercase tracking-widest">Apagar</span>
                  </button>
                </div>

                <div className="h-8 w-px bg-slate-800"></div>

                <button
                  onClick={(e) => { e.stopPropagation(); setSelectedKegIds([]); }}
                  className="p-2 hover:bg-slate-800 rounded-lg transition-all"
                  title="Desmarcar Todos"
                >
                  <span className="material-symbols-outlined text-[20px] text-slate-500">close</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'analysis' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in zoom-in-95 duration-500">

          <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm h-[450px] flex flex-col">
            <h4 className="text-[10px] font-black text-slate-400 mb-8 uppercase tracking-[0.2em]">Volume por Código/Lote: Vendas vs Perdas (L)</h4>
            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesVsLossData}>
                  <defs>
                    <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                      <stop offset="100%" stopColor="#065f46" stopOpacity={1} />
                    </linearGradient>
                    <linearGradient id="redGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity={1} />
                      <stop offset="100%" stopColor="#991b1b" stopOpacity={1} />
                    </linearGradient>
                    <filter id="shadowSimple" height="130%">
                      <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
                      <feOffset dx="0" dy="2" result="offsetblur" />
                      <feComponentTransfer><feFuncA type="linear" slope="0.2" /></feComponentTransfer>
                      <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" opacity={0.5} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <Tooltip cursor={{ fill: '#f8fafc', opacity: 0.5 }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                  <Legend iconType="circle" />
                  <Bar dataKey="Vendas" fill="url(#greenGradient)" radius={[4, 4, 0, 0]} barSize={20} style={{ filter: 'url(#shadowSimple)' }} />
                  <Bar dataKey="Perdas" fill="url(#redGradient)" radius={[4, 4, 0, 0]} barSize={20} style={{ filter: 'url(#shadowSimple)' }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm h-[450px] flex flex-col">
            <h4 className="text-[10px] font-black text-slate-400 mb-8 uppercase tracking-[0.2em]">Evolução Diária de Consumo (L)</h4>
            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesEvolutionData}>
                  <defs>
                    <filter id="lineShadow" height="200%">
                      <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
                      <feOffset dx="0" dy="4" result="offsetblur" />
                      <feComponentTransfer><feFuncA type="linear" slope="0.3" /></feComponentTransfer>
                      <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" opacity={0.5} />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontStyle: 'italic', fill: '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                  <Line
                    type="monotone"
                    dataKey="litros"
                    stroke="#0ea5e9"
                    strokeWidth={4}
                    dot={{ r: 4, fill: '#0ea5e9', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 8, strokeWidth: 0 }}
                    style={{ filter: 'url(#lineShadow)' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-2 bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm h-[400px] flex flex-col">
            <h4 className="text-[10px] font-black text-slate-400 mb-8 uppercase tracking-[0.2em]">Histórico de Vendas Mensais (Litros Totais)</h4>
            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlySalesData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity={1} />
                      <stop offset="100%" stopColor="#991b1b" stopOpacity={1} />
                    </linearGradient>
                    <filter id="shadow" height="130%">
                      <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
                      <feOffset dx="0" dy="4" result="offsetblur" />
                      <feComponentTransfer>
                        <feFuncA type="linear" slope="0.3" />
                      </feComponentTransfer>
                      <feMerge>
                        <feMergeNode />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" opacity={0.5} />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fontWeight: '500', fill: '#64748b' }}
                    dy={10}
                  />
                  <YAxis hide domain={[0, 'dataMax + 2']} />
                  <Tooltip
                    cursor={{ fill: '#f8fafc', opacity: 0.4 }}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  />
                  <Bar
                    dataKey="barris"
                    fill="url(#barGradient)"
                    radius={[4, 4, 0, 0]}
                    barSize={60}
                    label={{
                      position: 'center',
                      fill: '#fff',
                      fontSize: 18,
                      fontWeight: '900',
                      formatter: (value: any) => value > 0 ? value : ''
                    }}
                    style={{ filter: 'url(#shadow)' }}
                  />
                </BarChart>


              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          {filteredMovements.length === 0 ? (
            <div className="p-20 text-slate-400 italic text-center">Nenhum movimento registado para este período/marca.</div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b">
                <tr>
                  <th className="px-8 py-5">Data</th>
                  <th className="px-8 py-5">Barril (Código)</th>
                  <th className="px-8 py-5">Tipo</th>
                  <th className="px-8 py-5">Volume</th>
                  <th className="px-8 py-5">Descrição</th>
                </tr>
              </thead>
              <tbody className="divide-y font-bold text-xs text-slate-700">
                {filteredMovements.map(m => {
                  const keg = state.kegs.find(k => k.id === m.kegId);
                  return (
                    <tr key={m.id}>
                      <td className="px-8 py-4 text-slate-400">{new Date(m.date).toLocaleDateString('pt-BR')}</td>
                      <td className="px-8 py-4 font-mono">{keg?.code || '???'}</td>
                      <td className="px-8 py-4">
                        <span className={`px-2 py-1 rounded text-[9px] uppercase ${m.type === 'Venda' ? 'bg-emerald-50 text-emerald-600' :
                          m.type === 'Perda' ? 'bg-rose-50 text-rose-600' :
                            'bg-purple-50 text-purple-600'
                          }`}>
                          {m.type}
                        </span>
                      </td>
                      <td className="px-8 py-4">{m.liters.toFixed(1)}L</td>
                      <td className="px-8 py-4 text-[10px] font-medium italic text-slate-400">{m.description}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

    </div>
  );
};

const MetricBox = ({ label, value, icon, color }: any) => {
  const colorMap: any = {
    blue: 'bg-blue-50 text-blue-600',
    orange: 'bg-orange-50 text-orange-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    rose: 'bg-rose-50 text-rose-600'
  };
  return (
    <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 flex flex-col gap-6 relative overflow-hidden group">
      <div className={`p-3 w-fit rounded-2xl ${colorMap[color]} group-hover:scale-110 transition-transform`}>
        <span className="material-symbols-outlined text-[24px]">{icon}</span>
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <h3 className="text-3xl font-black text-slate-900 tracking-tight">{value}</h3>
      </div>
    </div>
  );
};

export default KegSalesDashboard;
