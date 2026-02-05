
export type ViewType = 'dashboard' | 'cash-fund' | 'cash-fund-new' | 'cash-fund-edit' | 'mileage' | 'mileage-new' | 'mileage-edit' | 'keg-sales' | 'keg-sales-new' | 'keg-sales-edit' | 'keg-edit' | 'settings';

export type UserRole = 'admin' | 'manager' | 'boss';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole; // Agora tipado estritamente
  avatar: string;
}

export interface CashTransaction {
  id: string;
  date: string;
  type: 'entrada' | 'saida';
  category: string;
  description: string;
  amount: number;
  manager: string;
  isVendaDinheiro: boolean;
}

export interface MileageRecord {
  id: string;
  date: string;
  vehicle: string;
  kmInitial: number;
  kmFinal: number;
  liters: number;
  cost: number;
}

export type KegStatus = 'Novo' | 'Ativo' | 'Esgotado' | 'Estragado' | 'Transferido';
export type KegOperationType = 'purchase' | 'sale' | 'loss';

export interface Keg {
  id: string;
  brand: string;
  capacity: number;
  currentLiters: number;
  purchasePrice: number;
  purchaseDate: string;
  activationDate?: string;
  status: KegStatus;
  code: string;
}

export interface KegMovement {
  id: string;
  kegId: string;
  type: 'Venda' | 'Perda' | 'Transferência';
  liters: number;
  date: string;
  description?: string;
}

export interface KegSale {
  id: string;
  date: string;
  brand: string;
  volume: number; // Liters
  quantity: number; // Number of kegs
  code: string;
  value: number;
  status: 'Confirmado' | 'Pendente';
  operationType: 'purchase' | 'sale';
}


export interface TransactionCategory {
  id: string;
  name: string;
}

export interface Manager {
  id: string;
  name: string;
  role: string;
}

export interface Vehicle {
  id: string;
  model: string;
  plate: string;
  type: string;
}

export interface KegBrand {
  id: string;
  name: string;
}

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface ConfirmationModalState {
  isOpen: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export interface AppState {
  cashTransactions: CashTransaction[];
  mileageRecords: MileageRecord[];
  kegSales: KegSale[];
  kegs: Keg[];
  kegMovements: KegMovement[];
  categories: TransactionCategory[];
  managers: Manager[];
  vehicles: Vehicle[];
  kegBrands: KegBrand[];
  toasts: ToastMessage[];
  confirmationModal: ConfirmationModalState;
}

