
import React, { useState, useMemo } from 'react';
import { AppState, CashTransaction } from '../types';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Legend, CartesianGrid, PieChart, Pie, Cell
} from 'recharts';
import { formatCurrency } from '../src/utils/format';
import { exportToCSV } from '../src/utils/csvExport';

interface CashFundDashboardProps {
  state: AppState;
  onAdd?: () => void; // Opcional para controle de permissão
  onEdit?: (tx: CashTransaction) => void;
  onDelete?: (id: string) => void;
  onConfirmRequest?: (message: string) => Promise<boolean>;
}

const CashFundDashboard: React.FC<CashFundDashboardProps> = ({ state, onAdd, onEdit, onDelete, onConfirmRequest }) => {
  // Filtros
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [filterManager, setFilterManager] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterVD, setFilterVD] = useState<string>('all');
  const [filterSearch, setFilterSearch] = useState<string>('');

  const filteredTransactions = useMemo(() => {
    return state.cashTransactions.filter(tx => {
      // Filtro de Data
      if (startDate || endDate) {
        const txDate = new Date(tx.date);
        txDate.setHours(0, 0, 0, 0);

        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          if (txDate < start) return false;
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          if (txDate > end) return false;
        }
      }

      // Filtro de Responsável
      if (filterManager && tx.manager !== filterManager) return false;

      // Filtro de Categoria
      if (filterCategory && tx.category !== filterCategory) return false;

      // Filtro de VD
      if (filterVD !== 'all') {
        const isVD = filterVD === 'vd';
        if (tx.isVendaDinheiro !== isVD) return false;
      }

      // Filtro de Busca (Descrição)
      if (filterSearch && !tx.description.toLowerCase().includes(filterSearch.toLowerCase())) return false;

      return true;
    });
  }, [state.cashTransactions, startDate, endDate, filterManager, filterCategory, filterVD, filterSearch]);

  const availableManagers = useMemo(() => {
    return Array.from(new Set(state.cashTransactions.map(tx => tx.manager))).filter(Boolean).sort();
  }, [state.cashTransactions]);

  const availableCategories = useMemo(() => {
    return Array.from(new Set(state.cashTransactions.map(tx => tx.category))).filter(Boolean).sort();
  }, [state.cashTransactions]);

  const handleExportReport = () => {
    const headers = ['Data', 'Tipo', 'Responsável', 'Categoria', 'Descrição', 'Valor (MZN)', 'VD'];
    const rows = filteredTransactions.map(tx => [
      new Date(tx.date).toLocaleDateString('pt-BR'),
      tx.type === 'entrada' ? 'Entrada' : 'Saída',
      tx.manager || 'Não Informado',
      tx.category || 'Não Informado',
      tx.description,
      tx.amount,
      tx.isVendaDinheiro ? 'SIM' : 'NÃO'
    ]);

    exportToCSV('relatorio_fundo_caixa', headers, rows);
  };

  // Global Totals (Filtered)
  const globalEntradas = filteredTransactions.filter(t => t.type === 'entrada').reduce((acc, curr) => acc + Number(curr.amount), 0);
  const globalSaidas = filteredTransactions.filter(t => t.type === 'saida').reduce((acc, curr) => acc + Number(curr.amount), 0);
  const globalSaldo = globalEntradas - globalSaidas;

  // Totals by Manager (Filtered)
  const managerDataMap = filteredTransactions.reduce((acc: any, tx: CashTransaction) => {
    const mgr = tx.manager || 'Não Informado';
    if (!acc[mgr]) {
      acc[mgr] = { name: mgr, entradas: 0, saidas: 0, saldo: 0 };
    }
    if (tx.type === 'entrada') acc[mgr].entradas += Number(tx.amount);
    else acc[mgr].saidas += Number(tx.amount);
    acc[mgr].saldo = acc[mgr].entradas - acc[mgr].saidas;
    return acc;
  }, {});

  const managerList = Object.values(managerDataMap) as any[];

  // Chart Colors
  const COLORS = ['#8a1e1e', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899'];

  return (
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      {/* Header Section */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Fundo de Caixa</h2>
          <p className="text-sm text-slate-500 font-medium italic">Gestão e análise de fluxos financeiros por gestão.</p>
        </div>
        {onAdd && (
          <button onClick={onAdd} className="bg-primary text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-primary-hover flex items-center gap-2 shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 active:scale-95">
            <span className="material-symbols-outlined">add_card</span>
            Novo Movimento
          </button>
        )}
      </div>

      {/* Global Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Entradas Totais" value={globalEntradas} type="up" color="emerald" />
        <StatCard title="Saídas Totais" value={globalSaidas} type="down" color="rose" />
        <StatCard title="Saldo Consolidado" value={globalSaldo} type="wallet" color="blue" isBalance />
      </div>

      {/* Manager Specific Breakdown Section */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <span className="material-symbols-outlined text-primary">groups</span>
          <h3 className="font-bold text-lg text-slate-800 uppercase tracking-wider">Performance por Gerente</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {managerList.map((mgr, idx) => (
            <div key={mgr.name} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="flex justify-between items-start mb-4">
                <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-400 text-xs">
                  {mgr.name.substring(0, 2).toUpperCase()}
                </div>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${mgr.saldo >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                  {mgr.saldo >= 0 ? 'POSITIVO' : 'NEGATIVO'}
                </span>
              </div>
              <h4 className="font-black text-slate-900 truncate mb-4">{mgr.name}</h4>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Entradas:</span>
                  <span className="font-bold text-emerald-600">{formatCurrency(mgr.entradas)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Saídas:</span>
                  <span className="font-bold text-rose-600">{formatCurrency(mgr.saidas)}</span>
                </div>
                <div className="pt-2 border-t border-slate-50 flex justify-between items-baseline">
                  <span className="text-slate-900 font-black">Saldo:</span>
                  <span className={`text-lg font-black ${mgr.saldo >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                    {formatCurrency(mgr.saldo)}
                  </span>
                </div>
              </div>

              {/* Progress bar visual for entries vs exits */}
              <div className="mt-4 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-emerald-500"
                  style={{ width: `${(mgr.entradas / (mgr.entradas + mgr.saidas || 1)) * 100}%` }}
                />
                <div
                  className="h-full bg-rose-500"
                  style={{ width: `${(mgr.saidas / (mgr.entradas + mgr.saidas || 1)) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Comparison Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Comparison Bar Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm h-[400px]">
          <h4 className="text-sm font-black text-slate-800 mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[18px]">bar_chart</span>
            COMPARAÇÃO ENTRADAS VS SAÍDAS
          </h4>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={managerList} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
              <defs>
                <linearGradient id="entryGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                  <stop offset="100%" stopColor="#065f46" stopOpacity={1} />
                </linearGradient>
                <linearGradient id="exitGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={1} />
                  <stop offset="100%" stopColor="#991b1b" stopOpacity={1} />
                </linearGradient>
                <filter id="barShadow" height="130%">
                  <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
                  <feOffset dx="0" dy="2" result="offsetblur" />
                  <feComponentTransfer><feFuncA type="linear" slope="0.2" /></feComponentTransfer>
                  <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" opacity={0.5} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 'bold', fill: '#64748b' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip
                cursor={{ fill: '#f8fafc', opacity: 0.5 }}
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
              />
              <Legend verticalAlign="top" height={36} iconType="circle" />
              <Bar dataKey="entradas" name="Entradas" fill="url(#entryGradient)" radius={[4, 4, 0, 0]} barSize={24} style={{ filter: 'url(#barShadow)' }} />
              <Bar dataKey="saidas" name="Saídas" fill="url(#exitGradient)" radius={[4, 4, 0, 0]} barSize={24} style={{ filter: 'url(#barShadow)' }} />
            </BarChart>
          </ResponsiveContainer>

        </div>

        {/* Expense Distribution Pie Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm h-[400px] flex flex-col">
          <h4 className="text-sm font-black text-slate-800 mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[18px]">pie_chart</span>
            DISTRIBUIÇÃO DE SALDO POR GERENTE
          </h4>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <defs>
                  <filter id="pieShadow" height="130%">
                    <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
                    <feOffset dx="0" dy="4" result="offsetblur" />
                    <feComponentTransfer><feFuncA type="linear" slope="0.3" /></feComponentTransfer>
                    <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                </defs>
                <Pie
                  data={managerList}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={8}
                  dataKey="saldo"
                  style={{ filter: 'url(#pieShadow)' }}
                  stroke="none"
                >
                  {managerList.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                      className="hover:opacity-80 transition-opacity cursor-pointer"
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Legend layout="vertical" align="right" verticalAlign="middle" iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>

        </div>
      </div>

      {/* Transaction Table & Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/10 flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <h3 className="font-black text-lg text-slate-800 uppercase tracking-widest text-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">history</span>
              Histórico Detalhado
            </h3>
            <button
              onClick={handleExportReport}
              className="text-primary text-[10px] font-black flex items-center gap-1.5 px-3 py-1.5 bg-primary/5 rounded-full hover:bg-primary/10 transition-colors uppercase"
            >
              <span className="material-symbols-outlined text-[14px]">download</span>
              Exportar CSV
            </button>
          </div>

          {/* New Modern Filter Bar */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Search */}
            <div className="relative group">
              <span className={`material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] transition-colors ${filterSearch ? 'text-primary' : 'text-slate-400 group-focus-within:text-primary'}`}>search</span>
              <input
                type="text"
                placeholder="Buscar descrição..."
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 border rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all ${filterSearch ? 'border-primary text-primary bg-primary/5' : 'bg-slate-50 border-slate-100 text-slate-600 focus:bg-white'}`}
              />
            </div>

            {/* Manager Filter */}
            <div className="relative">
              <span className={`material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] ${filterManager ? 'text-primary' : 'text-slate-400'}`}>person</span>
              <select
                value={filterManager}
                onChange={(e) => setFilterManager(e.target.value)}
                className={`w-full pl-10 pr-10 py-2 border rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer ${filterManager ? 'border-primary text-primary bg-primary/5' : 'bg-slate-50 border-slate-100 text-slate-600 focus:bg-white'}`}
              >
                <option value="">Todos Gerentes</option>
                {availableManagers.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <span className={`material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[16px] pointer-events-none ${filterManager ? 'text-primary' : 'text-slate-400'}`}>expand_more</span>
            </div>

            {/* Category Filter */}
            <div className="relative">
              <span className={`material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] ${filterCategory ? 'text-primary' : 'text-slate-400'}`}>category</span>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className={`w-full pl-10 pr-10 py-2 border rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer ${filterCategory ? 'border-primary text-primary bg-primary/5' : 'bg-slate-50 border-slate-100 text-slate-600 focus:bg-white'}`}
              >
                <option value="">Todas Categorias</option>
                {availableCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <span className={`material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[16px] pointer-events-none ${filterCategory ? 'text-primary' : 'text-slate-400'}`}>expand_more</span>
            </div>

            {/* VD Filter */}
            <div className="relative">
              <span className={`material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] ${filterVD !== 'all' ? 'text-primary' : 'text-slate-400'}`}>payments</span>
              <select
                value={filterVD}
                onChange={(e) => setFilterVD(e.target.value)}
                className={`w-full pl-10 pr-10 py-2 border rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer ${filterVD !== 'all' ? 'border-primary text-primary bg-primary/5' : 'bg-slate-50 border-slate-100 text-slate-600 focus:bg-white'}`}
              >
                <option value="all">Tipo (VD/SEM VD)</option>
                <option value="vd">Somente VD</option>
                <option value="semvd">Sem VD</option>
              </select>
              <span className={`material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[16px] pointer-events-none ${filterVD !== 'all' ? 'text-primary' : 'text-slate-400'}`}>expand_more</span>
            </div>

            {/* Date Range Inline */}
            <div className="flex gap-2 lg:col-span-1">
              <div className="relative flex-1 group">
                <span className={`material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[16px] transition-colors ${startDate ? 'text-primary' : 'text-slate-400'}`}>calendar_today</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={`w-full pl-8 pr-2 py-2 border rounded-xl text-[10px] font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all ${startDate ? 'border-primary text-primary bg-primary/5' : 'bg-slate-50 border-slate-100 text-slate-600 focus:bg-white'}`}
                />
              </div>
              <div className="relative flex-1 group">
                <span className={`material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[16px] transition-colors ${endDate ? 'text-primary' : 'text-slate-400'}`}>event_available</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={`w-full pl-8 pr-2 py-2 border rounded-xl text-[10px] font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all ${endDate ? 'border-primary text-primary bg-primary/5' : 'bg-slate-50 border-slate-100 text-slate-600 focus:bg-white'}`}
                />
              </div>
              {(startDate || endDate || filterManager || filterCategory || filterVD !== 'all' || filterSearch) && (
                <button
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                    setFilterManager('');
                    setFilterCategory('');
                    setFilterVD('all');
                    setFilterSearch('');
                  }}
                  className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors shrink-0 animate-in fade-in zoom-in duration-300"
                  title="Limpar Filtros"
                >
                  <span className="material-symbols-outlined text-[20px]">filter_alt_off</span>
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Responsável</th>
                <th className="px-6 py-4">Categoria</th>
                <th className="px-6 py-4">Descrição</th>
                <th className="px-6 py-4 text-center">VD</th>
                <th className="px-6 py-4 text-right">Valor</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4 text-slate-400 font-medium">{new Date(tx.date).toLocaleDateString('pt-BR')}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="size-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                        {tx.manager?.substring(0, 1) || '?'}
                      </div>
                      <span className="font-bold text-slate-700">{tx.manager || 'Não Inf.'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-600 font-bold text-[10px]">
                      {tx.category.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600 font-medium max-w-[200px] truncate" title={tx.description}>{tx.description}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold ${tx.isVendaDinheiro ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}>
                      {tx.isVendaDinheiro ? 'VD' : 'SEM VD'}
                    </span>
                  </td>
                  <td className={`px-6 py-4 text-right font-black ${tx.type === 'entrada' ? 'text-emerald-600' : 'text-primary'}`}>
                    <div className="flex items-center justify-end gap-1">
                      <span className="material-symbols-outlined text-[14px]">
                        {tx.type === 'entrada' ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}
                      </span>
                      {formatCurrency(tx.amount)}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {onEdit && (
                        <button
                          onClick={() => onEdit(tx)}
                          className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Editar"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={async () => {
                            const confirmed = onConfirmRequest
                              ? await onConfirmRequest('Tem certeza que deseja remover este movimento?')
                              : confirm('Tem certeza que deseja remover este movimento?');

                            if (confirmed) {
                              onDelete(tx.id);
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Remover"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, type, color, isBalance }: any) => {
  const iconMap: any = { up: 'trending_up', down: 'trending_down', wallet: 'account_balance_wallet' };
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-4 relative overflow-hidden group">
      <div className={`absolute -top-2 -right-2 p-4 opacity-5 group-hover:opacity-10 transition-opacity text-slate-900`}>
        <span className="material-symbols-outlined text-8xl">{iconMap[type]}</span>
      </div>
      <div className="flex items-center gap-3 relative z-10">
        <div className={`p-2 bg-${color}-50 rounded-xl text-${color}-600`}>
          <span className="material-symbols-outlined text-[20px]">{iconMap[type]}</span>
        </div>
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{title}</p>
      </div>
      <div className="relative z-10">
        <p className="text-3xl font-black text-slate-900">
          {formatCurrency(value)}
        </p>
      </div>
      {isBalance && <div className="absolute bottom-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary via-primary-hover to-orange-500"></div>}
    </div>
  );
};

export default CashFundDashboard;
