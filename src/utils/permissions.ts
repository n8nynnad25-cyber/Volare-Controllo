
import { UserRole } from '../../types';

export const canView = (role?: UserRole): boolean => {
    return true; // Todos podem ver
};

export const canCreate = (role?: UserRole): boolean => {
    // Admin e Manager podem criar registos
    if (role === 'admin' || role === 'manager') return true;
    return false;
};

export const canEdit = (role?: UserRole): boolean => {
    // Admin e Manager podem editar registos (corrigir erros operacionais)
    if (role === 'admin' || role === 'manager') return true;
    return false;
};

export const canDelete = (role?: UserRole): boolean => {
    // Apenas Admin pode apagar registos definitivamente
    if (role === 'admin') return true;
    return false;
};

export const canConfigure = (role?: UserRole): boolean => {
    if (role === 'admin') return true;
    return false;
};

export const canUseChatbot = (role?: UserRole): boolean => {
    // Agora disponível para Admin, Boss e Gerente
    if (role === 'admin' || role === 'boss' || role === 'manager') return true;
    return false;
};

export const getRoleLabel = (role?: string): string => {
    switch (role) {
        case 'admin': return 'Administrador';
        case 'manager': return 'Gerente (Utilizador Normal)';
        case 'boss': return 'Boss (Visualização)';
        default: return 'Utilizador';
    }
};
