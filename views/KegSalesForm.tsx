
import React, { useState, useRef, useEffect } from 'react';
import { Keg, KegSale, AppState, KegStatus } from '../types';
import { formatCurrency, parseCurrency } from '../src/utils/format';

interface KegSalesFormProps {
  state?: AppState;
  onSubmit: (sale: KegSale | KegSale[]) => void;
  onAddKeg: (keg: Keg | Keg[]) => void;
  onUpdateKeg?: (id: string, updates: Partial<Keg>) => void;
  onProcessSales: (brand: string, liters: number, date: string) => void;
  onCancel: () => void;
  onNotify?: (message: string, type: 'success' | 'error' | 'info') => void;
  onConfirmRequest?: (message: string) => Promise<boolean>;
  initialData?: KegSale;
  initialKegData?: Keg;
}

const KegSalesForm: React.FC<KegSalesFormProps> = ({
  state, onSubmit, onAddKeg, onUpdateKeg, onProcessSales, onCancel, onNotify, onConfirmRequest,
  initialData, initialKegData
}) => {
  const [activeTab, setActiveTab] = useState<'manual' | 'import'>('manual');
  const [operationType, setOperationType] = useState<'purchase' | 'sale' | 'edit'>(initialKegData ? 'edit' : 'purchase');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [formData, setFormData] = useState({
    date: initialKegData?.purchaseDate || initialData?.date || new Date().toISOString().split('T')[0],
    brand: initialKegData?.brand || initialData?.brand || '',
    capacity: initialKegData?.capacity.toString() || '50',
    currentLiters: initialKegData?.currentLiters.toString() || '50',
    litersSold: '',
    quantity: '1',
    code: initialKegData?.code || '',
    value: initialKegData?.purchasePrice.toString() || ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.brand) return;

    if (operationType === 'edit' && initialKegData && onUpdateKeg) {
      const confirmed = onConfirmRequest
        ? await onConfirmRequest(`Confirmar alterações no barril ${formData.code}?`)
        : confirm(`Confirmar alterações no barril ${formData.code}?`);

      if (!confirmed) return;

      onUpdateKeg(initialKegData.id, {
        brand: formData.brand,
        capacity: parseFloat(formData.capacity),
        currentLiters: parseFloat(formData.currentLiters),
        code: formData.code,
        purchasePrice: parseFloat(formData.value) || 0,
        purchaseDate: formData.date
      });
      return;
    }

    if (operationType === 'purchase') {
      if (!formData.value) return;

      const confirmed = onConfirmRequest
        ? await onConfirmRequest(`Deseja confirmar a entrada de ${formData.quantity} barril(s) de ${formData.brand}?`)
        : confirm(`Deseja confirmar a entrada de ${formData.quantity} barril(s) de ${formData.brand}?`);

      if (!confirmed) return;

      const qty = parseInt(formData.quantity) || 1;
      const capacity = parseFloat(formData.capacity) || 50;
      const pricePerKeg = parseFloat(formData.value) / qty;

      const newKegs: Keg[] = [];
      const existingBrandKegsCount = state?.kegs.filter(k => k.brand === formData.brand).length || 0;

      for (let i = 0; i < qty; i++) {
        const sequence = existingBrandKegsCount + i + 1;
        const brandPrefix = formData.brand.substring(0, 3).toUpperCase().replace(/\s/g, '');
        const datePart = formData.date.replace(/-/g, '').substring(2);
        const autoCode = `${brandPrefix}-${datePart}-${sequence.toString().padStart(3, '0')}`;

        newKegs.push({
          id: Math.random().toString(36).substr(2, 9),
          brand: formData.brand,
          capacity: capacity,
          currentLiters: capacity,
          purchasePrice: pricePerKeg,
          purchaseDate: formData.date,
          status: 'Novo',
          code: formData.code || autoCode
        });
      }

      onAddKeg(newKegs);
      onCancel();
    } else {
      // SALE
      if (!formData.litersSold) return;

      const confirmed = onConfirmRequest
        ? await onConfirmRequest(`Deseja processar a venda de ${formData.litersSold}L de ${formData.brand} via FIFO?`)
        : confirm(`Deseja processar a venda de ${formData.litersSold}L de ${formData.brand} via FIFO?`);

      if (!confirmed) return;

      onProcessSales(formData.brand, parseFloat(formData.litersSold), formData.date);
      onCancel();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.trim().split(/\r?\n/);
        const mapped = lines.map((line) => {
          const separator = line.includes(';') ? ';' : (line.includes('\t') ? '\t' : ',');
          const parts = line.split(separator).map(p => p.trim());
          return {
            date: parts[0] || new Date().toISOString(),
            brand: parts[1] || 'Outras',
            liters: parseFloat(parts[2]?.replace(',', '.')) || 0
          };
        });
        setActiveTab('manual'); // Preview simplicity
        // Not implemented preview for brevity, but could be added
        mapped.forEach(m => onProcessSales(m.brand, m.liters, m.date));
        onCancel();
      } catch (err: any) {
        if (onNotify) onNotify("Erro ao ler ficheiro.", "error");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-5xl mx-auto animate-in zoom-in-95 duration-300 pb-20">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">

        <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-col text-center md:text-left">
            <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">
              {operationType === 'edit' ? 'Editar Barril' : 'Controlo de Barris'}
            </h3>
            <p className="text-sm text-slate-500 font-medium italic">
              {operationType === 'edit' ? `A editar registo do barril ${initialKegData?.code}` : 'Gestão de entradas e processamento de consumos.'}
            </p>
          </div>
          {operationType !== 'edit' && (
            <div className="flex bg-slate-200 p-1 rounded-xl shadow-inner shrink-0">
              <button onClick={() => setActiveTab('manual')} className={`px-6 py-2.5 text-xs font-black uppercase rounded-lg transition-all ${activeTab === 'manual' ? 'bg-white text-primary shadow-sm' : 'text-slate-500'}`}>Manual</button>
              <button onClick={() => setActiveTab('import')} className={`px-6 py-2.5 text-xs font-black uppercase rounded-lg transition-all ${activeTab === 'import' ? 'bg-white text-primary shadow-sm' : 'text-slate-500'}`}>Importar</button>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-10 space-y-10">
          <div className="space-y-6">
            {operationType !== 'edit' && (
              <div className="bg-slate-100 p-1 rounded-xl flex">
                <button type="button" onClick={() => setOperationType('purchase')} className={`flex-1 py-3 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${operationType === 'purchase' ? 'bg-primary text-white shadow-md' : 'text-slate-500'}`}>Entrada</button>
                <button type="button" onClick={() => setOperationType('sale')} className={`flex-1 py-3 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${operationType === 'sale' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-500'}`}>Saída (Venda)</button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <label className="flex flex-col w-full">
                <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest pb-2">Data</span>
                <input type="date" className="rounded-xl border-slate-200 h-14 font-bold text-slate-700" value={formData.date} onChange={e => setFormData(p => ({ ...p, date: e.target.value }))} />
              </label>

              <label className="flex flex-col w-full">
                <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest pb-2">Marca</span>
                <select className="rounded-xl border-slate-200 h-14 font-bold text-slate-700" value={formData.brand} onChange={e => setFormData(p => ({ ...p, brand: e.target.value }))} required>
                  <option value="">Selecione...</option>
                  {state?.kegBrands.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                </select>
              </label>

              {operationType === 'sale' ? (
                <label className="flex flex-col w-full">
                  <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest pb-2">Total Litros Vendidos</span>
                  <input type="number" step="0.1" className="rounded-xl border-slate-200 h-14 font-black text-emerald-600 text-2xl" value={formData.litersSold} onChange={e => setFormData(p => ({ ...p, litersSold: e.target.value }))} required />
                </label>
              ) : (
                <>
                  <label className="flex flex-col w-full">
                    <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest pb-2">Código/Lote</span>
                    <input type="text" className="rounded-xl border-slate-200 h-14 font-bold text-slate-700" value={formData.code} onChange={e => setFormData(p => ({ ...p, code: e.target.value }))} />
                  </label>
                  <label className="flex flex-col w-full">
                    <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest pb-2">Capacidade (L)</span>
                    <input type="number" className="rounded-xl border-slate-200 h-14 font-bold text-slate-700" value={formData.capacity} onChange={e => setFormData(p => ({ ...p, capacity: e.target.value }))} />
                  </label>
                  {operationType === 'edit' && (
                    <label className="flex flex-col w-full">
                      <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest pb-2">Saldo Atual (L)</span>
                      <input type="number" step="0.1" className="rounded-xl border-slate-200 h-14 font-black text-primary" value={formData.currentLiters} onChange={e => setFormData(p => ({ ...p, currentLiters: e.target.value }))} />
                    </label>
                  )}
                  <label className="flex flex-col w-full">
                    <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest pb-2">Valor Total</span>
                    <input type="number" className="rounded-xl border-slate-200 h-14 font-bold text-slate-700" value={formData.value} onChange={e => setFormData(p => ({ ...p, value: e.target.value }))} />
                  </label>
                  {operationType === 'purchase' && (
                    <label className="flex flex-col w-full">
                      <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest pb-2">Qtd de Barris</span>
                      <input type="number" className="rounded-xl border-slate-200 h-14 font-bold text-slate-700" value={formData.quantity} onChange={e => setFormData(p => ({ ...p, quantity: e.target.value }))} />
                    </label>
                  )}
                </>
              )}
            </div>
          </div>

          {activeTab === 'import' ? (
            <div onClick={() => fileInputRef.current?.click()} className="border-4 border-dashed rounded-[40px] p-10 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-all border-slate-100">
              <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileUpload} />
              <span className="material-symbols-outlined text-4xl text-slate-300 mb-4">upload_file</span>
              <p className="font-black uppercase text-slate-400 text-xs">Carregar e Processar CSV</p>
            </div>
          ) : (
            <div className="flex justify-end gap-4 pt-8 border-t">
              <button type="button" onClick={onCancel} className="px-8 py-3 rounded-xl border font-bold text-slate-400 uppercase text-xs">Cancelar</button>
              <button type="submit" className={`px-10 py-3 rounded-xl text-white font-black uppercase text-xs shadow-xl ${operationType === 'purchase' ? 'bg-primary' : (operationType === 'edit' ? 'bg-slate-900' : 'bg-emerald-600')}`}>
                {operationType === 'purchase' ? 'Registar Entrada' : (operationType === 'edit' ? 'Salvar Alterações' : 'Processar Saída FIFO')}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default KegSalesForm;
