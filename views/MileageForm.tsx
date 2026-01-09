
import React, { useState, useRef } from 'react';
import { MileageRecord, AppState } from '../types';
import { formatCurrency, parseCurrency } from '../src/utils/format';

interface MileageFormProps {
  state?: AppState;
  onSubmit: (record: MileageRecord | MileageRecord[]) => void;
  onCancel: () => void;
  onNotify?: (message: string, type: 'success' | 'error' | 'info') => void;
  onConfirmRequest?: (message: string) => Promise<boolean>;
  initialData?: MileageRecord;
}

const MileageForm: React.FC<MileageFormProps> = ({ state, onSubmit, onCancel, onNotify, onConfirmRequest, initialData }) => {
  const [activeTab, setActiveTab] = useState<'manual' | 'import'>('manual');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State for Manual Form
  const [formData, setFormData] = useState({
    date: initialData?.date || new Date().toISOString().split('T')[0],
    vehicle: initialData?.vehicle || '',
    kmInitial: initialData?.kmInitial.toString() || '',
    kmFinal: initialData?.kmFinal.toString() || '',
    liters: initialData?.liters.toString() || '',
    cost: initialData?.cost.toString() || ''
  });

  // State for Import
  const [previewData, setPreviewData] = useState<MileageRecord[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const kmPercorridos = (parseFloat(formData.kmFinal) || 0) - (parseFloat(formData.kmInitial) || 0);

  const handleSubmitManual = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.kmFinal || !formData.liters) return;

    const confirmed = onConfirmRequest
      ? await onConfirmRequest('Deseja confirmar o registo desta quilometragem?')
      : confirm('Deseja confirmar o registo desta quilometragem?');

    if (!confirmed) {
      onNotify?.('O registo não foi gravado.', 'error');
      return;
    }

    if ((parseFloat(formData.kmFinal) || 0) <= (parseFloat(formData.kmInitial) || 0)) {
      setError("A quilometragem final deve ser maior que a inicial.");
      return;
    }

    onSubmit({
      id: Math.random().toString(36).substr(2, 9),
      date: formData.date,
      vehicle: formData.vehicle,
      kmInitial: parseFloat(formData.kmInitial) || 0,
      kmFinal: parseFloat(formData.kmFinal) || 0,
      liters: parseFloat(formData.liters) || 0,
      cost: parseFloat(formData.cost) || 0
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

        if (lines.length < 1) throw new Error("O ficheiro carregado parece estar vazio.");

        const newRecords: MileageRecord[] = lines.map((line, index) => {
          // Detect separator: ; (Excel standard in many regions) or , or tab
          const separator = line.includes(';') ? ';' : (line.includes('\t') ? '\t' : ',');
          const parts = line.split(separator);

          if (parts.length < 5) {
            throw new Error(`Linha ${index + 1} inválida. O formato deve ser: Data;Veículo;KmIni;KmFin;Litros;Custo`);
          }

          const [date, vehicle, kmIni, kmFin, liters, cost] = parts.map(p => p.trim());

          return {
            id: Math.random().toString(36).substr(2, 9),
            date: date || new Date().toISOString().split('T')[0],
            vehicle: vehicle || 'MOTO-NÃO-IDENTIFICADA',
            kmInitial: parseFloat(kmIni) || 0,
            kmFinal: parseFloat(kmFin) || 0,
            liters: parseFloat(liters.replace(',', '.')) || 0,
            cost: parseCurrency(cost)
          };
        });

        setPreviewData(newRecords);
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
    <div className="max-w-4xl mx-auto animate-in zoom-in-95 duration-300 pb-20">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        {/* Navigation Tabs */}
        <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-col text-center md:text-left">
            <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">{initialData ? 'Editar Registo' : 'Registo de Quilometragem'}</h3>
            <p className="text-sm text-slate-500 font-medium italic">{initialData ? 'Altere os dados abaixo.' : 'Escolha o método de entrada de dados.'}</p>
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
          <form onSubmit={handleSubmitManual} className="p-10 space-y-8">
            <div className="flex items-center gap-2 mb-2 border-b border-slate-50 pb-2">
              <span className="material-symbols-outlined text-primary">speed</span>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Dados do Veículo e Data</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <label className="flex flex-col w-full">
                <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest pb-2">Data do Registo</span>
                <input
                  type="date"
                  className="rounded-xl border-slate-200 h-14 font-bold text-slate-700 focus:ring-primary focus:border-primary transition-all"
                  value={formData.date}
                  onChange={e => setFormData(p => ({ ...p, date: e.target.value }))}
                />
              </label>

              <label className="flex flex-col w-full">
                <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest pb-2">Veículo</span>
                <select
                  className="rounded-xl border-slate-200 h-14 font-bold text-slate-700 focus:ring-primary focus:border-primary transition-all"
                  value={formData.vehicle}
                  onChange={e => setFormData(p => ({ ...p, vehicle: e.target.value }))}
                >
                  <option value="">Selecionar veículo...</option>
                  {state && state.vehicles && state.vehicles.length > 0 && (
                    state.vehicles.map(veh => (
                      <option key={veh.id} value={`${veh.model} (${veh.plate})`}>
                        {veh.model} ({veh.plate})
                      </option>
                    ))
                  )}
                </select>
              </label>
            </div>

            <div className="flex items-center gap-2 mb-2 border-b border-slate-50 pb-2">
              <span className="material-symbols-outlined text-primary">distance</span>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Quilometragem e Percurso</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <label className="flex flex-col w-full">
                <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest pb-2">Km Inicial</span>
                <input
                  type="number"
                  className="rounded-xl border-slate-200 h-14 font-bold text-slate-700 focus:ring-primary focus:border-primary transition-all"
                  placeholder="0"
                  value={formData.kmInitial}
                  onChange={e => setFormData(p => ({ ...p, kmInitial: e.target.value }))}
                />
              </label>

              <label className="flex flex-col w-full">
                <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest pb-2">Km Final</span>
                <input
                  type="number"
                  className="rounded-xl border-slate-200 h-14 font-bold text-slate-700 focus:ring-primary focus:border-primary transition-all"
                  placeholder="0"
                  value={formData.kmFinal}
                  onChange={e => setFormData(p => ({ ...p, kmFinal: e.target.value }))}
                />
              </label>

              <label className="flex flex-col w-full">
                <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest pb-2">Total Percorrido</span>
                <div className="h-14 rounded-xl bg-slate-50 border border-slate-100 flex items-center px-5 font-black text-slate-900">
                  {kmPercorridos < 0 ? 0 : kmPercorridos} km
                </div>
              </label>
            </div>

            <div className="flex items-center gap-2 mb-2 border-b border-slate-50 pb-2">
              <span className="material-symbols-outlined text-primary">local_gas_station</span>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Abastecimento</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <label className="flex flex-col w-full">
                <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest pb-2">Litros Abastecidos</span>
                <input
                  type="number" step="0.01"
                  className="rounded-xl border-slate-200 h-14 font-bold text-slate-700 focus:ring-primary focus:border-primary transition-all"
                  placeholder="0.00"
                  value={formData.liters}
                  onChange={e => setFormData(p => ({ ...p, liters: e.target.value }))}
                />
              </label>

              <label className="flex flex-col w-full">
                <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest pb-2">Custo Total (MT)</span>
                <input
                  type="number" step="0.01"
                  className="rounded-xl border-slate-200 h-14 font-bold text-slate-700 focus:ring-primary focus:border-primary transition-all"
                  placeholder="0.00"
                  value={formData.cost}
                  onChange={e => setFormData(p => ({ ...p, cost: e.target.value }))}
                />
              </label>
            </div>

            {error && (
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-3 text-rose-600 text-xs font-bold animate-in shake">
                <span className="material-symbols-outlined">report</span>
                {error}
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-4 pt-6 border-t border-slate-100">
              <button type="button" onClick={onCancel} className="w-full sm:w-auto px-8 py-3 rounded-xl border border-slate-200 text-slate-500 font-bold hover:bg-slate-50 transition-all uppercase text-xs tracking-widest">
                Cancelar
              </button>
              <button type="submit" className="w-full sm:w-auto px-10 py-3 rounded-xl bg-primary text-white font-black hover:bg-primary-hover shadow-xl shadow-primary/20 transition-all flex items-center justify-center gap-2 uppercase text-xs tracking-widest">
                <span className="material-symbols-outlined text-[18px]">save</span>
                Salvar Registo
              </button>
            </div>
          </form>
        ) : (
          <div className="p-10 space-y-8">
            {/* CSV Info */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex items-start gap-4">
              <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-primary">info</span>
              </div>
              <div className="text-xs text-slate-500 leading-relaxed font-medium">
                <p className="font-black text-slate-900 mb-1 uppercase tracking-tight">Formato do Ficheiro:</p>
                O ficheiro deve ser um <strong>.CSV</strong> com as colunas: <br />
                <span className="font-mono text-primary font-bold">Data; Veículo; Km Inicial; Km Final; Litros; Custo</span>
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
                    <span className="material-symbols-outlined text-[40px]">check_circle</span>
                  </div>
                  <p className="text-xl font-black text-slate-900 tracking-tighter uppercase">{previewData.length} Registos Detetados</p>
                  <button className="text-xs font-bold text-primary mt-2 hover:underline">Alterar ficheiro</button>
                </div>
              ) : (
                <div className="flex flex-col items-center text-center">
                  <div className="size-24 bg-slate-50 text-slate-300 rounded-[32px] flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-500 shadow-sm">
                    <span className="material-symbols-outlined text-[48px]">cloud_upload</span>
                  </div>
                  <p className="text-lg font-black text-slate-900 uppercase tracking-tighter">Clique para carregar o .csv</p>
                  <p className="text-xs text-slate-400 mt-2 font-medium">Arraste aqui a sua folha de quilometragem mensal.</p>
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
                <div className="overflow-x-auto border border-slate-100 rounded-2xl shadow-sm">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-50 text-slate-400 font-black uppercase tracking-widest">
                      <tr>
                        <th className="px-6 py-4">Data</th>
                        <th className="px-6 py-4">Veículo</th>
                        <th className="px-6 py-4">Distância</th>
                        <th className="px-6 py-4">Litros</th>
                        <th className="px-6 py-4 text-right">Custo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 font-bold">
                      {previewData.slice(0, 10).map((rec, i) => (
                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-3 text-slate-400">{rec.date}</td>
                          <td className="px-6 py-3 text-slate-800 uppercase tracking-tighter">{rec.vehicle}</td>
                          <td className="px-6 py-3">{rec.kmFinal - rec.kmInitial} km</td>
                          <td className="px-6 py-3">{rec.liters} L</td>
                          <td className="px-6 py-3 text-right text-primary">{formatCurrency(rec.cost)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {previewData.length > 10 && (
                    <div className="p-3 text-center text-[10px] text-slate-400 font-black bg-slate-50/50 uppercase tracking-widest border-t border-slate-50">
                      + {previewData.length - 10} registos adicionais ocultos na pré-visualização
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-4 pt-6 border-t border-slate-100">
                  <button onClick={() => setPreviewData([])} className="text-xs font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors">
                    Descartar
                  </button>
                  <button
                    onClick={async () => {
                      const confirmed = onConfirmRequest
                        ? await onConfirmRequest(`Deseja confirmar o registo de ${previewData.length} quilometragens?`)
                        : confirm(`Deseja confirmar o registo de ${previewData.length} quilometragens?`);

                      if (confirmed) {
                        onSubmit(previewData);
                      } else {
                        onNotify?.('O registo não foi gravado.', 'error');
                      }
                    }}
                    className="px-10 py-3 bg-emerald-600 text-white rounded-xl font-black uppercase tracking-widest text-xs shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">done_all</span>
                    Confirmar Importação
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

export default MileageForm;
