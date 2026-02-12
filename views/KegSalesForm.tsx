
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

interface KegImportRow {
  date: string;
  brand: string;
  type: 'purchase' | 'sale';
  quantity?: number; // Qty for purchase
  liters?: number;   // Volume for sale
  value?: number;    // Total value for purchase
  capacity?: number; // Capacity for purchase
  code?: string;     // Custom code for purchase
}

const KegSalesForm: React.FC<KegSalesFormProps> = ({
  state, onSubmit, onAddKeg, onUpdateKeg, onProcessSales, onCancel, onNotify, onConfirmRequest,
  initialData, initialKegData
}) => {
  const [activeTab, setActiveTab] = useState<'manual' | 'import'>('manual');
  const [operationType, setOperationType] = useState<'purchase' | 'sale' | 'edit'>(initialKegData ? 'edit' : 'purchase');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Import State
  const [previewData, setPreviewData] = useState<KegImportRow[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

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
    processFile(file);
  };

  const processFile = (file: File) => {
    setIsProcessing(true);
    setImportError(null);
    setPreviewData([]);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.trim().split(/\r?\n/);

        if (lines.length < 1) {
          throw new Error("O ficheiro está vazio.");
        }

        const firstLine = lines[0].toLowerCase();
        // DATA, MARCA, TIPO, QTD_VOL, VALOR, CAPACIDADE, CODIGO
        const hasHeader = firstLine.includes('data') && (firstLine.includes('marca') || firstLine.includes('tipo'));
        const dataLines = hasHeader ? lines.slice(1) : lines;
        const validLines = dataLines.filter(line => line.trim() !== '');

        if (validLines.length < 1) {
          throw new Error("O ficheiro não contém dados válidos.");
        }

        const errors: string[] = [];
        const newRows: KegImportRow[] = [];

        validLines.forEach((line, index) => {
          const lineNumber = index + 1 + (hasHeader ? 1 : 0);
          try {
            const separator = line.includes(';') ? ';' : (line.includes('\t') ? '\t' : ',');
            const parts = line.split(separator).map(p => p.trim());

            if (parts.length < 4) {
              errors.push(`Linha ${lineNumber}: Colunas insuficientes. Necessário: DATA, MARCA, TIPO, QTD_UNI.`);
              return;
            }

            const [date, brand, typeStr, qtyVol, value, capacity, code] = parts;

            // Validate Date
            let parsedDate = date;
            if (!date) {
              errors.push(`Linha ${lineNumber}: DATA está vazia.`);
              return;
            }
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
              const [d, m, y] = date.split('/');
              parsedDate = `${y}-${m}-${d}`;
            }

            // Validate Brand
            if (!brand) {
              errors.push(`Linha ${lineNumber}: MARCA está vazia.`);
              return;
            }

            // Validate Type
            const typeNorm = typeStr.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const isPurchase = typeNorm.includes('ent') || typeNorm.includes('comp');
            const isSale = typeNorm.includes('sai') || typeNorm.includes('vend');

            if (!isPurchase && !isSale) {
              errors.push(`Linha ${lineNumber}: TIPO inválido "${typeStr}". Use "Entrada" ou "Saída".`);
              return;
            }

            // Validate Qty/Vol
            const parsedQtyVol = parseFloat(qtyVol.replace(',', '.')) || 0;
            if (parsedQtyVol <= 0) {
              errors.push(`Linha ${lineNumber}: QUANTIDADE/VOLUME deve ser maior que zero.`);
              return;
            }

            newRows.push({
              date: parsedDate,
              brand: brand,
              type: isPurchase ? 'purchase' : 'sale',
              quantity: isPurchase ? Math.round(parsedQtyVol) : undefined,
              liters: isSale ? parsedQtyVol : undefined,
              value: isPurchase ? (parseFloat(value?.replace(',', '.')) || 0) : undefined,
              capacity: isPurchase ? (parseFloat(capacity?.replace(',', '.')) || 50) : undefined,
              code: isPurchase ? code : undefined
            });
          } catch (err: any) {
            errors.push(`Linha ${lineNumber}: ${err.message}`);
          }
        });

        if (errors.length > 0) {
          throw new Error(errors.slice(0, 5).join('\n'));
        }

        setPreviewData(newRows);
      } catch (err: any) {
        setImportError(err.message);
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = async () => {
    if (previewData.length > 0) {
      const confirmed = onConfirmRequest
        ? await onConfirmRequest(`Deseja confirmar o processamento de ${previewData.length} registos?`)
        : confirm(`Deseja confirmar o processamento de ${previewData.length} registos?`);

      if (!confirmed) return;

      try {
        setIsProcessing(true);
        // Process sequentially to avoid state race conditions if any
        for (const row of previewData) {
          if (row.type === 'purchase') {
            const qty = row.quantity || 1;
            const capacity = row.capacity || 50;
            const pricePerKeg = (row.value || 0) / qty;
            const newKegs: Keg[] = [];

            for (let i = 0; i < qty; i++) {
              const brandPrefix = row.brand.substring(0, 3).toUpperCase().replace(/\s/g, '');
              const datePart = row.date.replace(/-/g, '').substring(2);
              const autoCode = `${brandPrefix}-${datePart}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

              newKegs.push({
                id: Math.random().toString(36).substr(2, 9),
                brand: row.brand,
                capacity: capacity,
                currentLiters: capacity,
                purchasePrice: pricePerKeg,
                purchaseDate: row.date,
                status: 'Novo',
                code: row.code || autoCode
              });
            }
            onAddKeg(newKegs);
          } else {
            onProcessSales(row.brand, row.liters || 0, row.date);
          }
        }
        onNotify?.('Importação concluída com sucesso!', 'success');
        onCancel();
      } catch (err: any) {
        setImportError("Erro ao processar importação: " + err.message);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const downloadTemplate = () => {
    const headers = 'DATA;MARCA;TIPO;QTD_UNI;VALOR_TOTAL;CAPACIDADE;CODIGO_LOTE';
    const row1 = '2024-02-12;2M;Entrada;10;15000;50;LOTE-FEB-001';
    const row2 = '2024-02-12;Laurentina;Saída;120.5;;;';
    const content = `${headers}\n${row1}\n${row2}`;
    const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'modelo_controlo_barris.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onNotify?.('Modelo baixado!', 'success');
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

        {activeTab === 'manual' ? (
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

            <div className="flex justify-end gap-4 pt-8 border-t">
              <button type="button" onClick={onCancel} className="px-8 py-3 rounded-xl border font-bold text-slate-400 uppercase text-xs">Cancelar</button>
              <button type="submit" className={`px-10 py-3 rounded-xl text-white font-black uppercase text-xs shadow-xl ${operationType === 'purchase' ? 'bg-primary' : (operationType === 'edit' ? 'bg-slate-900' : 'bg-emerald-600')}`}>
                {operationType === 'purchase' ? 'Registar Entrada' : (operationType === 'edit' ? 'Salvar Alterações' : 'Processar Saída FIFO')}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-10 space-y-8 animate-in slide-in-from-right-4 duration-300">
            {/* Download Template Section */}
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 p-6 rounded-[32px] flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className="bg-white p-4 rounded-2xl shadow-sm">
                  <span className="material-symbols-outlined text-emerald-600 text-[32px]">download_for_offline</span>
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">Baixar Modelo de Importação</h4>
                  <p className="text-xs text-slate-500 mt-1 font-medium">Use este ficheiro para organizar as entradas e consumos.</p>
                </div>
              </div>
              <button
                onClick={downloadTemplate}
                className="bg-emerald-600 text-white px-8 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">file_download</span>
                Baixar CSV
              </button>
            </div>

            {/* Instruction Grid */}
            <div className="bg-slate-50 border border-slate-100 p-6 rounded-[32px]">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 text-center">Formato do Ficheiro</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {[
                  { n: 1, l: 'DATA', d: 'AAAA-MM-DD' },
                  { n: 2, l: 'MARCA', d: 'Ex: 2M' },
                  { n: 3, l: 'TIPO', d: 'Entrada/Saída' },
                  { n: 4, l: 'QTD_UNI', d: 'Qtd(E) / L(S)' },
                  { n: 5, l: 'VALOR', d: 'Total Entrada' },
                  { n: 6, l: 'CAPAC.', d: 'L/Barril (E)' },
                  { n: 7, l: 'CÓDIGO', d: 'Lote (E)' }
                ].map(c => (
                  <div key={c.n} className="bg-white border border-slate-100 p-3 rounded-xl text-center">
                    <span className="block text-[10px] font-black text-primary/40 leading-none mb-1">{c.n}</span>
                    <span className="block text-[10px] font-black text-slate-700 mb-1">{c.l}</span>
                    <span className="block text-[9px] text-slate-400 font-medium italic">{c.d}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Upload Area */}
            <div
              onClick={() => !isProcessing && fileInputRef.current?.click()}
              className={`border-4 border-dashed rounded-[40px] p-20 flex flex-col items-center justify-center transition-all cursor-pointer group 
                ${previewData.length > 0 ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-100 hover:border-primary/30 hover:bg-slate-50/50'}`}
            >
              <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileUpload} />

              {isProcessing ? (
                <div className="flex flex-col items-center">
                  <div className="size-12 border-4 border-slate-100 border-t-primary rounded-full animate-spin mb-4"></div>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">A processar...</p>
                </div>
              ) : previewData.length > 0 ? (
                <div className="flex flex-col items-center text-center">
                  <div className="size-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-[40px]">check_circle</span>
                  </div>
                  <h4 className="text-lg font-black text-slate-800 uppercase leading-none">{previewData.length} Registos Prontos</h4>
                  <p className="text-xs text-slate-500 font-medium mt-2 italic">Clique em "Processar em Lote" abaixo para finalizar.</p>
                  <button className="mt-4 text-[10px] font-black text-primary uppercase underline tracking-widest">Trocar Ficheiro</button>
                </div>
              ) : (
                <>
                  <div className="size-20 bg-slate-100 text-slate-300 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-[40px]">cloud_upload</span>
                  </div>
                  <h4 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Carregar Planilha</h4>
                  <p className="text-[11px] text-slate-400 font-medium mt-2">Arraste ou clique para selecionar o seu ficheiro .csv</p>
                </>
              )}
            </div>

            {importError && (
              <div className="bg-red-50 border border-red-100 p-6 rounded-[32px] flex items-start gap-4 animate-in slide-in-from-top-4">
                <span className="material-symbols-outlined text-red-500">warning</span>
                <div className="flex-1">
                  <h5 className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-2">Erro detectado</h5>
                  <p className="text-xs font-mono text-red-600 leading-relaxed whitespace-pre-line">{importError}</p>
                </div>
              </div>
            )}

            {previewData.length > 0 && (
              <div className="space-y-6 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Pré-visualização</h4>
                  <button onClick={() => setPreviewData([])} className="text-[10px] font-black text-slate-400 uppercase hover:text-red-500 transition-colors">Limpar</button>
                </div>

                <div className="bg-white border border-slate-100 rounded-[28px] overflow-hidden">
                  <table className="w-full text-[11px] font-bold">
                    <thead className="bg-slate-50/50 border-b border-slate-100 text-[10px] text-slate-400 uppercase">
                      <tr>
                        <th className="px-6 py-4 text-left">Data</th>
                        <th className="px-6 py-4 text-left">Marca</th>
                        <th className="px-6 py-4 text-center">Tipo</th>
                        <th className="px-6 py-4 text-right">Qtd/L</th>
                        <th className="px-6 py-4 text-right">Valor</th>
                        <th className="px-6 py-4 text-left">Cód.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {previewData.slice(0, 10).map((row, i) => (
                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 text-slate-500">{row.date}</td>
                          <td className="px-6 py-4 text-slate-900">{row.brand}</td>
                          <td className="px-6 py-4 text-center">
                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${row.type === 'purchase' ? 'bg-primary/10 text-primary' : 'bg-emerald-100 text-emerald-600'}`}>
                              {row.type === 'purchase' ? 'Entrada' : 'Saída'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right font-black">
                            {row.type === 'purchase' ? row.quantity : row.liters?.toFixed(1) + ' L'}
                          </td>
                          <td className="px-6 py-4 text-right text-slate-500">
                            {row.value ? formatCurrency(row.value) : '-'}
                          </td>
                          <td className="px-6 py-4 text-slate-400 italic truncate max-w-[80px]">{row.code || '-'}</td>
                        </tr>
                      ))}
                      {previewData.length > 10 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-3 text-center text-[10px] text-slate-400 font-bold bg-slate-50/30">
                            + {previewData.length - 10} registos adicionais...
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end gap-4 pt-4">
                  <button
                    onClick={onCancel}
                    className="px-10 py-4 rounded-2xl border font-black text-slate-400 uppercase text-[10px] tracking-widest"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmImport}
                    className="px-12 py-4 rounded-2xl bg-primary text-white font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl shadow-primary/20 hover:scale-105 transition-transform"
                  >
                    Processar em Lote
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

