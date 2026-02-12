
import React, { useState } from 'react';
import { SystemNotification, UserRole } from '../types';

interface NotificationsViewProps {
    notifications: SystemNotification[];
    onMarkAsRead: (id: string) => void;
    onMarkAllAsRead: () => void;
    onDelete?: (id: string) => void;
    onDeleteBulk?: (ids: string[]) => void;
    onConfirmRequest?: (message: string) => Promise<boolean>;
    userRole: UserRole;
}

const NotificationsView: React.FC<NotificationsViewProps> = ({
    notifications,
    onMarkAsRead,
    onMarkAllAsRead,
    onDelete,
    onDeleteBulk,
    onConfirmRequest,
    userRole
}) => {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const isAdmin = userRole === 'admin';

    const getModuleIcon = (module: string) => {
        switch (module) {
            case 'Fundo de Caixa': return 'payments';
            case 'Quilometragem': return 'directions_car';
            case 'Venda de Barris': return 'sports_bar';
            default: return 'notifications';
        }
    };

    const getEventColor = (type: string) => {
        switch (type) {
            case 'Criado': return 'bg-green-100 text-green-700 ring-green-600/20';
            case 'Actualizado': return 'bg-blue-100 text-blue-700 ring-blue-600/20';
            case 'Eliminado': return 'bg-red-100 text-red-700 ring-red-600/20';
            default: return 'bg-slate-100 text-slate-700 ring-slate-600/20';
        }
    };

    const formatTime = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleString('pt-PT', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const toggleSelection = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === notifications.length && notifications.length > 0) {
            setSelectedIds([]);
        } else {
            setSelectedIds(notifications.map(n => n.id));
        }
    };

    const handleDeleteSelected = async () => {
        if (onDeleteBulk && selectedIds.length > 0) {
            const confirmed = onConfirmRequest
                ? await onConfirmRequest(`Tem certeza que deseja apagar ${selectedIds.length} notificações?`)
                : confirm(`Tem certeza que deseja apagar ${selectedIds.length} notificações?`);

            if (confirmed) {
                await onDeleteBulk(selectedIds);
                setSelectedIds([]);
            }
        }
    };

    const handleClearRead = async () => {
        const readIds = notifications.filter(n => n.isRead).map(n => n.id);
        if (onDeleteBulk && readIds.length > 0) {
            const confirmed = onConfirmRequest
                ? await onConfirmRequest(`Deseja apagar permanentemente todas as ${readIds.length} notificações já lidas?`)
                : confirm(`Deseja apagar permanentemente todas as ${readIds.length} notificações já lidas?`);

            if (confirmed) {
                await onDeleteBulk(readIds);
            }
        }
    };

    return (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Centro de Notificações</h1>
                    <p className="text-slate-500 text-sm mt-1">
                        {notifications.length > 0
                            ? `A apresentar ${notifications.length} notificações recentes.`
                            : 'Não existem notificações para o teu cargo no momento.'}
                    </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    {isAdmin && notifications.length > 0 && (
                        <button
                            onClick={toggleSelectAll}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-700 hover:bg-slate-50 transition-all shadow-sm hover:shadow active:scale-95 uppercase tracking-widest"
                        >
                            <span className="material-symbols-outlined text-[18px]">
                                {selectedIds.length === notifications.length ? 'deselect' : 'select_all'}
                            </span>
                            {selectedIds.length === notifications.length ? 'Desmarcar' : 'Selecionar Tudo'}
                        </button>
                    )}
                    {isAdmin && notifications.some(n => n.isRead) && (
                        <button
                            onClick={handleClearRead}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 rounded-xl text-xs font-black text-red-600 hover:bg-red-50 transition-all shadow-sm hover:shadow active:scale-95 uppercase tracking-widest"
                        >
                            <span className="material-symbols-outlined text-[18px]">cleaning_services</span>
                            Limpar Lidas
                        </button>
                    )}

                    {notifications.some(n => !n.isRead) && (
                        <button
                            onClick={onMarkAllAsRead}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-700 hover:bg-slate-50 transition-all shadow-sm hover:shadow active:scale-95 uppercase tracking-widest"
                        >
                            <span className="material-symbols-outlined text-[18px]">done_all</span>
                            Marcar tudo como lido
                        </button>
                    )}
                </div>
            </div>

            {isAdmin && selectedIds.length > 0 && (
                <div className="bg-slate-900 text-white p-4 rounded-2xl flex items-center justify-between shadow-xl animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center gap-3">
                        <div className="size-8 bg-primary/20 rounded-lg flex items-center justify-center font-black text-sm">
                            {selectedIds.length}
                        </div>
                        <span className="text-sm font-bold opacity-90 uppercase tracking-widest">Selecionadas</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setSelectedIds([])}
                            className="px-4 py-2 text-xs font-black hover:bg-white/10 rounded-xl uppercase tracking-widest transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleDeleteSelected}
                            className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded-xl text-xs font-black shadow-lg shadow-red-900/20 uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                            Apagar
                        </button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 gap-3">
                {notifications.length > 0 ? (
                    notifications.map((notif) => (
                        <div
                            key={notif.id}
                            onClick={() => !notif.isRead && onMarkAsRead(notif.id)}
                            className={`group flex items-start gap-4 p-4 rounded-2xl transition-all cursor-pointer border
                                ${selectedIds.includes(notif.id) ? 'border-primary/50 bg-primary/5 ring-2 ring-primary/20 shadow-lg' :
                                    notif.isRead ? 'bg-white border-slate-100 opacity-80 hover:opacity-100 hover:border-slate-200' :
                                        'bg-white border-primary/20 shadow-md shadow-primary/5 ring-1 ring-primary/5 hover:border-primary/40'}`}
                        >
                            {isAdmin && (
                                <div
                                    onClick={(e) => toggleSelection(e, notif.id)}
                                    className={`flex-shrink-0 size-6 rounded-lg border-2 flex items-center justify-center transition-all mt-3
                                        ${selectedIds.includes(notif.id) ? 'bg-primary border-primary text-white' : 'border-slate-200 bg-white group-hover:border-primary/40'}`}
                                >
                                    {selectedIds.includes(notif.id) && <span className="material-symbols-outlined text-[16px] font-black">check</span>}
                                </div>
                            )}

                            <div className={`flex-shrink-0 size-12 rounded-xl flex items-center justify-center 
                                ${notif.isRead ? 'bg-slate-100 text-slate-500' : 'bg-primary/10 text-primary'}`}>
                                <span className="material-symbols-outlined text-[24px]">
                                    {getModuleIcon(notif.module)}
                                </span>
                            </div>

                            <div className="flex-grow min-w-0">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ring-1 ring-inset ${getEventColor(notif.eventType)}`}>
                                            {notif.eventType}
                                        </span>
                                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">
                                            {notif.module} • {notif.entity}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-[11px] font-medium text-slate-400 whitespace-nowrap">
                                            {formatTime(notif.createdAt)}
                                        </span>
                                        {isAdmin && (
                                            <button
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    const confirmed = onConfirmRequest
                                                        ? await onConfirmRequest("Deseja apagar esta notificação?")
                                                        : confirm("Deseja apagar esta notificação?");
                                                    if (confirmed) onDelete?.(notif.id);
                                                }}
                                                className="opacity-0 group-hover:opacity-100 size-8 flex items-center justify-center bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all active:scale-90"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">delete</span>
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <p className={`text-sm leading-relaxed ${notif.isRead ? 'text-slate-500' : 'text-slate-900 font-semibold'}`}>
                                    {notif.summary}
                                </p>

                                <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-400">
                                    <span className="material-symbols-outlined text-[14px]">person</span>
                                    <span>Realizado por: <strong>{notif.userName}</strong></span>
                                    {notif.relatedManager && (
                                        <>
                                            <span className="mx-1">•</span>
                                            <span>Relacionado a: <strong>{notif.relatedManager}</strong></span>
                                        </>
                                    )}
                                </div>
                            </div>

                            {!notif.isRead && !selectedIds.includes(notif.id) && (
                                <div className="flex-shrink-0 flex items-center self-center pl-2">
                                    <div className="size-2.5 rounded-full bg-primary animate-pulse"></div>
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                        <div className="size-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                            <span className="material-symbols-outlined text-[40px] text-slate-300">notifications_off</span>
                        </div>
                        <h3 className="text-slate-900 font-bold text-lg">Sem notificações</h3>
                        <p className="text-slate-500 text-sm">Tudo em dia! Novos eventos aparecerão aqui conforme ocorrerem.</p>
                    </div>
                )}
            </div>

            <div className="mt-4 p-6 bg-primary/5 rounded-3xl border border-primary/10">
                <div className="flex items-start gap-4">
                    <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center text-primary flex-shrink-0">
                        <span className="material-symbols-outlined text-[20px]">security</span>
                    </div>
                    <div>
                        <h4 className="text-primary font-bold text-sm">Privacidade e Permissões</h4>
                        <p className="text-slate-600 text-xs mt-1 leading-relaxed">
                            As notificações são filtradas automaticamente com base no teu cargo (<strong>{userRole}</strong>).
                            Garantimos que apenas a informação pertinente ao teu nível de acesso seja exibida,
                            respeitando as regras de visibilidade e segurança do sistema Volare.
                            {isAdmin && " Como Administrador, tens permissão para gerir e limpar o histórico de notificações."}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NotificationsView;
