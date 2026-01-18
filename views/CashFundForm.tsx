
import React, { useState, useRef } from 'react';
import { CashTransaction, AppState } from '../types';
import { formatCurrency, parseCurrency } from '../src/utils/format';

interface CashFundFormProps {
  state: AppState;
  onSubmit: (tx: CashTransaction | CashTransaction[]) => void;
  onCancel: () => void;
  onNotify?: (message: string, type: 'success' | 'error' | 'info') => void;
  onConfirmRequest?: (message: string) => Promise<boolean>;
  initialData?: CashTransaction;
}

const CashFundForm: React.FC<CashFundFormProps> = ({ state, onSubmit, onCancel, onNotify, onConfirmRequest, initialData }) => {
  const [activeTab, setActiveTab] = useState<'manual' | 'import' | 'transfer'>('manual');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    type: initialData?.type || 'saida' as 'entrada' | 'saida',
    date: initialData?.date || new Date().toISOString().split('T')[0],
    amount: initialData?.amount.toString() || '',
    category: initialData?.category || '',
    description: initialData?.description || '',
    manager: initialData?.manager || '',
    isVendaDinheiro: initialData?.isVendaDinheiro || false
  });

  const [transferData, setTransferData] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    fromManager: '',
    toManager: '',
    description: ''
  });

  const [previewData, setPreviewData] = useState<CashTransaction[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmitManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.category || !formData.manager) return;

    const confirmed = onConfirmRequest
      ? await onConfirmRequest('Deseja confirmar o registo deste movimento?')
      : confirm('Deseja confirmar o registo deste movimento?');

    if (!confirmed) {
      onNotify?.('O registo não foi gravado.', 'error');
      return;
    }

    onSubmit({
      id: Math.random().toString(36).substr(2, 9),
      type: formData.type,
      date: formData.date,
      amount: parseFloat(formData.amount),
      category: formData.category,
      description: formData.description,
      manager: formData.manager,
      isVendaDinheiro: formData.isVendaDinheiro
    });
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferData.amount || !transferData.fromManager || !transferData.toManager) return;

    if (transferData.fromManager === transferData.toManager) {
      onNotify?.('O gerente de origem e destino devem ser diferentes.', 'error');
      return;
    }

    const confirmed = onConfirmRequest
      ? await onConfirmRequest(`Deseja confirmar a transferência de ${formatCurrency(parseFloat(transferData.amount))} de ${transferData.fromManager} para ${transferData.toManager}?`)
      : confirm(`Deseja confirmar a transferência de ${formatCurrency(parseFloat(transferData.amount))} de ${transferData.fromManager} para ${transferData.toManager}?`);

    if (!confirmed) {
      onNotify?.('A transferência não foi gravada.', 'error');
      return;
    }

    const amountVal = parseFloat(transferData.amount);

    const exitTx: CashTransaction = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'saida',
      date: transferData.date,
      amount: amountVal,
      category: 'Transferência',
      description: `Transferência para ${transferData.toManager} ${transferData.description ? '- ' + transferData.description : ''}`,
      manager: transferData.fromManager,
      isVendaDinheiro: false
    };

    const entryTx: CashTransaction = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'entrada',
      date: transferData.date,
      amount: amountVal,
      category: 'Transferência',
      description: `Transferência de ${transferData.fromManager} ${transferData.description ? '- ' + transferData.description : ''}`,
      manager: transferData.toManager,
      isVendaDinheiro: false
    };

    onSubmit([exitTx, entryTx]);
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

        const newTransactions: CashTransaction[] = lines.map((line, index) => {
          // Detecta separador: ponto-e-vírgula (Excel PT) ou vírgula ou tab
          const separator = line.includes(';') ? ';' : (line.includes('\t') ? '\t' : ',');
          const parts = line.split(separator);

          if (parts.length < 5) {
            throw new Error(`Linha ${index + 1} inválida. O formato deve ser: Data;Tipo;Categoria;Descrição;Valor;Gerente;VD`);
          }

          const [date, type, category, description, amount, manager, vd] = parts.map(p => p.trim());

          return {
            id: Math.random().toString(36).substr(2, 9),
            date: date || new Date().toISOString().split('T')[0],
            type: (type?.toLowerCase().includes('ent') ? 'entrada' : 'saida') as 'entrada' | 'saida',
            category: category || 'Outros',
            description: description || '',
            amount: parseCurrency(amount),
            manager: manager || 'Gerente Geral',
            isVendaDinheiro: vd?.toLowerCase() === 's' || vd?.toLowerCase() === 'sim' || vd === '1'
          };
        });

        setPreviewData(newTransactions);
      } catch (err: any) {
        setImportError(err.message);
      } finally {
        setIsProcessing(false);
      }
    };

    reader.onerror = () => {
      setImportError("Erro ao ler o ficheiro.");
      setIsProcessing(false);
    };

    reader.readAsText(file);
  };

  const handleConfirmImport = async () => {
    if (previewData.length > 0) {
      const confirmed = onConfirmRequest
        ? await onConfirmRequest(`Deseja confirmar o registo de ${previewData.length} movimentos?`)
        : confirm(`Deseja confirmar o registo de ${previewData.length} movimentos?`);

      if (confirmed) {
        onSubmit(previewData);
      } else {
        onNotify?.('O registo não foi gravado.', 'error');
      }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="max-w-5xl mx-auto animate-in zoom-in-95 duration-300 pb-20">
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Header with Tabs */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">{initialData ? 'Editar Movimento' : 'Novo Movimento'}</h3>
            <p className="text-sm text-slate-500">{initialData ? 'Altere os dados do movimento abaixo.' : 'Registe manualmente ou importe dados via planilha.'}</p>
          </div>
          {!initialData && (
            <div className="flex bg-slate-200 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('manual')}
                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'manual' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Entrada Manual
              </button>
              <button
                onClick={() => setActiveTab('import')}
                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'import' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Importar CSV / Excel
              </button>
              <button
                onClick={() => setActiveTab('transfer')}
                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'transfer' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Transferência
              </button>
            </div>
          )}
        </div>

        {activeTab === 'manual' ? (
          <form onSubmit={handleSubmitManual} className="p-8 space-y-8">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-3">Tipo de Movimento</label>
              <div className="grid grid-cols-2 gap-4 max-w-md">
                <TypeOption
                  label="Entrada" icon="arrow_downward"
                  checked={formData.type === 'entrada'}
                  onChange={() => setFormData(p => ({ ...p, type: 'entrada' }))}
                  color="green"
                />
                <TypeOption
                  label="Saída" icon="arrow_upward"
                  checked={formData.type === 'saida'}
                  onChange={() => setFormData(p => ({ ...p, type: 'saida' }))}
                  color="primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="block text-sm font-bold text-slate-700">Data do Registo</label>
                <input
                  type="date"
                  className="block w-full rounded-lg border-slate-200 focus:ring-primary focus:border-primary"
                  value={formData.date}
                  onChange={e => setFormData(p => ({ ...p, date: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-bold text-slate-700">Valor (MT)</label>
                <input
                  type="number" step="0.01" required
                  className="block w-full rounded-lg border-slate-200 focus:ring-primary focus:border-primary text-right font-mono"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={e => setFormData(p => ({ ...p, amount: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="block text-sm font-bold text-slate-700">Categoria</label>
                <select
                  required
                  className="block w-full rounded-lg border-slate-200 focus:ring-primary focus:border-primary"
                  value={formData.category}
                  onChange={e => setFormData(p => ({ ...p, category: e.target.value }))}
                >
                  <option value="">Selecionar categoria...</option>
                  {state.categories && state.categories.length > 0 ? (
                    state.categories.map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))
                  ) : (
                    // Fallback in case state is empty initially (should not happen with sync issues, but safe)
                    <>
                      <option value="Alimentação">Alimentação</option>
                      <option value="Transporte">Transporte</option>
                      <option value="Manutenção">Manutenção</option>
                      <option value="Vendas">Vendas / Reforço</option>
                      <option value="Outros">Outros</option>
                    </>
                  )}
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-bold text-slate-700">Gerente Responsável</label>
                <select
                  required
                  className="block w-full rounded-lg border-slate-200 focus:ring-primary focus:border-primary font-medium"
                  value={formData.manager}
                  onChange={e => setFormData(p => ({ ...p, manager: e.target.value }))}
                >
                  <option value="">Selecionar gerente...</option>
                  {state.managers && state.managers.length > 0 ? (
                    state.managers.map(mgr => (
                      <option key={mgr.id} value={mgr.name}>{mgr.name} - {mgr.role}</option>
                    ))
                  ) : (
                    // Fallback in case state is empty initially
                    <>
                      <option value="Carlos Silva">Carlos Silva</option>
                      <option value="Ana Paula">Ana Paula</option>
                      <option value="Ricardo Gomes">Ricardo Gomes</option>
                      <option value="Juliana Costa">Juliana Costa</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-bold text-slate-700">Descrição (Opcional)</label>
              <textarea
                rows={3}
                className="block w-full rounded-lg border-slate-200 focus:ring-primary focus:border-primary"
                placeholder="Adicione detalhes sobre este movimento..."
                value={formData.description}
                onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
              />
            </div>

            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-900">Tipo de Venda (Com VD)</span>
                <span className="text-xs text-slate-500">Marque se esta transação inclui Venda Dinheiro.</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={formData.isVendaDinheiro}
                  onChange={e => setFormData(p => ({ ...p, isVendaDinheiro: e.target.checked }))}
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button" onClick={onCancel}
                className="px-6 py-2.5 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 text-sm font-bold text-white bg-primary rounded-lg hover:bg-primary-hover shadow-md shadow-primary/20 transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">save</span>
                Salvar Registo
              </button>
            </div>
          </form>
        ) : activeTab === 'transfer' ? (
          <form onSubmit={handleTransferSubmit} className="p-8 space-y-8 animate-in slide-in-from-right-4 duration-300">
            <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl flex items-start gap-3">
              <span className="material-symbols-outlined text-blue-600 mt-0.5">swap_horiz</span>
              <div>
                <h4 className="text-sm font-bold text-blue-900">Transferência entre Gerentes</h4>
                <p className="text-xs text-blue-700 mt-1">
                  Esta operação criará automaticamente uma saída no gerente de origem e uma entrada correspondente no gerente de destino.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
              <div className="space-y-1">
                <label className="block text-sm font-bold text-slate-700">De (Origem)</label>
                <div className="relative">
                  <select
                    required
                    className="block w-full rounded-lg border-slate-200 focus:ring-primary focus:border-primary pl-10"
                    value={transferData.fromManager}
                    onChange={e => setTransferData(p => ({ ...p, fromManager: e.target.value }))}
                  >
                    <option value="">Selecionar origem...</option>
                    {state.managers && state.managers.length > 0 ? (
                      state.managers.map(mgr => (
                        <option key={mgr.id} value={mgr.name}>{mgr.name}</option>
                      ))
                    ) : (
                      state.cashTransactions.map(t => t.manager).filter((v, i, a) => a.indexOf(v) === i).map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))
                    )}
                  </select>
                  <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-[20px]">person_remove</span>
                </div>
              </div>

              {/* Arrow Indicator for Desktop */}
              <div className="hidden md:flex absolute left-1/2 top-8 -translate-x-1/2 justify-center items-center pointer-events-none z-10 bg-white rounded-full p-1 border border-slate-100 shadow-sm text-slate-300">
                <span className="material-symbols-outlined">arrow_forward</span>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-bold text-slate-700">Para (Destino)</label>
                <div className="relative">
                  <select
                    required
                    className="block w-full rounded-lg border-slate-200 focus:ring-primary focus:border-primary pl-10"
                    value={transferData.toManager}
                    onChange={e => setTransferData(p => ({ ...p, toManager: e.target.value }))}
                  >
                    <option value="">Selecionar destino...</option>
                    {state.managers && state.managers.length > 0 ? (
                      state.managers.map(mgr => (
                        <option key={mgr.id} value={mgr.name}>{mgr.name}</option>
                      ))
                    ) : (
                      state.cashTransactions.map(t => t.manager).filter((v, i, a) => a.indexOf(v) === i).map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))
                    )}
                  </select>
                  <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-[20px]">person_add</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="block text-sm font-bold text-slate-700">Data da Transferência</label>
                <input
                  type="date"
                  required
                  className="block w-full rounded-lg border-slate-200 focus:ring-primary focus:border-primary"
                  value={transferData.date}
                  onChange={e => setTransferData(p => ({ ...p, date: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-bold text-slate-700">Valor a Transferir (MT)</label>
                <input
                  type="number" step="0.01" required min="0.01"
                  className="block w-full rounded-lg border-slate-200 focus:ring-primary focus:border-primary text-right font-mono"
                  placeholder="0.00"
                  value={transferData.amount}
                  onChange={e => setTransferData(p => ({ ...p, amount: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-bold text-slate-700">Motivo / Descrição</label>
              <textarea
                rows={2}
                className="block w-full rounded-lg border-slate-200 focus:ring-primary focus:border-primary"
                placeholder="Ex: Ajuste de caixa, Troco, etc..."
                value={transferData.description}
                onChange={e => setTransferData(p => ({ ...p, description: e.target.value }))}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button" onClick={onCancel}
                className="px-6 py-2.5 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">sync_alt</span>
                Confirmar Transferência
              </button>
            </div>
          </form>
        ) : (
          <div className="p-8 space-y-6">
            <div className="bg-primary/5 border border-primary/10 p-5 rounded-xl flex gap-4">
              <div className="bg-primary/10 p-2 rounded-lg h-fit">
                <span className="material-symbols-outlined text-primary">description</span>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Preparação do Ficheiro</p>
                <p className="text-xs text-slate-600 mt-1">O sistema aceita ficheiros <strong>.csv</strong> (separados por ponto e vírgula). No Excel, use "Guardar Como" e escolha "CSV (Separado por vírgulas)".</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="bg-white border border-slate-200 px-2 py-1 rounded text-[10px] font-bold text-slate-500">Data</span>
                  <span className="bg-white border border-slate-200 px-2 py-1 rounded text-[10px] font-bold text-slate-500">Tipo</span>
                  <span className="bg-white border border-slate-200 px-2 py-1 rounded text-[10px] font-bold text-slate-500">Categoria</span>
                  <span className="bg-white border border-slate-200 px-2 py-1 rounded text-[10px] font-bold text-slate-500">Descrição</span>
                  <span className="bg-white border border-slate-200 px-2 py-1 rounded text-[10px] font-bold text-slate-500">Valor</span>
                  <span className="bg-white border border-slate-200 px-2 py-1 rounded text-[10px] font-bold text-slate-500">Gerente</span>
                  <span className="bg-white border border-slate-200 px-2 py-1 rounded text-[10px] font-bold text-slate-500">VD</span>
                </div>
              </div>
            </div>

            <div
              onClick={triggerFileInput}
              className={`relative border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center transition-all cursor-pointer group ${previewData.length > 0 ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200 hover:border-primary/40 hover:bg-slate-50'
                }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".csv"
                onChange={handleFileUpload}
              />

              {isProcessing ? (
                <div className="flex flex-col items-center">
                  <div className="h-10 w-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
                  <p className="text-sm font-bold text-slate-600">Lendo ficheiro...</p>
                </div>
              ) : previewData.length > 0 ? (
                <div className="flex flex-col items-center">
                  <div className="size-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-[40px]">check_circle</span>
                  </div>
                  <p className="text-lg font-bold text-slate-900">Ficheiro Carregado!</p>
                  <p className="text-sm text-slate-500 mt-1">{previewData.length} transações encontradas.</p>
                  <button className="mt-4 text-xs font-bold text-primary hover:underline">Trocar ficheiro</button>
                </div>
              ) : (
                <div className="flex flex-col items-center text-center">
                  <div className="size-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-4 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    <span className="material-symbols-outlined text-[40px]">upload_file</span>
                  </div>
                  <p className="text-lg font-bold text-slate-900">Carregar Planilha de Movimentos</p>
                  <p className="text-sm text-slate-500 mt-2 max-w-xs">Clique aqui ou arraste o seu ficheiro .csv para processar os lançamentos em lote.</p>
                </div>
              )}
            </div>

            {importError && (
              <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl flex gap-3 text-rose-700 animate-in fade-in slide-in-from-top-1">
                <span className="material-symbols-outlined">error</span>
                <p className="text-sm font-bold">{importError}</p>
              </div>
            )}

            {previewData.length > 0 && (
              <div className="space-y-4 animate-in slide-in-from-top-4 duration-300">
                <div className="flex items-center justify-between border-t border-slate-100 pt-6">
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Pré-visualização dos Dados</h4>
                  <span className="text-xs font-bold text-slate-400 italic">Verifique os dados antes de confirmar</span>
                </div>
                <div className="overflow-x-auto border border-slate-100 rounded-xl">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                      <tr>
                        <th className="px-4 py-3">Data</th>
                        <th className="px-4 py-3">Tipo</th>
                        <th className="px-4 py-3">Categoria</th>
                        <th className="px-4 py-3">Descrição</th>
                        <th className="px-4 py-3">Gerente</th>
                        <th className="px-4 py-3 text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {previewData.map((tx, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-4 py-2.5 font-medium text-slate-500">{tx.date}</td>
                          <td className="px-4 py-2.5">
                            <span className={`font-bold ${tx.type === 'entrada' ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {tx.type === 'entrada' ? 'ENTRADA' : 'SAÍDA'}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">{tx.category}</td>
                          <td className="px-4 py-2.5 truncate max-w-[150px]">{tx.description}</td>
                          <td className="px-4 py-2.5 font-bold">{tx.manager}</td>
                          <td className={`px-4 py-2.5 text-right font-mono font-bold ${tx.type === 'entrada' ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {formatCurrency(tx.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-end gap-3 pt-6">
                  <button
                    onClick={() => { setPreviewData([]); setImportError(null); }}
                    className="px-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-700"
                  >
                    Descartar e Recomeçar
                  </button>
                  <button
                    onClick={handleConfirmImport}
                    className="px-10 py-3 text-sm font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-200 flex items-center gap-2 transition-all hover:-translate-y-0.5"
                  >
                    <span className="material-symbols-outlined text-[20px]">cloud_upload</span>
                    Finalizar Importação
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

const TypeOption = ({ label, icon, checked, onChange, color }: any) => (
  <label className="relative flex cursor-pointer">
    <input type="radio" className="peer sr-only" checked={checked} onChange={onChange} />
    <div className={`w-full p-4 rounded-lg border-2 border-slate-200 peer-checked:border-${color === 'green' ? 'emerald-600' : 'primary'} peer-checked:bg-${color === 'green' ? 'emerald-50' : 'primary/5'} transition-all flex items-center justify-center gap-2 group hover:border-slate-300`}>
      <span className={`material-symbols-outlined text-slate-400 peer-checked:text-${color === 'green' ? 'emerald-600' : 'primary'}`}>{icon}</span>
      <span className={`font-bold text-slate-600 peer-checked:text-${color === 'green' ? 'emerald-800' : 'primary'}`}>{label}</span>
    </div>
  </label>
);

export default CashFundForm;
