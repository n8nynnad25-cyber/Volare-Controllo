
import { AppState } from './types';

export const INITIAL_STATE: AppState = {
  cashTransactions: [
    { id: '1', date: '2023-10-26', type: 'saida', category: 'Transporte', description: 'Uber Entrega', amount: 12.50, manager: 'Carlos Silva', isVendaDinheiro: false },
    { id: '2', date: '2023-10-25', type: 'entrada', category: 'Vendas', description: 'Reforço Caixa', amount: 50.00, manager: 'Ana Paula', isVendaDinheiro: true },
    { id: '3', date: '2023-10-24', type: 'entrada', category: 'Vendas', description: 'Venda Balcão', amount: 1200.00, manager: 'Carlos Silva', isVendaDinheiro: true },
  ],
  mileageRecords: [
    { id: '1', date: '2023-10-24', vehicle: 'Honda CG 160 (KXP-9921)', kmInitial: 12000, kmFinal: 12124, liters: 12.5, cost: 68.50 },
    { id: '2', date: '2023-10-23', vehicle: 'Yamaha Factor (JKL-1029)', kmInitial: 8500, kmFinal: 8510, liters: 10.0, cost: 54.00 },
  ],
  kegSales: [],
  kegs: [],
  kegMovements: [],
  categories: [],

  managers: [],
  vehicles: [],
  kegBrands: [],
  toasts: [],
  notifications: [],
  confirmationModal: {
    isOpen: false,
    message: '',
    onConfirm: () => { },
    onCancel: () => { }
  },
  systemUsers: [],
  rolePermissions: [
    {
      role: 'admin',
      dashboard: { view: true, manage: true },
      cashFund: { view: true, manage: true },
      mileage: { view: true, manage: true },
      kegs: { view: true, manage: true },
      notifications: { view: true, manage: true },
      settings: { view: true, manage: true },
      canDelete: true,
      canAccessChatbot: true
    },
    {
      role: 'manager',
      dashboard: { view: true, manage: true },
      cashFund: { view: true, manage: true },
      mileage: { view: true, manage: true },
      kegs: { view: true, manage: true },
      notifications: { view: true, manage: true },
      settings: { view: false, manage: false },
      canDelete: false,
      canAccessChatbot: true
    },
    {
      role: 'boss',
      dashboard: { view: true, manage: false },
      cashFund: { view: true, manage: false },
      mileage: { view: true, manage: false },
      kegs: { view: true, manage: false },
      notifications: { view: true, manage: false },
      settings: { view: false, manage: false },
      canDelete: false,
      canAccessChatbot: true
    }
  ]
};

export const BRAND_COLORS: Record<string, string> = {
  'Heineken': '#16a34a', // Verde
  '2M': '#dc2626',      // Vermelho
  'Txilar': '#f97316',   // Laranja
  'Stella Artois': '#eab308', // Amarelo
  'Budweiser': '#dc2626',
  'Laurentina Preta': '#1e293b',
  'Laurentina Clara': '#f59e0b',
  'Manica': '#10b981',
  'Outras': '#94a3b8',
};
