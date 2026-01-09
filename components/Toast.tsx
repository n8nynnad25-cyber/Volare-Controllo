import React, { useEffect } from 'react';
import { ToastMessage } from '../types';

interface ToastProps {
    toasts: ToastMessage[];
    onRemove: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ toasts, onRemove }) => {
    return (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
            {toasts.map((toast) => (
                <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
            ))}
        </div>
    );
};

const ToastItem: React.FC<{ toast: ToastMessage; onRemove: (id: string) => void }> = ({ toast, onRemove }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onRemove(toast.id);
        }, 4000);
        return () => clearTimeout(timer);
    }, [toast.id, onRemove]);

    const styles = {
        success: 'bg-emerald-600 shadow-emerald-200',
        error: 'bg-rose-600 shadow-rose-200',
        info: 'bg-blue-600 shadow-blue-200'
    };

    const icons = {
        success: 'check_circle',
        error: 'error',
        info: 'info'
    };

    return (
        <div className={`
            ${styles[toast.type]} 
            text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 
            animate-in slide-in-from-right-full fade-in duration-500 pointer-events-auto
            min-w-[300px] border border-white/10
        `}>
            <span className="material-symbols-outlined text-[24px] opacity-90">{icons[toast.type]}</span>
            <div className="flex flex-col">
                <p className="text-[11px] font-black uppercase tracking-widest opacity-70 mb-0.5">
                    {toast.type === 'success' ? 'Sucesso' : toast.type === 'error' ? 'Atenção' : 'Informação'}
                </p>
                <p className="text-sm font-bold tracking-tight">{toast.message}</p>
            </div>
            <button
                onClick={() => onRemove(toast.id)}
                className="ml-auto p-1 hover:bg-white/10 rounded-lg transition-colors"
                title="Fechar"
            >
                <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
        </div>
    );
};

export default Toast;
