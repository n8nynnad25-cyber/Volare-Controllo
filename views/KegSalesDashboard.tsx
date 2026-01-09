
import React, { useState, useMemo } from 'react';
import { AppState, KegSale } from '../types';
import { BRAND_COLORS } from '../constants';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, LineChart, Line, Legend, Cell
} from 'recharts';
import { formatCurrency } from '../src/utils/format';
import { exportToCSV } from '../src/utils/csvExport';

interface KegSalesDashboardProps {
  state: AppState;
  onAdd: () => void;
}

const KegSalesDashboard: React.FC<KegSalesDashboardProps> = ({ state, onAdd }) => {
  const handleExportReport = () => {
    const headers = ['Data', 'Código', 'Marca', 'Volume (L)', 'Quantidade', 'Valor (MZN)', 'Status'];
    const rows = state.kegSales.map(sale => [
      new Date(sale.date).toLocaleDateString('pt-BR'),
      sale.code,
      sale.brand,
      sale.volume,
      sale.quantity,
      sale.value,
      sale.status
    ]);

    exportToCSV('relatorio_vendas_barris', headers, rows);
  };

  const [selectedBrand, setSelectedBrand] = useState<string>('Todos');

  // Obter lista única de marcas para o filtro
  const brands = useMemo(() => {
    const uniqueBrands = Array.from(new Set(state.kegSales.map(s => s.brand)));
    return ['Todos', ...uniqueBrands];
  }, [state.kegSales]);

  // Filtrar vendas com base na marca selecionada
  const filteredSales = useMemo(() => {
    if (selectedBrand === 'Todos') return state.kegSales;
    return state.kegSales.filter(s => s.brand === selectedBrand);
  }, [state.kegSales, selectedBrand]);

  // KPIs
  const totalLitros = filteredSales.reduce((acc, s) => acc + s.volume, 0);
  const totalBarris = filteredSales.reduce((acc, s) => acc + s.quantity, 0);
  const totalValor = filteredSales.reduce((acc, s) => acc + s.value, 0);

  // Dados: Vendas por Código (Gráfico de Barras)
  const salesByCode = useMemo(() => {
    const codes: Record<string, number> = {};
    filteredSales.forEach(s => {
      codes[s.code] = (codes[s.code] || 0) + s.quantity;
    });
    return Object.entries(codes).map(([code, qty]) => ({ code, qty })).slice(-8);
  }, [filteredSales]);

  // Dados: Vendas Semanais (Gráfico de Linhas)
  const weeklySales = useMemo(() => {
    const weeks: Record<string, number> = {};
    filteredSales.forEach(s => {
      const date = new Date(s.date);
      const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
      const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
      const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
      const weekLabel = `Sem ${weekNum}`;
      weeks[weekLabel] = (weeks[weekLabel] || 0) + s.quantity;
    });
    return Object.entries(weeks).map(([name, total]) => ({ name, total }));
  }, [filteredSales]);

  // Dados: Vendas Mensais (Gráfico de Barras)
  const monthlySales = useMemo(() => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const monthlyData: Record<string, number> = {};

    // Inicializar meses vazios
    months.forEach(m => monthlyData[m] = 0);

    filteredSales.forEach(s => {
      const mIdx = new Date(s.date).getMonth();
      monthlyData[months[mIdx]] += s.quantity;
    });

    return Object.entries(monthlyData).map(([name, total]) => ({ name, total }));
  }, [filteredSales]);

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500 pb-20">

      {/* Header & Filtros */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Gestão de Barris</h2>
          <p className="text-slate-500 font-medium italic">Monitorização de inventário e fluxo de saída.</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-sm focus-within:ring-2 focus-within:ring-primary/20 transition-all">
            <span className="material-symbols-outlined text-slate-400 mr-2 text-[20px]">filter_list</span>
            <select
              className="border-none p-0 text-sm font-black text-slate-700 focus:ring-0 cursor-pointer bg-transparent pr-8"
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
            >
              {brands.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
          <button onClick={onAdd} className="bg-primary text-white px-6 py-3 rounded-xl text-sm font-black hover:bg-primary-hover flex items-center gap-2 shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95 uppercase tracking-widest">
            <span className="material-symbols-outlined text-[20px]">add_box</span>
            Nova Venda
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricBox label="Volume Total" value={`${totalLitros.toLocaleString()} L`} icon="water_drop" color="blue" />
        <MetricBox label="Barris Vendidos" value={totalBarris} icon="propane_tank" color="orange" />
        <MetricBox label="Receita Bruta" value={formatCurrency(totalValor)} icon="payments" color="emerald" />
      </div>

      {/* Grid de Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Gráfico 1: Vendas por Código (Barras) */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm h-[400px]">
          <h4 className="text-xs font-black text-slate-400 mb-8 uppercase tracking-[0.2em] flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[18px]">barcode</span>
            Vendas por Código (SKU)
          </h4>
          <ResponsiveContainer width="100%" height="80%">
            <BarChart data={salesByCode}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="code" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
              <Tooltip
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}
              />
              <Bar dataKey="qty" name="Qtd Barris" fill="#8a1e1e" radius={[6, 6, 0, 0]} barSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico 2: Tendência Semanal (Linhas) */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm h-[400px]">
          <h4 className="text-xs font-black text-slate-400 mb-8 uppercase tracking-[0.2em] flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[18px]">trending_up</span>
            Total Vendas Semanais
          </h4>
          <ResponsiveContainer width="100%" height="80%">
            <LineChart data={weeklySales}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} />
              <Line
                type="monotone"
                dataKey="total"
                name="Barris"
                stroke="#8a1e1e"
                strokeWidth={4}
                dot={{ r: 6, fill: '#8a1e1e', strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico 3: Vendas Mensais (Barras) - Ocupa toda a largura se necessário */}
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm h-[400px]">
          <h4 className="text-xs font-black text-slate-400 mb-8 uppercase tracking-[0.2em] flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[18px]">calendar_view_month</span>
            Volume de Vendas Mensais
          </h4>
          <ResponsiveContainer width="100%" height="80%">
            <BarChart data={monthlySales}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} />
              <Bar dataKey="total" name="Barris" fill="#1e293b" radius={[6, 6, 0, 0]} barSize={50}>
                {monthlySales.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.total > 5 ? '#8a1e1e' : '#cbd5e1'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabela de Vendas Recentes */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-[0.2em]">Listagem de Movimentos</h3>
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-black text-slate-400 bg-white px-3 py-1 rounded-full uppercase border border-slate-100">
              {filteredSales.length} Itens
            </span>
            <button
              onClick={handleExportReport}
              className="text-primary text-xs font-black flex items-center gap-1 hover:underline cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px]">download</span>
              EXPORTAR RELATÓRIO
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-100">
              <tr>
                <th className="px-8 py-5">Data</th>
                <th className="px-8 py-5">Código</th>
                <th className="px-8 py-5">Marca</th>
                <th className="px-8 py-5">Volume/Qtd</th>
                <th className="px-8 py-5 text-right">Valor</th>
                <th className="px-8 py-5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-bold">
              {filteredSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-8 py-4 text-xs text-slate-400">{new Date(sale.date).toLocaleDateString('pt-BR')}</td>
                  <td className="px-8 py-4 text-xs text-slate-800 font-mono">{sale.code}</td>
                  <td className="px-8 py-4">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full" style={{ backgroundColor: BRAND_COLORS[sale.brand] || '#ccc' }}></span>
                      <span className="text-xs font-black text-slate-700 uppercase tracking-tight">{sale.brand}</span>
                    </div>
                  </td>
                  <td className="px-8 py-4 text-xs text-slate-600">{sale.volume}L x {sale.quantity}un</td>
                  <td className="px-8 py-4 text-right text-xs text-primary">{formatCurrency(sale.value)}</td>
                  <td className="px-8 py-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${sale.status === 'Confirmado' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                      {sale.status}
                    </span>
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

const MetricBox = ({ label, value, icon, color }: any) => {
  const colorMap: any = {
    blue: 'bg-blue-50 text-blue-600',
    orange: 'bg-orange-50 text-orange-600',
    emerald: 'bg-emerald-50 text-emerald-600'
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
      <div className="absolute -top-4 -right-4 size-24 bg-slate-50 rounded-full opacity-40"></div>
    </div>
  );
};

export default KegSalesDashboard;
