import { UserRole, RolePermissions } from '../../types';

const getPermissions = (role: UserRole | undefined, allPermissions: RolePermissions[]): RolePermissions | undefined => {
    if (!role) return undefined;
    if (role === 'admin') {
        // Fallback para admin sempre ter tudo se não estiver na lista (segurança)
        return allPermissions.find(p => p.role === 'admin') || {
            role: 'admin',
            dashboard: { view: true, manage: true },
            cashFund: { view: true, manage: true },
            mileage: { view: true, manage: true },
            kegs: { view: true, manage: true },
            notifications: { view: true, manage: true },
            settings: { view: true, manage: true },
            canDelete: true,
            canAccessChatbot: true
        };
    }
    return allPermissions.find(p => p.role === role);
};

export const canViewModule = (module: keyof RolePermissions, role?: UserRole, allPermissions: RolePermissions[] = []): boolean => {
    if (role === 'admin') return true;
    const permissions = getPermissions(role, allPermissions);
    if (!permissions) return false; // Fail safe if role not found
    const mod = (permissions as any)[module];
    if (mod && typeof mod === 'object' && 'view' in mod) return mod.view;
    return false;
};

export const canManageModule = (module: keyof RolePermissions, role?: UserRole, allPermissions: RolePermissions[] = []): boolean => {
    if (role === 'admin') return true;
    const permissions = getPermissions(role, allPermissions);
    if (!permissions) return false;
    const mod = (permissions as any)[module];
    if (mod && typeof mod === 'object' && 'manage' in mod) return mod.manage;
    return false;
};

export const canDelete = (role?: UserRole, allPermissions: RolePermissions[] = []): boolean => {
    if (role === 'admin') return true;
    const permissions = getPermissions(role, allPermissions);
    return permissions?.canDelete || false;
};

export const canConfigure = (role?: UserRole, allPermissions: RolePermissions[] = []): boolean => {
    if (role === 'admin') return true;
    const permissions = getPermissions(role, allPermissions);
    return permissions?.settings?.manage || false;
};

export const canUseChatbot = (role?: UserRole, allPermissions: RolePermissions[] = []): boolean => {
    if (role === 'admin') return true;
    const permissions = getPermissions(role, allPermissions);
    return permissions?.canAccessChatbot || false;
};

export const getRoleLabel = (role?: string): string => {
    switch (role) {
        case 'admin': return 'Administrador';
        case 'manager': return 'Gerente';
        case 'boss': return 'Boss';
        default: return 'Utilizador';
    }
};
