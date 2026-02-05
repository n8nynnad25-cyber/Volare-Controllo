
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
  onAdd?: () => void;
  onEdit?: (record: MileageRecord) => void;
  onDelete?: (id: string) => void;
  onConfirmRequest?: (message: string) => Promise<boolean>;
}

const MileageDashboard: React.FC<MileageDashboardProps> = ({ state, onAdd, onEdit, onDelete, onConfirmRequest }) => {
  const handleExportReport = () => {
    const headers = ['Data', 'Veículo', 'Driver', 'Km Inicial', 'Km Final', 'Distância', 'Litros', 'Custo (MZN)'];
    const rows = filteredRecords.map(rec => [
      new Date(rec.date).toLocaleDateString('pt-BR'),
      rec.vehicle,
      (rec as any).driver || 'Não Informado',
      rec.kmInitial,
      rec.kmFinal,
      rec.kmFinal - rec.kmInitial,
      rec.liters,
      rec.cost
    ]);

    exportToCSV('relatorio_quilometragem', headers, rows);
  };

  // Estados de Filtro
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [filterVehicle, setFilterVehicle] = useState<string>('');
  const [filterSearch, setFilterSearch] = useState<string>('');

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setFilterVehicle('');
    setFilterSearch('');
  };

  // Filtra registos pelo intervalo e critérios selecionados
  const filteredRecords = useMemo(() => {
    return state.mileageRecords.filter(r => {
      // Filtro de Data
      if (startDate || endDate) {
        const date = new Date(r.date);
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
      }

      // Filtro de Veículo
      if (filterVehicle && r.vehicle !== filterVehicle) return false;

      // Filtro de Busca (Veículo ou Driver se houver)
      if (filterSearch) {
        const search = filterSearch.toLowerCase();
        const vehicleMatch = r.vehicle.toLowerCase().includes(search);
        const driverMatch = (r as any).driver?.toLowerCase().includes(search);
        if (!vehicleMatch && !driverMatch) return false;
      }

      return true;
    });
  }, [state.mileageRecords, startDate, endDate, filterVehicle, filterSearch]);

  const availableVehicles = useMemo(() => {
    return Array.from(new Set(state.mileageRecords.map(r => r.vehicle))).filter(Boolean).sort();
  }, [state.mileageRecords]);

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
          <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Gestão de Frota</h2>
          <p className="text-slate-500 font-medium italic">Análise de consumo e eficiência por unidade.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {onAdd && (
            <button onClick={onAdd} className="bg-primary text-white h-12 px-6 rounded-xl text-xs font-black hover:bg-primary-hover flex items-center gap-2 shadow-lg shadow-primary/20 transition-all uppercase tracking-widest">
              <span className="material-symbols-outlined text-[18px]">add_road</span>
              Novo Registo
            </button>
          )}
        </div>
      </div>

      {/* Metric Cards Globais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard label="Km Percorrido" value={`${totalKm.toLocaleString('pt-BR')} km`} icon="distance" color="primary" />
        <MetricCard label="Eficiência Média" value={`${globalEfficiency} km/L`} icon="auto_fix" color="emerald" />
        <MetricCard label="Custos Totais" value={formatCurrency(totalCost)} icon="payments" color="blue" />
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
              <div key={v.vehicle} className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
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

                <h4 className="font-black text-slate-900 truncate mb-6 text-lg tracking-tight uppercase">{v.vehicle}</h4>

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
          <div className="py-20 bg-white rounded-[32px] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-slate-400">
            <span className="material-symbols-outlined text-6xl mb-4 opacity-20">inventory_2</span>
            <p className="font-bold uppercase tracking-widest text-sm text-center px-4">Nenhum dado encontrado para o período selecionado</p>
          </div>
        )}
      </section>

      {/* Gráficos de Comparação Premium */}
      {vehicleStats.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Km por Veículo */}
          <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm h-[480px] flex flex-col">
            <h4 className="text-[10px] font-black text-slate-400 mb-8 uppercase tracking-[0.2em]">Quilometragem por Unidade (KM)</h4>
            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={vehicleStats} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                  <defs>
                    <filter id="barShadow" height="130%">
                      <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
                      <feOffset dx="0" dy="4" result="offsetblur" />
                      <feComponentTransfer><feFuncA type="linear" slope="0.3" /></feComponentTransfer>
                      <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" opacity={0.5} />
                  <XAxis
                    dataKey="vehicle"
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                    dy={10}
                    tick={(props) => {
                      const { x, y, payload, index } = props;
                      return (
                        <text
                          x={x}
                          y={y}
                          fill={COLORS[index % COLORS.length]}
                          textAnchor="middle"
                          style={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' }}
                        >
                          {payload.value}
                        </text>
                      );
                    }}
                  />

                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <Tooltip
                    cursor={{ fill: '#f8fafc', opacity: 0.5 }}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="km" name="KM Percorridos" radius={[8, 8, 0, 0]} barSize={40} style={{ filter: 'url(#barShadow)' }}>
                    {vehicleStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Distribuição de Custos */}
          <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm h-[480px] flex flex-col">
            <h4 className="text-[10px] font-black text-slate-400 mb-8 uppercase tracking-[0.2em]">Distribuição de Custos (MT)</h4>
            <div className="flex-1 w-full min-h-0">
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
                    data={vehicleStats}
                    cx="50%"
                    cy="45%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={8}
                    dataKey="cost"
                    nameKey="vehicle"
                    stroke="none"
                    style={{ filter: 'url(#pieShadow)' }}
                  >
                    {vehicleStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="hover:opacity-80 transition-opacity cursor-pointer" />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                  <Legend
                    verticalAlign="bottom"
                    align="center"
                    iconType="circle"
                    wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '30px', textTransform: 'uppercase' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Tabela de Registos & Filtros */}
      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex flex-col gap-6 bg-slate-50/30">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-[0.2em] flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">history</span>
              Histórico Detalhado
            </h3>
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-black text-slate-400 bg-white px-3 py-1 rounded-full uppercase border border-slate-100">
                {filteredRecords.length} lançamentos
              </span>
              <button
                onClick={handleExportReport}
                className="text-primary text-xs font-black flex items-center gap-1 hover:underline cursor-pointer transition-all"
              >
                <span className="material-symbols-outlined text-[16px]">download</span>
                EXPORTAR RELATÓRIO
              </button>
            </div>
          </div>

          {/* Modern Filter Bar for Mileage */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search */}
            <div className="relative group">
              <span className={`material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] transition-colors ${filterSearch ? 'text-primary' : 'text-slate-400 group-focus-within:text-primary'}`}>search</span>
              <input
                type="text"
                placeholder="Buscar veículo ou motorista..."
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 border rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all ${filterSearch ? 'border-primary text-primary bg-primary/5' : 'bg-slate-50 border-slate-100 text-slate-600 focus:bg-white'}`}
              />
            </div>

            {/* Vehicle Filter */}
            <div className="relative">
              <span className={`material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] ${filterVehicle ? 'text-primary' : 'text-slate-400'}`}>directions_car</span>
              <select
                value={filterVehicle}
                onChange={(e) => setFilterVehicle(e.target.value)}
                className={`w-full pl-10 pr-10 py-2 border rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer ${filterVehicle ? 'border-primary text-primary bg-primary/5' : 'bg-slate-50 border-slate-100 text-slate-600 focus:bg-white'}`}
              >
                <option value="">Todos Veículos</option>
                {availableVehicles.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
              <span className={`material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[16px] pointer-events-none ${filterVehicle ? 'text-primary' : 'text-slate-400'}`}>expand_more</span>
            </div>

            {/* Date Range Inline */}
            <div className="flex gap-2 lg:col-span-2">
              <div className="relative flex-1 group">
                <span className={`material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] transition-colors ${startDate ? 'text-primary' : 'text-slate-400'}`}>calendar_today</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={`w-full pl-10 pr-2 py-2 border rounded-xl text-[10px] font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all ${startDate ? 'border-primary text-primary bg-primary/5' : 'bg-slate-50 border-slate-100 text-slate-600 focus:bg-white'}`}
                />
              </div>
              <div className="relative flex-1 group">
                <span className={`material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] transition-colors ${endDate ? 'text-primary' : 'text-slate-400'}`}>event_available</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={`w-full pl-10 pr-2 py-2 border rounded-xl text-[10px] font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all ${endDate ? 'border-primary text-primary bg-primary/5' : 'bg-slate-50 border-slate-100 text-slate-600 focus:bg-white'}`}
                />
              </div>
              {(startDate || endDate || filterVehicle || filterSearch) && (
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
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-100">
              <tr>
                <th className="px-8 py-5">Data</th>
                <th className="px-8 py-5">Veículo</th>
                <th className="px-8 py-5">Km Inicial</th>
                <th className="px-8 py-5">Km Final</th>
                <th className="px-8 py-5">Percorrido</th>
                <th className="px-8 py-5 text-center">Volume</th>
                <th className="px-8 py-5 text-right">Custo</th>
                <th className="px-8 py-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredRecords.map((rec) => (
                <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="px-8 py-4 text-[11px] font-bold text-slate-400">{new Date(rec.date).toLocaleDateString('pt-BR')}</td>
                  <td className="px-8 py-4">
                    <span className="px-3 py-1 rounded-lg bg-slate-100 text-[11px] font-black text-slate-700 uppercase tracking-tight group-hover:bg-primary/10 group-hover:text-primary transition-all">
                      {rec.vehicle}
                    </span>
                  </td>
                  <td className="px-8 py-4 text-[11px] font-medium text-slate-500">{rec.kmInitial} km</td>
                  <td className="px-8 py-4 text-[11px] font-medium text-slate-500">{rec.kmFinal} km</td>
                  <td className="px-8 py-4">
                    <span className="text-[11px] font-black text-emerald-600">+{rec.kmFinal - rec.kmInitial} km</span>
                  </td>
                  <td className="px-8 py-4 text-center">
                    <span className="text-[11px] font-bold text-slate-700">{rec.liters.toFixed(1)} L</span>
                  </td>
                  <td className="px-8 py-4 text-right">
                    <span className="text-[11px] font-black text-slate-900">{formatCurrency(rec.cost)}</span>
                  </td>
                  <td className="px-8 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {onEdit && (
                        <button
                          onClick={() => onEdit(rec)}
                          className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                          title="Editar"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={async () => {
                            const confirmed = onConfirmRequest
                              ? await onConfirmRequest('Tem certeza que deseja remover este registo de quilometragem?')
                              : confirm('Tem certeza que deseja remover este registo de quilometragem?');

                            if (confirmed) {
                              onDelete(rec.id);
                            }
                          }}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
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

const MetricCard = ({ label, value, icon, color }: any) => {
  const colorMap: any = {
    primary: 'bg-primary/10 text-primary',
    emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600'
  };
  return (
    <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm flex flex-col gap-6 relative overflow-hidden group">
      <div className={`p-3 w-fit rounded-2xl ${colorMap[color]}`}>
        <span className="material-symbols-outlined text-[24px]">{icon}</span>
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-3xl font-black text-slate-900 tracking-tight">{value}</p>
      </div>
      <div className="absolute -top-4 -right-4 size-24 bg-slate-50 rounded-full opacity-40 group-hover:scale-125 transition-transform duration-700"></div>
    </div>
  );
};

export default MileageDashboard;
