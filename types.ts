
export type ViewType = 'dashboard' | 'cash-fund' | 'cash-fund-new' | 'mileage' | 'mileage-new' | 'keg-sales' | 'keg-sales-new' | 'settings';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
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

export interface KegSale {
  id: string;
  date: string;
  brand: string;
  volume: number; // Liters
  quantity: number; // Number of kegs
  code: string;
  value: number;
  status: 'Confirmado' | 'Pendente';
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

export interface AppState {
  cashTransactions: CashTransaction[];
  mileageRecords: MileageRecord[];
  kegSales: KegSale[];
  categories: TransactionCategory[];
  managers: Manager[];
  vehicles: Vehicle[];
  kegBrands: KegBrand[];
}
