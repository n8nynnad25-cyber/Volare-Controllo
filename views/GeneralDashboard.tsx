
import React, { useState, useMemo } from 'react';
import { AppState, ViewType, CashTransaction, MileageRecord, KegSale } from '../types';
import { BRAND_COLORS } from '../constants';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, LineChart, Line, AreaChart, Area, PieChart, Pie, CartesianGrid, Legend
} from 'recharts';
import { formatCurrency } from '../src/utils/format';

interface GeneralDashboardProps {
  state: AppState;
  onNavigate: (view: ViewType) => void;
}

type PeriodType = 'hoje' | 'semana' | 'mes' | 'total';

const GeneralDashboard: React.FC<GeneralDashboardProps> = ({ state, onNavigate }) => {
  const [period, setPeriod] = useState<PeriodType>('mes');

  // Auxiliar para filtrar por data
  const filterByPeriod = (dateStr: string) => {
    const recordDate = new Date(dateStr);
    const now = new Date();

    switch (period) {
      case 'hoje':
        return recordDate.toDateString() === now.toDateString();
      case 'semana':
        const lastWeek = new Date();
        lastWeek.setDate(now.getDate() - 7);
        return recordDate >= lastWeek;
      case 'mes':
        return recordDate.getMonth() === now.getMonth() && recordDate.getFullYear() === now.getFullYear();
      default:
        return true;
    }
  };

  // Dados Filtrados
  const filteredCash = useMemo(() => state.cashTransactions.filter(t => filterByPeriod(t.date)), [state.cashTransactions, period]);
  const filteredMileage = useMemo(() => state.mileageRecords.filter(t => filterByPeriod(t.date)), [state.mileageRecords, period]);
  const filteredKegs = useMemo(() => state.kegSales.filter(t => filterByPeriod(t.date)), [state.kegSales, period]);

  // Cálculos de KPIs
  const totalEntradas = filteredCash.filter(t => t.type === 'entrada').reduce((acc, t) => acc + t.amount, 0);
  const totalSaidas = filteredCash.filter(t => t.type === 'saida').reduce((acc, t) => acc + t.amount, 0);
  const currentBalance = totalEntradas - totalSaidas;

  const totalKm = filteredMileage.reduce((acc, t) => acc + (t.kmFinal - t.kmInitial), 0);
  const totalLitersMileage = filteredMileage.reduce((acc, t) => acc + t.liters, 0);

  const totalKegsCount = filteredKegs.reduce((acc, t) => acc + t.quantity, 0);
  const totalKegsVolume = filteredKegs.reduce((acc, t) => acc + t.volume, 0);

  // Gráfico 1: Entradas vs Saídas
  const cashFlowData = useMemo(() => [
    { name: 'Entradas', value: totalEntradas, color: '#10b981' },
    { name: 'Saídas', value: totalSaidas, color: '#ef4444' }
  ], [totalEntradas, totalSaidas]);

  // Gráfico 2: Venda por Marcas (Rosca)
  const kegBrandsData = useMemo(() => {
    const brands: Record<string, number> = {};
    filteredKegs.forEach(s => {
      brands[s.brand] = (brands[s.brand] || 0) + s.quantity;
    });
    return Object.entries(brands).map(([name, value]) => ({ name, value }));
  }, [filteredKegs]);

  // Gráfico 3: Km vs Abastecimento
  const mileageTrendData = useMemo(() => {
    return filteredMileage.map(m => ({
      date: new Date(m.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      km: m.kmFinal - m.kmInitial,
      litros: m.liters
    })).slice(-7);
  }, [filteredMileage]);

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-700 pb-20">

      {/* Top Filter Bar */}
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

      {/* KPI Section */}
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
          label="Barris Vendidos"
          value={`${totalKegsCount} Unid.`}
          subValue={`${totalKegsVolume} Litros`}
          icon="propane_tank"
          color="amber"
          onClick={() => onNavigate('keg-sales')}
        />
        <KPICard
          label="Quilometragem"
          value={`${totalKm.toLocaleString()} km`}
          subValue={`${totalLitersMileage.toFixed(1)} L Abastecidos`}
          icon="speed"
          color="blue"
          onClick={() => onNavigate('mileage')}
        />
        <KPICard
          label="Movimentação"
          value={formatCurrency(totalEntradas + totalSaidas)}
          icon="swap_horiz"
          color="slate"
        />
      </section>

      {/* Quick Actions */}
      <section>
        <div className="flex items-center gap-2 mb-4 px-1">
          <span className="material-symbols-outlined text-primary text-[20px]">bolt</span>
          <h3 className="font-black text-xs text-slate-500 uppercase tracking-[0.2em]">Ações Operacionais</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ActionButton label="Entrada Caixa" icon="add_circle" color="emerald" onClick={() => onNavigate('cash-fund-new')} />
          <ActionButton label="Saída Caixa" icon="remove_circle" color="rose" onClick={() => onNavigate('cash-fund-new')} />
          <ActionButton label="Registar Km" icon="distance" color="blue" onClick={() => onNavigate('mileage-new')} />
          <ActionButton label="Venda Barril" icon="shopping_basket" color="amber" onClick={() => onNavigate('keg-sales-new')} />
        </div>
      </section>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Entradas vs Saídas */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm h-[400px]">
          <h4 className="text-[10px] font-black text-slate-400 mb-8 uppercase tracking-[0.2em]">Fluxo de Caixa (MT)</h4>
          <ResponsiveContainer width="100%" height="80%">
            <BarChart data={cashFlowData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
              <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={60}>
                {cashFlowData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Vendas por Marca */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm h-[400px]">
          <h4 className="text-[10px] font-black text-slate-400 mb-8 uppercase tracking-[0.2em]">Mix de Marcas (Vendas)</h4>
          <ResponsiveContainer width="100%" height="80%">
            <PieChart>
              <Pie
                data={kegBrandsData}
                innerRadius={60}
                outerRadius={100}
                paddingAngle={8}
                dataKey="value"
              >
                {kegBrandsData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={BRAND_COLORS[entry.name] || '#94a3b8'} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} />
              <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Km vs Litros */}
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm h-[400px]">
          <h4 className="text-[10px] font-black text-slate-400 mb-8 uppercase tracking-[0.2em]">Eficiência de Frota: Km Percorridos vs Combustível</h4>
          <ResponsiveContainer width="100%" height="80%">
            <BarChart data={mileageTrendData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
              <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
              <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} />
              <Legend verticalAlign="top" align="right" />
              <Bar yAxisId="left" dataKey="km" name="KM Percorrido" fill="#8a1e1e" radius={[4, 4, 0, 0]} barSize={40} />
              <Bar yAxisId="right" dataKey="litros" name="Litros" fill="#0ea5e9" radius={[4, 4, 0, 0]} barSize={40} />
            </BarChart>
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
            { label: 'Barris Vendidos', value: totalKegsCount },
            { label: 'Volume Total', value: `${totalKegsVolume} L` },
            { label: 'Status Médio', value: 'Confirmado' }
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

const ActionButton = ({ label, icon, color, onClick }: any) => {
  const colors: any = {
    emerald: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200',
    rose: 'bg-rose-600 hover:bg-rose-700 shadow-rose-200',
    blue: 'bg-blue-600 hover:bg-blue-700 shadow-blue-200',
    amber: 'bg-amber-600 hover:bg-amber-700 shadow-amber-200'
  };
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-3 p-6 rounded-3xl text-white transition-all hover:-translate-y-1 shadow-xl active:scale-95 ${colors[color]}`}
    >
      <span className="material-symbols-outlined text-[32px]">{icon}</span>
      <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
    </button>
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
