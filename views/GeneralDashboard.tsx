
import React, { useState, useMemo } from 'react';
import { AppState, ViewType, CashTransaction, MileageRecord, KegSale } from '../types';
import { BRAND_COLORS } from '../constants';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, LineChart, Line, AreaChart, Area, PieChart, Pie, CartesianGrid, Legend
} from 'recharts';
import { formatCurrency } from '../src/utils/format';
import { getBrandColor } from '../src/utils/colors';

interface GeneralDashboardProps {
  state: AppState;
  onNavigate: (view: ViewType) => void;
}

type PeriodType = 'hoje' | 'semana' | 'mes' | 'total';

const GeneralDashboard: React.FC<GeneralDashboardProps> = ({ state, onNavigate }) => {
  const [period, setPeriod] = useState<PeriodType>('total');

  const filterByPeriod = (dateStr: string) => {
    const recordDate = new Date(dateStr);
    const now = new Date();
    switch (period) {
      case 'hoje': return recordDate.toDateString() === now.toDateString();
      case 'semana':
        const lastWeek = new Date();
        lastWeek.setDate(now.getDate() - 7);
        return recordDate >= lastWeek;
      case 'mes': return recordDate.getMonth() === now.getMonth() && recordDate.getFullYear() === now.getFullYear();
      default: return true;
    }
  };

  // Cash & Mileage
  const filteredCash = useMemo(() => state.cashTransactions.filter(t => filterByPeriod(t.date)), [state.cashTransactions, period]);
  const filteredMileage = useMemo(() => state.mileageRecords.filter(t => filterByPeriod(t.date)), [state.mileageRecords, period]);

  const totalEntradas = filteredCash.filter(t => t.type?.toLowerCase() === 'entrada').reduce((acc, t) => acc + t.amount, 0);
  const totalSaidas = filteredCash.filter(t => t.type?.toLowerCase() === 'saida').reduce((acc, t) => acc + t.amount, 0);
  const currentBalance = totalEntradas - totalSaidas;

  const totalKm = filteredMileage.reduce((acc, t) => acc + (t.kmFinal - t.kmInitial), 0);
  const totalLitersMileage = filteredMileage.reduce((acc, t) => acc + t.liters, 0);

  // New Keg System Calculations
  const totalKegsVolume = useMemo(() => state.kegs.filter(k => filterByPeriod(k.purchaseDate)).reduce((acc, k) => acc + k.capacity, 0), [state.kegs, period]);
  const totalLitersSold = useMemo(() => state.kegMovements.filter(m => m.type === 'Venda' && filterByPeriod(m.date)).reduce((acc, m) => acc + m.liters, 0), [state.kegMovements, period]);
  const totalLitersLost = useMemo(() => state.kegMovements.filter(m => m.type === 'Perda' && filterByPeriod(m.date)).reduce((acc, m) => acc + m.liters, 0), [state.kegMovements, period]);
  const activeKegsCount = useMemo(() => state.kegs.filter(k => k.status === 'Ativo').length, [state.kegs]);

  // Gráfico: Mix de Marcas (baseado nos barris em estoque/ativos)
  const kegBrandsData = useMemo(() => {
    const brands: Record<string, number> = {};
    state.kegs.forEach(k => {
      brands[k.brand] = (brands[k.brand] || 0) + 1;
    });
    return Object.entries(brands).map(([name, value]) => ({ name, value }));
  }, [state.kegs]);

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-700 pb-20">

      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">filter_alt</span>
          <span className="text-sm font-black text-slate-700 uppercase tracking-widest">Período de Análise</span>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl">
          {(['hoje', 'semana', 'mes', 'total'] as PeriodType[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-6 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${period === p ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          label="Saldo Fundo de Caixa"
          value={formatCurrency(currentBalance)}
          icon="account_balance_wallet"
          trend={currentBalance >= 0 ? 'up' : 'down'}
          color={currentBalance >= 0 ? 'emerald' : 'rose'}
          onClick={() => onNavigate('cash-fund')}
        />
        <KPICard
          label="Consumo de Barris"
          value={`${totalLitersSold.toFixed(1)} L`}
          subValue={`${activeKegsCount} Barris Ativos`}
          icon="propane_tank"
          color="amber"
          onClick={() => onNavigate('keg-sales')}
        />
        <KPICard
          label="Frota & Km"
          value={`${totalKm.toLocaleString()} km`}
          subValue={`${totalLitersMileage.toFixed(1)} L Abastecidos`}
          icon="speed"
          color="blue"
          onClick={() => onNavigate('mileage')}
        />
        <KPICard
          label="Perdas Identificadas"
          value={`${totalLitersLost.toFixed(1)} L`}
          icon="report_problem"
          color="rose"
        />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Entradas vs Saídas */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm h-[400px]">
          <h4 className="text-[10px] font-black text-slate-400 mb-8 uppercase tracking-[0.2em]">Fluxo de Caixa (MT)</h4>
          <ResponsiveContainer width="100%" height="80%">
            <BarChart
              data={[
                { name: 'Entradas', value: totalEntradas, colorId: 'entryGradient' },
                { name: 'Saídas', value: totalSaidas, colorId: 'exitGradient' }
              ]}
              margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
            >
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
                  <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
                  <feOffset dx="0" dy="4" result="offsetblur" />
                  <feComponentTransfer><feFuncA type="linear" slope="0.3" /></feComponentTransfer>
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
              <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={60} style={{ filter: 'url(#barShadow)' }}>
                {
                  [totalEntradas, totalSaidas].map((_, index) => (
                    <Cell key={`cell-${index}`} fill={`url(#${index === 0 ? 'entryGradient' : 'exitGradient'})`} />
                  ))
                }
              </Bar>
            </BarChart>
          </ResponsiveContainer>

        </div>

        {/* Vendas por Marca */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm h-[400px]">
          <h4 className="text-[10px] font-black text-slate-400 mb-8 uppercase tracking-[0.2em]">Mix de Marcas (Estoque)</h4>
          <ResponsiveContainer width="100%" height="80%">
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
                data={kegBrandsData}
                innerRadius={70}
                outerRadius={100}
                paddingAngle={8}
                dataKey="value"
                stroke="none"
                style={{ filter: 'url(#pieShadow)' }}
              >
                {kegBrandsData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={getBrandColor(entry.name)}
                    className="hover:opacity-80 transition-opacity cursor-pointer"
                  />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
              <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
            </PieChart>
          </ResponsiveContainer>

        </div>
      </div>

      {/* Module Summaries */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ModuleSummary
          title="Fundo de Caixa"
          items={[
            { label: 'Saldo Atual', value: formatCurrency(currentBalance) },
            { label: 'Entradas', value: formatCurrency(totalEntradas) },
            { label: 'Saídas', value: formatCurrency(totalSaidas) }
          ]}
          onView={() => onNavigate('cash-fund')}
          icon="payments"
        />
        <ModuleSummary
          title="Frota & Km"
          items={[
            { label: 'Distância Total', value: `${totalKm} km` },
            { label: 'Média Consumo', value: `${totalLitersMileage > 0 ? (totalKm / totalLitersMileage).toFixed(2) : 0} km/L` },
            { label: 'Litros Totais', value: `${totalLitersMileage.toFixed(1)} L` }
          ]}
          onView={() => onNavigate('mileage')}
          icon="local_shipping"
        />
        <ModuleSummary
          title="Operação Barris"
          items={[
            { label: 'L Vendidos', value: `${totalLitersSold.toFixed(1)} L` },
            { label: 'L Perdidos', value: `${totalLitersLost.toFixed(1)} L` },
            { label: 'Barris Ativos', value: activeKegsCount }
          ]}
          onView={() => onNavigate('keg-sales')}
          icon="inventory_2"
        />
      </section>

    </div>
  );
};

const KPICard = ({ label, value, subValue, icon, trend, color, onClick }: any) => {
  const colors: any = {
    emerald: 'text-emerald-600 bg-emerald-50',
    rose: 'text-rose-600 bg-rose-50',
    amber: 'text-amber-600 bg-amber-50',
    blue: 'text-blue-600 bg-blue-50',
    slate: 'text-slate-600 bg-slate-50'
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-4 relative overflow-hidden group transition-all ${onClick ? 'cursor-pointer hover:border-primary/20 hover:shadow-md active:scale-95' : ''}`}
    >
      <div className="flex justify-between items-start">
        <div className={`p-3 rounded-2xl ${colors[color] || colors.slate}`}>
          <span className="material-symbols-outlined text-[24px]">{icon}</span>
        </div>
        {trend && (
          <span className={`flex items-center text-[10px] font-black px-2 py-1 rounded-lg ${trend === 'up' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
            <span className="material-symbols-outlined text-[14px] mr-1">{trend === 'up' ? 'trending_up' : 'trending_down'}</span>
            ANÁLISE
          </span>
        )}
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <h3 className="text-2xl font-black text-slate-900 tracking-tight">{value}</h3>
        {subValue && <p className="text-xs text-slate-500 font-medium mt-1">{subValue}</p>}
      </div>
      <div className="absolute -bottom-4 -right-4 size-24 bg-slate-50 rounded-full opacity-40 group-hover:scale-125 transition-transform duration-700"></div>
    </div>
  );
};

const ModuleSummary = ({ title, items, onView, icon }: any) => (
  <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 flex flex-col gap-6">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">{title}</h4>
      </div>
      <button onClick={onView} className="text-primary hover:underline font-black text-[10px] uppercase">Ver módulo</button>
    </div>
    <div className="space-y-4">
      {items.map((item: any, i: number) => (
        <div key={i} className="flex justify-between items-center border-b border-slate-50 pb-2">
          <span className="text-xs text-slate-400 font-bold uppercase">{item.label}</span>
          <span className="text-sm font-black text-slate-800">{item.value}</span>
        </div>
      ))}
    </div>
  </div>
);

export default GeneralDashboard;
