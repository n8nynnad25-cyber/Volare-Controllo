
import React, { useState, useRef } from 'react';
import { KegSale, AppState } from '../types';
import { formatCurrency, parseCurrency } from '../src/utils/format';

interface KegSalesFormProps {
  state?: AppState;
  onSubmit: (sale: KegSale | KegSale[]) => void;
  onCancel: () => void;
  onNotify?: (message: string, type: 'success' | 'error' | 'info') => void;
  onConfirmRequest?: (message: string) => Promise<boolean>;
  initialData?: KegSale;
}

const KegSalesForm: React.FC<KegSalesFormProps> = ({ state, onSubmit, onCancel, onNotify, onConfirmRequest, initialData }) => {
  const [activeTab, setActiveTab] = useState<'manual' | 'import'>('manual');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual Form State
  const [formData, setFormData] = useState({
    date: initialData?.date || new Date().toISOString().split('T')[0],
    brand: initialData?.brand || '',
    volume: initialData?.volume.toString() || '50',
    quantity: initialData?.quantity.toString() || '1',
    code: initialData?.code || '',
    value: initialData?.value.toString() || ''
  });

  // Import State
  const [previewData, setPreviewData] = useState<KegSale[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmitManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.brand || !formData.value) return;

    const confirmed = onConfirmRequest
      ? await onConfirmRequest('Deseja confirmar o registo desta venda?')
      : confirm('Deseja confirmar o registo desta venda?');

    if (!confirmed) {
      onNotify?.('O registo não foi gravado.', 'error');
      return;
    }

    onSubmit({
      id: initialData?.id || Math.random().toString(36).substr(2, 9),
      date: formData.date,
      brand: formData.brand,
      volume: parseFloat(formData.volume) || 50,
      quantity: parseInt(formData.quantity) || 1,
      code: formData.code || 'SN-' + Date.now(),
      value: parseFloat(formData.value),
      status: initialData?.status || 'Confirmado'
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setImportError(null);
    setPreviewData([]);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.trim().split(/\r?\n/);

        if (lines.length < 1) throw new Error("O ficheiro está vazio.");

        const newSales: KegSale[] = lines.map((line, index) => {
          const separator = line.includes(';') ? ';' : (line.includes('\t') ? '\t' : ',');
          const parts = line.split(separator).map(p => p.trim());

          if (parts.length < 5) {
            throw new Error(`Linha ${index + 1} inválida. Use: Data;Marca;Volume;Quantidade;Código;Valor`);
          }

          const [date, brand, vol, qty, code, val] = parts;

          return {
            id: Math.random().toString(36).substr(2, 9),
            date: date || new Date().toISOString(),
            brand: brand || 'Outras',
            volume: parseFloat(vol.replace(',', '.')) || 50,
            quantity: parseInt(qty) || 1,
            code: code || 'IMP-' + Math.random().toString(36).substr(2, 4).toUpperCase(),
            value: parseCurrency(val),
            status: 'Confirmado'
          };
        });

        setPreviewData(newSales);
      } catch (err: any) {
        setImportError(err.message);
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsText(file);
  };

  const triggerFileInput = () => fileInputRef.current?.click();

  return (
    <div className="max-w-5xl mx-auto animate-in zoom-in-95 duration-300 pb-20">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">

        {/* Navigation Tabs */}
        <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-col text-center md:text-left">
            <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">{initialData ? 'Editar Venda de Barril' : 'Registo Venda de Barris'}</h3>
            <p className="text-sm text-slate-500 font-medium italic">{initialData ? 'Altere os dados da venda abaixo.' : 'Selecione como deseja inserir as vendas.'}</p>
          </div>
          {!initialData && (
            <div className="flex bg-slate-200 p-1 rounded-xl shadow-inner shrink-0">
              <button
                onClick={() => setActiveTab('manual')}
                className={`px-6 py-2.5 text-xs font-black uppercase rounded-lg transition-all ${activeTab === 'manual' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Manual
              </button>
              <button
                onClick={() => setActiveTab('import')}
                className={`px-6 py-2.5 text-xs font-black uppercase rounded-lg transition-all ${activeTab === 'import' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Importar CSV
              </button>
            </div>
          )}
        </div>

        {activeTab === 'manual' ? (
          <form onSubmit={handleSubmitManual} className="p-10 space-y-10">
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-2 border-b border-slate-50 pb-2">
                <span className="material-symbols-outlined text-primary">qr_code_2</span>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Dados de Identificação</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <label className="flex flex-col w-full">
                  <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest pb-2">Data e Hora</span>
                  <input
                    type="date"
                    className="rounded-xl border-slate-200 h-14 font-bold text-slate-700 focus:ring-primary focus:border-primary transition-all"
                    value={formData.date}
                    onChange={e => setFormData(p => ({ ...p, date: e.target.value }))}
                  />
                </label>

                <label className="flex flex-col w-full">
                  <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest pb-2">Marca do Barril</span>
                  <select
                    className="rounded-xl border-slate-200 h-14 font-bold text-slate-700 focus:ring-primary focus:border-primary transition-all"
                    value={formData.brand}
                    onChange={e => setFormData(p => ({ ...p, brand: e.target.value }))}
                  >
                    <option value="">Selecione a marca...</option>
                    {state?.kegBrands && state.kegBrands.length > 0 ? (
                      state.kegBrands.map(brand => (
                        <option key={brand.id} value={brand.name}>{brand.name}</option>
                      ))
                    ) : (
                      <option value="" disabled>Nenhuma marca configurada</option>
                    )}
                  </select>
                </label>

                <label className="flex flex-col w-full">
                  <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest pb-2">Código da Venda</span>
                  <input
                    type="text"
                    className="rounded-xl border-slate-200 h-14 font-bold text-slate-700 focus:ring-primary focus:border-primary transition-all uppercase"
                    placeholder="EX: OCT-2023-A"
                    value={formData.code}
                    onChange={e => setFormData(p => ({ ...p, code: e.target.value }))}
                  />
                </label>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-2 border-b border-slate-50 pb-2">
                <span className="material-symbols-outlined text-primary">analytics</span>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Métricas e Valor</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <label className="flex flex-col w-full">
                  <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest pb-2">Volume (Litros)</span>
                  <input
                    type="number"
                    className="rounded-xl border-slate-200 h-14 font-bold text-slate-700 focus:ring-primary focus:border-primary transition-all"
                    placeholder="50"
                    value={formData.volume}
                    onChange={e => setFormData(p => ({ ...p, volume: e.target.value }))}
                  />
                </label>

                <label className="flex flex-col w-full">
                  <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest pb-2">Quantidade de Barris</span>
                  <input
                    type="number"
                    className="rounded-xl border-slate-200 h-14 font-bold text-slate-700 focus:ring-primary focus:border-primary transition-all"
                    placeholder="1"
                    value={formData.quantity}
                    onChange={e => setFormData(p => ({ ...p, quantity: e.target.value }))}
                  />
                </label>

                <label className="flex flex-col w-full">
                  <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest pb-2">Valor da Venda (MT)</span>
                  <input
                    type="number" step="0.01"
                    className="rounded-xl border-slate-200 h-14 font-black text-primary focus:ring-primary focus:border-primary transition-all"
                    placeholder="0.00"
                    value={formData.value}
                    onChange={e => setFormData(p => ({ ...p, value: e.target.value }))}
                  />
                </label>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-4 pt-8 border-t border-slate-100">
              <button type="button" onClick={onCancel} className="w-full sm:w-auto px-8 py-3 rounded-xl border border-slate-200 text-slate-500 font-bold hover:bg-slate-50 transition-all uppercase text-xs tracking-widest">
                Cancelar
              </button>
              <button type="submit" className="w-full sm:w-auto px-10 py-3 rounded-xl bg-primary text-white font-black hover:bg-primary-hover shadow-xl shadow-primary/20 transition-all flex items-center justify-center gap-2 uppercase text-xs tracking-widest">
                <span className="material-symbols-outlined text-[18px]">save</span>
                Registar Venda
              </button>
            </div>
          </form>
        ) : (
          <div className="p-10 space-y-10">
            {/* CSV Info */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex items-start gap-4">
              <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-primary">info</span>
              </div>
              <div className="text-xs text-slate-500 leading-relaxed font-medium">
                <p className="font-black text-slate-900 mb-1 uppercase tracking-tight">Preparação da Planilha:</p>
                O .CSV deve conter as colunas: <br />
                <span className="font-mono text-primary font-bold">Data; Marca; Volume; Quantidade; Código; Valor</span>
              </div>
            </div>

            {/* Dropzone */}
            <div
              onClick={triggerFileInput}
              className={`border-4 border-dashed rounded-[40px] p-20 flex flex-col items-center justify-center transition-all cursor-pointer group ${previewData.length > 0 ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-100 hover:border-primary/20 hover:bg-slate-50/50'
                }`}
            >
              <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileUpload} />

              {isProcessing ? (
                <div className="flex flex-col items-center">
                  <div className="size-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">A processar ficheiro...</p>
                </div>
              ) : previewData.length > 0 ? (
                <div className="flex flex-col items-center">
                  <div className="size-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
                    <span className="material-symbols-outlined text-[40px]">inventory_2</span>
                  </div>
                  <p className="text-xl font-black text-slate-900 tracking-tighter uppercase">{previewData.length} Vendas Identificadas</p>
                  <button className="text-xs font-bold text-primary mt-2 hover:underline">Trocar Planilha</button>
                </div>
              ) : (
                <div className="flex flex-col items-center text-center">
                  <div className="size-24 bg-slate-50 text-slate-300 rounded-[32px] flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-500 shadow-sm">
                    <span className="material-symbols-outlined text-[48px]">upload_file</span>
                  </div>
                  <p className="text-lg font-black text-slate-900 uppercase tracking-tighter">Carregar Ficheiro de Vendas</p>
                  <p className="text-xs text-slate-400 mt-2 font-medium">Arraste o seu CSV mensal aqui.</p>
                </div>
              )}
            </div>

            {importError && (
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-3 text-rose-600 text-xs font-bold animate-in shake">
                <span className="material-symbols-outlined">report</span>
                {importError}
              </div>
            )}

            {/* Preview Table */}
            {previewData.length > 0 && (
              <div className="animate-in slide-in-from-top-4 duration-500 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-50 pb-4">
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-[0.2em]">Pré-visualização da Importação</h4>
                </div>
                <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-50 text-slate-400 font-black uppercase tracking-widest">
                      <tr>
                        <th className="px-6 py-4">Data</th>
                        <th className="px-6 py-4">Marca</th>
                        <th className="px-6 py-4">Volume/Qtd</th>
                        <th className="px-6 py-4">Código</th>
                        <th className="px-6 py-4 text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 font-bold text-slate-700">
                      {previewData.map((rec, i) => (
                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-3 text-slate-400">{new Date(rec.date).toLocaleDateString('pt-BR')}</td>
                          <td className="px-6 py-3 text-slate-900 uppercase">{rec.brand}</td>
                          <td className="px-6 py-3">{rec.volume}L ({rec.quantity}un)</td>
                          <td className="px-6 py-3 text-slate-400">{rec.code}</td>
                          <td className="px-6 py-3 text-right text-emerald-600">{formatCurrency(rec.value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-end gap-6 pt-8 border-t border-slate-100">
                  <button onClick={() => setPreviewData([])} className="text-xs font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors">
                    Descartar
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Deseja confirmar o registo de ${previewData.length} vendas?`)) {
                        onSubmit(previewData);
                      } else {
                        onNotify?.('O registo não foi gravado.', 'error');
                      }
                    }}
                    className="px-12 py-4 bg-emerald-600 text-white rounded-xl font-black uppercase tracking-widest text-xs shadow-xl shadow-emerald-200 hover:bg-emerald-700 transition-all flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[20px]">task_alt</span>
                    Confirmar Tudo
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default KegSalesForm;
