
import React, { useState, useMemo } from 'react';
import { AppState, MileageRecord } from '../types';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, Cell, PieChart, Pie
} from 'recharts';
import { formatCurrency } from '../src/utils/format';
import { exportToCSV } from '../src/utils/csvExport';

interface MileageDashboardProps {
  state: AppState;
  onAdd: () => void;
}

const MileageDashboard: React.FC<MileageDashboardProps> = ({ state, onAdd }) => {
  const handleExportReport = () => {
    const headers = ['Data', 'Veículo', 'Driver', 'Km Inicial', 'Km Final', 'Distância', 'Litros', 'Custo (MZN)'];
    const rows = state.mileageRecords.map(rec => [
      new Date(rec.date).toLocaleDateString('pt-BR'),
      rec.vehicle,
      rec.driver || 'Não Informado',
      rec.km_start,
      rec.km_end,
      rec.km_end - rec.km_start,
      rec.liters,
      rec.cost
    ]);

    exportToCSV('relatorio_quilometragem', headers, rows);
  };

  // Estado para o filtro mensal (YYYY-MM)
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Filtra registos pelo mês selecionado
  const filteredRecords = useMemo(() => {
    return state.mileageRecords.filter(r => r.date.startsWith(selectedMonth));
  }, [state.mileageRecords, selectedMonth]);

  // Agrupa dados por Veículo (Matrícula)
  const vehicleStats = useMemo(() => {
    const groups: Record<string, {
      vehicle: string,
      km: number,
      liters: number,
      cost: number,
      count: number
    }> = {};

    filteredRecords.forEach(r => {
      const v = r.vehicle || 'Não Identificado';
      if (!groups[v]) {
        groups[v] = { vehicle: v, km: 0, liters: 0, cost: 0, count: 0 };
      }
      const dist = Math.max(0, r.kmFinal - r.kmInitial);
      groups[v].km += dist;
      groups[v].liters += r.liters;
      groups[v].cost += r.cost;
      groups[v].count += 1;
    });

    return Object.values(groups).map(g => ({
      ...g,
      efficiency: g.liters > 0 ? (g.km / g.liters).toFixed(2) : '0.00'
    })).sort((a, b) => b.km - a.km);
  }, [filteredRecords]);

  // Totais Globais do Período Filtrado
  const totalKm = vehicleStats.reduce((acc, v) => acc + v.km, 0);
  const totalCost = vehicleStats.reduce((acc, v) => acc + v.cost, 0);
  const totalLiters = vehicleStats.reduce((acc, v) => acc + v.liters, 0);
  const globalEfficiency = totalLiters > 0 ? (totalKm / totalLiters).toFixed(2) : '0.00';

  const COLORS = ['#8a1e1e', '#1e40af', '#15803d', '#a21caf', '#b45309', '#0891b2'];

  return (
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">

      {/* Header e Filtros */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">GESTÃO DE FROTA</h2>
          <p className="text-slate-500 font-medium italic">Análise de consumo e eficiência por unidade.</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-sm focus-within:ring-2 focus-within:ring-primary/20 transition-all">
            <span className="material-symbols-outlined text-slate-400 mr-2 text-[20px]">calendar_month</span>
            <input
              type="month"
              className="border-none p-0 text-sm font-bold text-slate-700 focus:ring-0 cursor-pointer"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            />
          </div>
          <button onClick={onAdd} className="bg-primary text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-primary-hover flex items-center gap-2 shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95">
            <span className="material-symbols-outlined text-[20px]">add_road</span>
            Novo Registo
          </button>
        </div>
      </div>

      {/* Cards de Métricas Globais (Resumo do Mês) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard label="Km Total (Mês)" value={`${totalKm.toLocaleString('pt-BR')} km`} icon="distance" color="primary" />
        <MetricCard label="Eficiência Média" value={`${globalEfficiency} km/L`} icon="auto_fix" color="emerald" />
        <MetricCard label="Total Abastecido" value={formatCurrency(totalCost)} icon="payments" color="blue" />
        <MetricCard label="Volume Total" value={`${totalLiters.toFixed(1)} L`} icon="gas_meter" color="amber" />
      </div>

      {/* Grid de Performance por Veículo */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <span className="material-symbols-outlined text-primary">motorcycle</span>
          <h3 className="font-bold text-lg text-slate-800 uppercase tracking-widest">Análise por Unidade</h3>
        </div>

        {vehicleStats.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {vehicleStats.map((v, i) => (
              <div key={v.vehicle} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                <div className="flex justify-between items-start mb-6">
                  <div className="size-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    <span className="material-symbols-outlined text-[28px]">directions_bike</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-black px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg mb-1 tracking-tighter">
                      {v.efficiency} KM/L
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">{v.count} Registos</span>
                  </div>
                </div>

                <h4 className="font-black text-slate-900 truncate mb-6 text-lg tracking-tight">{v.vehicle}</h4>

                <div className="space-y-4">
                  <div className="flex justify-between items-end border-b border-slate-50 pb-2">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-400 uppercase">Distância</span>
                      <span className="text-sm font-bold text-slate-800">{v.km.toLocaleString('pt-BR')} km</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] font-black text-slate-400 uppercase">Litros</span>
                      <span className="text-sm font-bold text-slate-800">{v.liters.toFixed(1)} L</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase">Total Gasto</span>
                    <span className="text-lg font-black text-primary">{formatCurrency(v.cost)}</span>
                  </div>
                </div>

                {/* Visual Efficiency Bar */}
                <div className="mt-6 h-1 w-full bg-slate-50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-1000"
                    style={{ width: `${Math.min(100, (v.km / (totalKm || 1)) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-20 bg-white rounded-3xl border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-slate-400">
            <span className="material-symbols-outlined text-6xl mb-4 opacity-20">inventory_2</span>
            <p className="font-bold uppercase tracking-widest text-sm">Nenhum dado encontrado para este mês</p>
          </div>
        )}
      </section>

      {/* Gráficos de Comparação */}
      {vehicleStats.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Km por Veículo */}
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm h-[480px]">
            <h4 className="text-sm font-black text-slate-800 mb-10 uppercase tracking-[0.2em] flex items-center gap-2 border-b border-slate-50 pb-4">
              <span className="material-symbols-outlined text-primary">bar_chart</span>
              Quilometragem por Unidade
            </h4>
            <ResponsiveContainer width="100%" height="80%">
              <BarChart data={vehicleStats} margin={{ top: 0, right: 0, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="vehicle"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: '900', fill: '#64748b' }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="km" name="KM Percorridos" fill="#8a1e1e" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Distribuição de Custos */}
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm h-[480px]">
            <h4 className="text-sm font-black text-slate-800 mb-10 uppercase tracking-[0.2em] flex items-center gap-2 border-b border-slate-50 pb-4">
              <span className="material-symbols-outlined text-primary">pie_chart</span>
              Distribuição de Custos (MT)
            </h4>
            <ResponsiveContainer width="100%" height="80%">
              <PieChart>
                <Pie
                  data={vehicleStats}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={8}
                  dataKey="cost"
                  nameKey="vehicle"
                >
                  {vehicleStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} />
                <Legend
                  verticalAlign="bottom"
                  align="center"
                  iconType="circle"
                  wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '20px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tabela de Registos (Filtrada) */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-[0.2em]">Histórico do Período</h3>
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-black text-slate-400 bg-white px-3 py-1 rounded-full uppercase border border-slate-100">
              {filteredRecords.length} lançamentos
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
                <th className="px-8 py-5">Veículo</th>
                <th className="px-8 py-5">Km Inicial</th>
                <th className="px-8 py-5">Km Final</th>
                <th className="px-8 py-5">Percorrido</th>
                <th className="px-8 py-5">Litros</th>
                <th className="px-8 py-5 text-right">Custo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredRecords.map((rec) => (
                <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="px-8 py-4 text-xs font-bold text-slate-400">{new Date(rec.date).toLocaleDateString('pt-BR')}</td>
                  <td className="px-8 py-4">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-tight group-hover:text-primary transition-colors">
                      {rec.vehicle}
                    </span>
                  </td>
                  <td className="px-8 py-4 text-xs font-medium text-slate-500">{rec.kmInitial} km</td>
                  <td className="px-8 py-4 text-xs font-medium text-slate-500">{rec.kmFinal} km</td>
                  <td className="px-8 py-4">
                    <span className="text-xs font-black text-emerald-600">+{rec.kmFinal - rec.kmInitial} km</span>
                  </td>
                  <td className="px-8 py-4 text-xs font-bold text-slate-700">{rec.liters} L</td>
                  <td className="px-8 py-4 text-right">
                    <span className="text-xs font-black text-primary">{formatCurrency(rec.cost)}</span>
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

const MetricCard = ({ label, value, icon, color }: any) => {
  const colorMap: any = {
    primary: 'bg-primary/10 text-primary',
    emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600'
  };
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-5 relative overflow-hidden group">
      <div className={`p-3 w-fit rounded-2xl ${colorMap[color]}`}>
        <span className="material-symbols-outlined text-[24px]">{icon}</span>
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-2xl font-black text-slate-900 tracking-tight">{value}</p>
      </div>
      <div className="absolute -top-4 -right-4 size-24 bg-slate-50 rounded-full opacity-40 group-hover:scale-125 transition-transform duration-700"></div>
    </div>
  );
};

export default MileageDashboard;
