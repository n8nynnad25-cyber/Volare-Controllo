
import React from 'react';
import { ConfirmationModalState } from '../types';

interface ConfirmationModalProps {
    state: ConfirmationModalState;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ state }) => {
    if (!state.isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
            {/* Backdrop with heavy blur */}
            <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
                onClick={state.onCancel}
            />

            {/* Modal Container */}
            <div className="relative w-full max-w-md bg-white/90 backdrop-blur-xl rounded-[32px] shadow-2xl border border-white/20 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-500">

                {/* Top Accent Bar */}
                <div className="h-1.5 w-full bg-gradient-to-r from-primary via-indigo-500 to-primary/80" />

                <div className="p-10 flex flex-col items-center text-center">
                    {/* Icon Circle */}
                    <div className="size-20 rounded-[24px] bg-primary/10 flex items-center justify-center mb-8 shadow-inner">
                        <span className="material-symbols-outlined text-[40px] text-primary">
                            help_outline
                        </span>
                    </div>

                    <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase mb-4">
                        Confirmar Ação
                    </h3>

                    <p className="text-slate-500 font-medium leading-relaxed mb-10">
                        {state.message}
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 w-full">
                        <button
                            onClick={state.onCancel}
                            className="flex-1 px-8 py-4 rounded-2xl border border-slate-200 text-slate-500 font-black uppercase text-xs tracking-widest hover:bg-slate-50 transition-all active:scale-95"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={state.onConfirm}
                            className="flex-1 px-8 py-4 rounded-2xl bg-primary text-white font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/30 hover:bg-primary-hover transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            Confirmar
                            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                        </button>
                    </div>
                </div>

                {/* Subtle Bottom Glow */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
            </div>
        </div>
    );
};

export default ConfirmationModal;
