import React, { useState } from 'react';
import { AppState, ViewType } from '../types';

interface SettingsViewProps {
    state: AppState;
    onNavigate: (view: ViewType) => void;
    onAddCategory?: (name: string) => Promise<void>;
    onUpdateCategory?: (id: string, name: string) => Promise<void>;
    onDeleteCategory?: (id: string) => Promise<void>;
    onAddManager?: (name: string, role: string) => Promise<void>;
    onUpdateManager?: (id: string, name: string, role: string) => Promise<void>;
    onDeleteManager?: (id: string) => Promise<void>;
    onAddVehicle?: (model: string, plate: string, type: string) => Promise<void>;
    onUpdateVehicle?: (id: string, model: string, plate: string, type: string) => Promise<void>;
    onDeleteVehicle?: (id: string) => Promise<void>;
    onAddKegBrand?: (name: string) => Promise<void>;
    onUpdateKegBrand?: (id: string, name: string) => Promise<void>;
    onDeleteKegBrand?: (id: string) => Promise<void>;
    onNotify?: (message: string, type: 'success' | 'error' | 'info') => void;
    onConfirmRequest?: (message: string) => Promise<boolean>;
    onImportBackup?: (data: any) => Promise<void>;
    onClearData?: () => Promise<void>;
}

type Tab = 'general' | 'categories' | 'managers' | 'vehicles' | 'kegs';

const SettingsView: React.FC<SettingsViewProps> = ({
    state,
    onNavigate,
    onAddCategory,
    onUpdateCategory,
    onDeleteCategory,
    onAddManager,
    onUpdateManager,
    onDeleteManager,
    onAddVehicle,
    onUpdateVehicle,
    onDeleteVehicle,
    onAddKegBrand,
    onUpdateKegBrand,
    onDeleteKegBrand,
    onNotify,
    onConfirmRequest,
    onImportBackup,
    onClearData
}) => {
    const [activeTab, setActiveTab] = useState<Tab>('general');

    // Category Local State
    const [newCategoryName, setNewCategoryName] = useState('');
    const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');

    // Manager Local State
    const [newManagerName, setNewManagerName] = useState('');
    const [newManagerRole, setNewManagerRole] = useState('');
    const [editingManagerId, setEditingManagerId] = useState<string | null>(null);
    const [editingManagerName, setEditingManagerName] = useState('');
    const [editingManagerRole, setEditingManagerRole] = useState('');

    // Vehicle Local State
    const [newVehicleModel, setNewVehicleModel] = useState('');
    const [newVehiclePlate, setNewVehiclePlate] = useState('');
    const [newVehicleType, setNewVehicleType] = useState('');
    const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
    const [editingVehicleModel, setEditingVehicleModel] = useState('');
    const [editingVehiclePlate, setEditingVehiclePlate] = useState('');
    const [editingVehicleType, setEditingVehicleType] = useState('');

    // Keg Brand Local State
    const [newBrandName, setNewBrandName] = useState('');
    const [editingBrandId, setEditingBrandId] = useState<string | null>(null);
    const [editingBrandName, setEditingBrandName] = useState('');

    const handleAddCategory = () => {
        if (!newCategoryName.trim() || !onAddCategory) return;
        onAddCategory(newCategoryName);
        setNewCategoryName('');
    };

    const handleStartEdit = (cat: any) => {
        setEditingCategoryId(cat.id);
        setEditingName(cat.name);
    };

    const handleSaveEdit = () => {
        if (!editingCategoryId || !editingName.trim() || !onUpdateCategory) return;
        onUpdateCategory(editingCategoryId, editingName);
        setEditingCategoryId(null);
        setEditingName('');
    };

    const handleDelete = async (id: string) => {
        if (!onDeleteCategory) return;
        const confirmed = onConfirmRequest
            ? await onConfirmRequest('Tem certeza que deseja remover esta categoria?')
            : confirm('Tem certeza que deseja remover esta categoria?');

        if (confirmed) {
            onDeleteCategory(id);
        } else {
            onNotify?.('Ação cancelada.', 'info');
        }
    };

    const handleAddManager = () => {
        if (!newManagerName.trim() || !newManagerRole.trim() || !onAddManager) return;
        onAddManager(newManagerName, newManagerRole);
        setNewManagerName('');
        setNewManagerRole('');
    };

    const handleStartEditManager = (mgr: any) => {
        setEditingManagerId(mgr.id);
        setEditingManagerName(mgr.name);
        setEditingManagerRole(mgr.role);
    };

    const handleSaveEditManager = () => {
        if (!editingManagerId || !editingManagerName.trim() || !editingManagerRole.trim() || !onUpdateManager) return;
        onUpdateManager(editingManagerId, editingManagerName, editingManagerRole);
        setEditingManagerId(null);
        setEditingManagerName('');
        setEditingManagerRole('');
    };

    const handleDeleteManager = async (id: string) => {
        if (!onDeleteManager) return;
        const confirmed = onConfirmRequest
            ? await onConfirmRequest('Tem certeza que deseja remover este gerente?')
            : confirm('Tem certeza que deseja remover este gerente?');

        if (confirmed) {
            onDeleteManager(id);
        } else {
            onNotify?.('Ação cancelada.', 'info');
        }
    };

    const handleAddVehicle = () => {
        if (!newVehicleModel.trim() || !newVehiclePlate.trim() || !newVehicleType.trim() || !onAddVehicle) return;
        onAddVehicle(newVehicleModel, newVehiclePlate, newVehicleType);
        setNewVehicleModel('');
        setNewVehiclePlate('');
        setNewVehicleType('');
    };

    const handleStartEditVehicle = (veh: any) => {
        setEditingVehicleId(veh.id);
        setEditingVehicleModel(veh.model);
        setEditingVehiclePlate(veh.plate);
        setEditingVehicleType(veh.type);
    };

    const handleSaveEditVehicle = () => {
        if (!editingVehicleId || !editingVehicleModel.trim() || !editingVehiclePlate.trim() || !editingVehicleType.trim() || !onUpdateVehicle) return;
        onUpdateVehicle(editingVehicleId, editingVehicleModel, editingVehiclePlate, editingVehicleType);
        setEditingVehicleId(null);
        setEditingVehicleModel('');
        setEditingVehiclePlate('');
        setEditingVehicleType('');
    };

    const handleDeleteVehicle = async (id: string) => {
        if (!onDeleteVehicle) return;
        const confirmed = onConfirmRequest
            ? await onConfirmRequest('Tem certeza que deseja remover este veículo?')
            : confirm('Tem certeza que deseja remover este veículo?');

        if (confirmed) {
            onDeleteVehicle(id);
        } else {
            onNotify?.('Ação cancelada.', 'info');
        }
    };

    const handleAddBrand = () => {
        if (!newBrandName.trim() || !onAddKegBrand) return;
        onAddKegBrand(newBrandName);
        setNewBrandName('');
    };

    const handleStartEditBrand = (brand: any) => {
        setEditingBrandId(brand.id);
        setEditingBrandName(brand.name);
    };

    const handleSaveEditBrand = () => {
        if (!editingBrandId || !editingBrandName.trim() || !onUpdateKegBrand) return;
        onUpdateKegBrand(editingBrandId, editingBrandName);
        setEditingBrandId(null);
        setEditingBrandName('');
    };

    const handleDeleteBrand = async (id: string) => {
        if (!onDeleteKegBrand) return;
        const confirmed = onConfirmRequest
            ? await onConfirmRequest('Tem certeza que deseja remover esta marca de barril?')
            : confirm('Tem certeza que deseja remover esta marca de barril?');

        if (confirmed) {
            onDeleteKegBrand(id);
        } else {
            onNotify?.('Ação cancelada.', 'info');
        }
    };

    const handleExportBackup = () => {
        const backupData = {
            version: "1.0",
            exportDate: new Date().toISOString(),
            data: {
                cashTransactions: state.cashTransactions,
                mileageRecords: state.mileageRecords,
                kegSales: state.kegSales,
                categories: state.categories,
                managers: state.managers,
                vehicles: state.vehicles,
                kegBrands: state.kegBrands
            }
        };

        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const dateStr = new Date().toISOString().split('T')[0];

        link.href = url;
        link.download = `volare_backup_${dateStr}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    // Hardcoded data (no read-only sections left now)


    return (
        <div className="animate-in fade-in duration-500 pb-20">
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Configurações do Sistema</h2>
                <button
                    onClick={() => onNavigate('dashboard')}
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold transition-colors"
                >
                    <span className="material-symbols-outlined">arrow_back</span>
                    Voltar
                </button>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Sidebar Tabs */}
                <div className="w-full lg:w-64 flex flex-col gap-2">
                    <TabButton active={activeTab === 'general'} onClick={() => setActiveTab('general')} label="Geral" icon="settings" />
                    <TabButton active={activeTab === 'categories'} onClick={() => setActiveTab('categories')} label="Categorias" icon="category" />
                    <TabButton active={activeTab === 'managers'} onClick={() => setActiveTab('managers')} label="Gerência" icon="badge" />
                    <TabButton active={activeTab === 'vehicles'} onClick={() => setActiveTab('vehicles')} label="Veículos" icon="motorcycle" />
                    <TabButton active={activeTab === 'kegs'} onClick={() => setActiveTab('kegs')} label="Barris" icon="local_drink" />
                </div>

                {/* Content Area */}
                <div className="flex-1 bg-white rounded-3xl border border-slate-100 shadow-sm p-8 min-h-[500px]">

                    {activeTab === 'general' && (
                        <div className="space-y-6">
                            <h3 className="text-xl font-black text-slate-800 uppercase border-b border-slate-100 pb-4">Informações Gerais</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <InfoCard label="Nome do Sistema" value="Volare Gestão & Operação" icon="dns" />
                                <InfoCard label="Versão" value="1.2.0 (Stable)" icon="info" />
                                <InfoCard label="Idioma" value="Português (MZ)" icon="language" />
                                <InfoCard label="Moeda Padrão" value="Metical (MZN)" icon="attach_money" />
                                <InfoCard label="Tema" value="Claro (Light)" icon="light_mode" />
                                <InfoCard label="Ambiente" value="Produção" icon="cloud_done" />
                            </div>

                            {/* Backup & Restore Section */}
                            <div className="space-y-6 pt-8 border-t border-slate-100">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-xl font-black text-slate-800 uppercase">Backup e Segurança</h3>
                                </div>

                                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                                    <div className="flex flex-col md:flex-row items-center md:items-start gap-4 text-center md:text-left">
                                        <div className="p-3 bg-primary/10 rounded-xl">
                                            <span className="material-symbols-outlined text-primary text-[24px]">backup</span>
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-slate-800">Cópia de Segurança (Backup)</h4>
                                            <p className="text-sm text-slate-500 mt-1">
                                                Faça o backup dos seus dados ou restaure uma versão anterior. O arquivo será salvo em formato JSON no seu computador.
                                            </p>
                                        </div>
                                        <div className="flex flex-col gap-2 w-full md:w-auto">
                                            <button
                                                onClick={handleExportBackup}
                                                className="w-full md:w-auto px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition-all flex items-center justify-center gap-2 shadow-sm"
                                            >
                                                <span className="material-symbols-outlined">download</span>
                                                Exportar Backup
                                            </button>

                                            <label className="w-full md:w-auto px-6 py-3 bg-white text-slate-600 font-bold rounded-xl border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm">
                                                <span className="material-symbols-outlined">upload_file</span>
                                                Importar / Restaurar
                                                <input
                                                    type="file"
                                                    accept=".json"
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file && onImportBackup) {
                                                            const reader = new FileReader();
                                                            reader.onload = (ev) => {
                                                                try {
                                                                    const data = JSON.parse(ev.target?.result as string);
                                                                    onImportBackup(data);
                                                                } catch (err) {
                                                                    onNotify?.('Erro ao ler arquivo de backup.', 'error');
                                                                }
                                                            };
                                                            reader.readAsText(file);
                                                        }
                                                        // Reset input value to allow same file selection again
                                                        e.target.value = '';
                                                    }}
                                                />
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {/* Danger Zone */}
                                <div className="p-6 bg-red-50 rounded-2xl border border-red-100 space-y-4">
                                    <div className="flex flex-col md:flex-row items-center md:items-start gap-4 text-center md:text-left">
                                        <div className="p-3 bg-red-100 rounded-xl">
                                            <span className="material-symbols-outlined text-red-600 text-[24px]">delete_forever</span>
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-red-700">Zona de Perigo</h4>
                                            <p className="text-sm text-red-600/80 mt-1">
                                                Esta ação irá apagar TODOS os dados do sistema (transações, vendas, registros). Esta ação é irreversível.
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                if (onClearData) onClearData();
                                            }}
                                            className="w-full md:w-auto px-6 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all flex items-center justify-center gap-2 shadow-sm shadow-red-200"
                                        >
                                            <span className="material-symbols-outlined">warning</span>
                                            Limpar Sistema
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'categories' && (
                        <div className="space-y-8">
                            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                                <h3 className="text-xl font-black text-slate-800 uppercase">Categorias de Lançamento</h3>
                            </div>

                            {/* Add New Category */}
                            <div className="flex gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <input
                                    type="text"
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                    placeholder="Nova categoria..."
                                    className="flex-1 px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-primary text-sm font-medium"
                                />
                                <button
                                    onClick={handleAddCategory}
                                    disabled={!onAddCategory}
                                    className="px-6 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary-dark transition-colors flex items-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-[18px]">add</span>
                                    Adicionar
                                </button>
                            </div>

                            {/* Categories List */}
                            <div className="overflow-hidden rounded-xl border border-slate-100">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                                        <tr>
                                            <th className="px-6 py-3">Nome da Categoria</th>
                                            <th className="px-6 py-3 text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {state.categories && state.categories.map((cat) => (
                                            <tr key={cat.id} className="hover:bg-slate-50">
                                                <td className="px-6 py-3 font-medium text-slate-700">
                                                    {editingCategoryId === cat.id ? (
                                                        <input
                                                            autoFocus
                                                            type="text"
                                                            value={editingName}
                                                            onChange={(e) => setEditingName(e.target.value)}
                                                            className="w-full px-2 py-1 rounded border border-primary focus:outline-none"
                                                        />
                                                    ) : (
                                                        cat.name
                                                    )}
                                                </td>
                                                <td className="px-6 py-3 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {editingCategoryId === cat.id ? (
                                                            <>
                                                                <button onClick={handleSaveEdit} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded">
                                                                    <span className="material-symbols-outlined text-[20px]">check</span>
                                                                </button>
                                                                <button onClick={() => setEditingCategoryId(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded">
                                                                    <span className="material-symbols-outlined text-[20px]">close</span>
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <button onClick={() => handleStartEdit(cat)} className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                                                                    <span className="material-symbols-outlined text-[20px]">edit</span>
                                                                </button>
                                                                <button onClick={() => handleDelete(cat.id)} className="p-1 text-rose-600 hover:bg-rose-50 rounded">
                                                                    <span className="material-symbols-outlined text-[20px]">delete</span>
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {(!state.categories || state.categories.length === 0) && (
                                            <tr>
                                                <td colSpan={2} className="px-6 py-8 text-center text-slate-400 italic">
                                                    Nenhuma categoria registada.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'managers' && (
                        <div className="space-y-8">
                            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                                <h3 className="text-xl font-black text-slate-800 uppercase">Equipa de Gerência</h3>
                            </div>

                            {/* Add New Manager */}
                            <div className="flex gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <input
                                    type="text"
                                    value={newManagerName}
                                    onChange={(e) => setNewManagerName(e.target.value)}
                                    placeholder="Nome do gerente..."
                                    className="flex-1 px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-primary text-sm font-medium"
                                />
                                <input
                                    type="text"
                                    value={newManagerRole}
                                    onChange={(e) => setNewManagerRole(e.target.value)}
                                    placeholder="Função..."
                                    className="flex-1 px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-primary text-sm font-medium"
                                />
                                <button
                                    onClick={handleAddManager}
                                    disabled={!onAddManager}
                                    className="px-6 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary-dark transition-colors flex items-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-[18px]">add</span>
                                    Adicionar
                                </button>
                            </div>

                            {/* Managers List */}
                            <div className="overflow-hidden rounded-xl border border-slate-100">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                                        <tr>
                                            <th className="px-6 py-3">Nome</th>
                                            <th className="px-6 py-3">Função</th>
                                            <th className="px-6 py-3 text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {state.managers && state.managers.map((mgr) => (
                                            <tr key={mgr.id} className="hover:bg-slate-50">
                                                <td className="px-6 py-3 font-medium text-slate-700">
                                                    {editingManagerId === mgr.id ? (
                                                        <input
                                                            autoFocus
                                                            type="text"
                                                            value={editingManagerName}
                                                            onChange={(e) => setEditingManagerName(e.target.value)}
                                                            className="w-full px-2 py-1 rounded border border-primary focus:outline-none"
                                                        />
                                                    ) : (
                                                        mgr.name
                                                    )}
                                                </td>
                                                <td className="px-6 py-3 font-medium text-slate-600">
                                                    {editingManagerId === mgr.id ? (
                                                        <input
                                                            type="text"
                                                            value={editingManagerRole}
                                                            onChange={(e) => setEditingManagerRole(e.target.value)}
                                                            className="w-full px-2 py-1 rounded border border-primary focus:outline-none"
                                                        />
                                                    ) : (
                                                        mgr.role
                                                    )}
                                                </td>
                                                <td className="px-6 py-3 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {editingManagerId === mgr.id ? (
                                                            <>
                                                                <button onClick={handleSaveEditManager} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded">
                                                                    <span className="material-symbols-outlined text-[20px]">check</span>
                                                                </button>
                                                                <button onClick={() => setEditingManagerId(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded">
                                                                    <span className="material-symbols-outlined text-[20px]">close</span>
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <button onClick={() => handleStartEditManager(mgr)} className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                                                                    <span className="material-symbols-outlined text-[20px]">edit</span>
                                                                </button>
                                                                <button onClick={() => handleDeleteManager(mgr.id)} className="p-1 text-rose-600 hover:bg-rose-50 rounded">
                                                                    <span className="material-symbols-outlined text-[20px]">delete</span>
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {(!state.managers || state.managers.length === 0) && (
                                            <tr>
                                                <td colSpan={3} className="px-6 py-8 text-center text-slate-400 italic">
                                                    Nenhum gerente registado.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'vehicles' && (
                        <div className="space-y-8">
                            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                                <h3 className="text-xl font-black text-slate-800 uppercase">Frota Registada</h3>
                            </div>

                            {/* Add New Vehicle */}
                            <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <input
                                    type="text"
                                    value={newVehicleModel}
                                    onChange={(e) => setNewVehicleModel(e.target.value)}
                                    placeholder="Modelo..."
                                    className="px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-primary text-sm font-medium"
                                />
                                <input
                                    type="text"
                                    value={newVehiclePlate}
                                    onChange={(e) => setNewVehiclePlate(e.target.value)}
                                    placeholder="Matrícula..."
                                    className="px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-primary text-sm font-medium"
                                />
                                <div className="flex gap-2">
                                    <select
                                        value={newVehicleType}
                                        onChange={(e) => setNewVehicleType(e.target.value)}
                                        className="flex-1 px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-primary text-sm font-medium"
                                    >
                                        <option value="">Tipo...</option>
                                        <option value="Moto">Moto</option>
                                        <option value="Carrinha">Carrinha</option>
                                        <option value="Carro">Carro</option>
                                    </select>
                                    <button
                                        onClick={handleAddVehicle}
                                        disabled={!onAddVehicle}
                                        className="px-6 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary-dark transition-colors flex items-center gap-2 whitespace-nowrap"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">add</span>
                                        Adicionar
                                    </button>
                                </div>
                            </div>

                            {/* Vehicles List */}
                            <div className="overflow-hidden rounded-xl border border-slate-100">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                                        <tr>
                                            <th className="px-6 py-3">Modelo</th>
                                            <th className="px-6 py-3">Matrícula</th>
                                            <th className="px-6 py-3">Tipo</th>
                                            <th className="px-6 py-3 text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {state.vehicles && state.vehicles.map((veh) => (
                                            <tr key={veh.id} className="hover:bg-slate-50">
                                                <td className="px-6 py-3 font-medium text-slate-700">
                                                    {editingVehicleId === veh.id ? (
                                                        <input
                                                            autoFocus
                                                            type="text"
                                                            value={editingVehicleModel}
                                                            onChange={(e) => setEditingVehicleModel(e.target.value)}
                                                            className="w-full px-2 py-1 rounded border border-primary focus:outline-none"
                                                        />
                                                    ) : (
                                                        veh.model
                                                    )}
                                                </td>
                                                <td className="px-6 py-3 font-medium text-slate-600">
                                                    {editingVehicleId === veh.id ? (
                                                        <input
                                                            type="text"
                                                            value={editingVehiclePlate}
                                                            onChange={(e) => setEditingVehiclePlate(e.target.value)}
                                                            className="w-full px-2 py-1 rounded border border-primary focus:outline-none"
                                                        />
                                                    ) : (
                                                        veh.plate
                                                    )}
                                                </td>
                                                <td className="px-6 py-3 font-medium text-slate-600">
                                                    {editingVehicleId === veh.id ? (
                                                        <select
                                                            value={editingVehicleType}
                                                            onChange={(e) => setEditingVehicleType(e.target.value)}
                                                            className="w-full px-2 py-1 rounded border border-primary focus:outline-none"
                                                        >
                                                            <option value="Moto">Moto</option>
                                                            <option value="Carrinha">Carrinha</option>
                                                            <option value="Carro">Carro</option>
                                                        </select>
                                                    ) : (
                                                        veh.type
                                                    )}
                                                </td>
                                                <td className="px-6 py-3 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {editingVehicleId === veh.id ? (
                                                            <>
                                                                <button onClick={handleSaveEditVehicle} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded">
                                                                    <span className="material-symbols-outlined text-[20px]">check</span>
                                                                </button>
                                                                <button onClick={() => setEditingVehicleId(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded">
                                                                    <span className="material-symbols-outlined text-[20px]">close</span>
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <button onClick={() => handleStartEditVehicle(veh)} className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                                                                    <span className="material-symbols-outlined text-[20px]">edit</span>
                                                                </button>
                                                                <button onClick={() => handleDeleteVehicle(veh.id)} className="p-1 text-rose-600 hover:bg-rose-50 rounded">
                                                                    <span className="material-symbols-outlined text-[20px]">delete</span>
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {(!state.vehicles || state.vehicles.length === 0) && (
                                            <tr>
                                                <td colSpan={4} className="px-6 py-8 text-center text-slate-400 italic">
                                                    Nenhum veículo registado.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'kegs' && (
                        <div className="space-y-8">
                            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                                <h3 className="text-xl font-black text-slate-800 uppercase">Marcas de Barris</h3>
                            </div>

                            {/* Add New Brand */}
                            <div className="flex gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <input
                                    type="text"
                                    value={newBrandName}
                                    onChange={(e) => setNewBrandName(e.target.value)}
                                    placeholder="Nome da marca..."
                                    className="flex-1 px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-primary text-sm font-medium"
                                />
                                <button
                                    onClick={handleAddBrand}
                                    disabled={!onAddKegBrand}
                                    className="px-6 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary-dark transition-colors flex items-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-[18px]">add</span>
                                    Adicionar
                                </button>
                            </div>

                            {/* Brands List */}
                            <div className="overflow-hidden rounded-xl border border-slate-100">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                                        <tr>
                                            <th className="px-6 py-3">Marca</th>
                                            <th className="px-6 py-3 text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {state.kegBrands && state.kegBrands.map((brand) => (
                                            <tr key={brand.id} className="hover:bg-slate-50">
                                                <td className="px-6 py-3 font-medium text-slate-700">
                                                    {editingBrandId === brand.id ? (
                                                        <input
                                                            autoFocus
                                                            type="text"
                                                            value={editingBrandName}
                                                            onChange={(e) => setEditingBrandName(e.target.value)}
                                                            className="w-full px-2 py-1 rounded border border-primary focus:outline-none"
                                                        />
                                                    ) : (
                                                        brand.name
                                                    )}
                                                </td>
                                                <td className="px-6 py-3 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {editingBrandId === brand.id ? (
                                                            <>
                                                                <button onClick={handleSaveEditBrand} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded">
                                                                    <span className="material-symbols-outlined text-[20px]">check</span>
                                                                </button>
                                                                <button onClick={() => setEditingBrandId(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded">
                                                                    <span className="material-symbols-outlined text-[20px]">close</span>
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <button onClick={() => handleStartEditBrand(brand)} className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                                                                    <span className="material-symbols-outlined text-[20px]">edit</span>
                                                                </button>
                                                                <button onClick={() => handleDeleteBrand(brand.id)} className="p-1 text-rose-600 hover:bg-rose-50 rounded">
                                                                    <span className="material-symbols-outlined text-[20px]">delete</span>
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {(!state.kegBrands || state.kegBrands.length === 0) && (
                                            <tr>
                                                <td colSpan={2} className="px-6 py-8 text-center text-slate-400 italic">
                                                    Nenhuma marca de barril registada.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

const TabButton = ({ active, onClick, label, icon }: any) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-3 px-6 py-4 rounded-xl transition-all text-left w-full ${active ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
    >
        <span className="material-symbols-outlined">{icon}</span>
        <span className="text-sm font-black uppercase tracking-wide">{label}</span>
    </button>
);

const InfoCard = ({ label, value, icon }: any) => (
    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-4">
        <div className="size-10 rounded-full bg-white flex items-center justify-center text-primary shadow-sm">
            <span className="material-symbols-outlined">{icon}</span>
        </div>
        <div>
            <p className="text-xs font-bold text-slate-400 uppercase">{label}</p>
            <p className="text-sm font-bold text-slate-900">{value}</p>
        </div>
    </div>
);

const SimpleTable = ({ headers, rows }: { headers: string[], rows: string[][] }) => (
    <div className="overflow-hidden rounded-xl border border-slate-100">
        <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                <tr>
                    {headers.map((h, i) => <th key={i} className="px-6 py-3">{h}</th>)}
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {rows.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                        {row.map((cell, j) => <td key={j} className="px-6 py-3 font-medium text-slate-700">{cell}</td>)}
                    </tr>
                ))}
                {rows.length === 0 && (
                    <tr>
                        <td colSpan={headers.length} className="px-6 py-8 text-center text-slate-400 italic">
                            Nenhum registo encontrado.
                        </td>
                    </tr>
                )}
            </tbody>
        </table>
    </div>
);

export default SettingsView;
