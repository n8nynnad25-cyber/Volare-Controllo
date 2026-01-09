
import React from 'react';
import { AppState, CashTransaction } from '../types';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Legend, CartesianGrid, PieChart, Pie, Cell
} from 'recharts';
import { formatCurrency } from '../src/utils/format';
import { exportToCSV } from '../src/utils/csvExport';

interface CashFundDashboardProps {
  state: AppState;
  onAdd: () => void;
}

const CashFundDashboard: React.FC<CashFundDashboardProps> = ({ state, onAdd }) => {
  const handleExportReport = () => {
    const headers = ['Data', 'Tipo', 'Responsável', 'Categoria', 'Descrição', 'Valor (MZN)'];
    const rows = state.cashTransactions.map(tx => [
      new Date(tx.date).toLocaleDateString('pt-BR'),
      tx.type === 'entrada' ? 'Entrada' : 'Saída',
      tx.manager || 'Não Informado',
      tx.category || 'Não Informado',
      tx.description,
      tx.amount
    ]);

    exportToCSV('relatorio_fundo_caixa', headers, rows);
  };

  // Global Totals
  const globalEntradas = state.cashTransactions.filter(t => t.type === 'entrada').reduce((a, b) => a + b.amount, 0);
  const globalSaidas = state.cashTransactions.filter(t => t.type === 'saida').reduce((a, b) => a + b.amount, 0);
  const globalSaldo = globalEntradas - globalSaidas;

  // Totals by Manager
  const managerDataMap = state.cashTransactions.reduce((acc: any, tx: CashTransaction) => {
    const mgr = tx.manager || 'Não Informado';
    if (!acc[mgr]) {
      acc[mgr] = { name: mgr, entradas: 0, saidas: 0, saldo: 0 };
    }
    if (tx.type === 'entrada') acc[mgr].entradas += tx.amount;
    else acc[mgr].saidas += tx.amount;
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
        <button onClick={onAdd} className="bg-primary text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-primary-hover flex items-center gap-2 shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 active:scale-95">
          <span className="material-symbols-outlined">add_card</span>
          Novo Movimento
        </button>
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
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 'bold', fill: '#64748b' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
              />
              <Legend verticalAlign="top" height={36} iconType="circle" />
              <Bar dataKey="entradas" name="Entradas" fill="#10b981" radius={[4, 4, 0, 0]} barSize={24} />
              <Bar dataKey="saidas" name="Saídas" fill="#8a1e1e" radius={[4, 4, 0, 0]} barSize={24} />
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
                <Pie
                  data={managerList}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="saldo"
                >
                  {managerList.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Legend layout="vertical" align="right" verticalAlign="middle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Transaction Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
          <h3 className="font-black text-lg text-slate-800 uppercase tracking-widest text-sm">Histórico Detalhado</h3>
          <button
            onClick={handleExportReport}
            className="text-primary text-xs font-black flex items-center gap-1 hover:underline cursor-pointer"
          >
            <span className="material-symbols-outlined text-[14px]">download</span>
            EXPORTAR RELATÓRIO
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Responsável</th>
                <th className="px-6 py-4">Categoria</th>
                <th className="px-6 py-4">Descrição</th>
                <th className="px-6 py-4 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {state.cashTransactions.map((tx) => (
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
                  <td className="px-6 py-4 text-slate-600 font-medium">{tx.description}</td>
                  <td className={`px-6 py-4 text-right font-black ${tx.type === 'entrada' ? 'text-emerald-600' : 'text-primary'}`}>
                    <div className="flex items-center justify-end gap-1">
                      <span className="material-symbols-outlined text-[14px]">
                        {tx.type === 'entrada' ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}
                      </span>
                      {formatCurrency(tx.amount)}
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
