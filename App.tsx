
import React, { useState, useMemo, useEffect } from 'react';
import { ViewType, AppState, CashTransaction, MileageRecord, KegSale, User, TransactionCategory, Manager, Vehicle, KegBrand, UserRole, Keg, KegStatus, KegMovement, KegOperationType } from './types';
import { INITIAL_STATE } from './constants';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import GeneralDashboard from './views/GeneralDashboard';
import CashFundDashboard from './views/CashFundDashboard';
import CashFundForm from './views/CashFundForm';
import MileageDashboard from './views/MileageDashboard';
import MileageForm from './views/MileageForm';
import KegSalesDashboard from './views/KegSalesDashboard';
import KegSalesForm from './views/KegSalesForm';
import SettingsView from './views/SettingsView';
import LoginView from './views/LoginView';
import Chatbot from './components/Chatbot';
import Toast from './components/Toast';
import ConfirmationModal from './components/ConfirmationModal';
import { supabase, supabaseUrl, supabaseKey } from './src/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { canCreate, canEdit, canDelete, canConfigure, canUseChatbot } from './src/utils/permissions';

const App: React.FC = () => {
  const [view, setView] = useState<ViewType>('dashboard');
  const [editingTransaction, setEditingTransaction] = useState<CashTransaction | null>(null);
  const [editingMileageRecord, setEditingMileageRecord] = useState<MileageRecord | null>(null);
  const [editingKegSale, setEditingKegSale] = useState<KegSale | null>(null);
  const [editingKeg, setEditingKeg] = useState<Keg | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [state, setState] = useState<AppState>(() => {
    try {
      const saved = localStorage.getItem('volare_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge com INITIAL_STATE, mas garantindo que estados de UI sejam limpos
        return {
          ...INITIAL_STATE,
          ...parsed,
          categories: parsed.categories || INITIAL_STATE.categories,
          toasts: [], // Sempre iniciar vazio
          confirmationModal: INITIAL_STATE.confirmationModal // Sempre iniciar fechado
        };
      }
    } catch (e) {
      console.error("Erro ao carregar estado do localStorage:", e);
    }
    return INITIAL_STATE;
  });

  useEffect(() => {
    localStorage.setItem('volare_state', JSON.stringify(state));
  }, [state]);

  // Auth Listener
  useEffect(() => {
    // Verificar sessão atual
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        mapUser(session.user);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        mapUser(session.user);
      } else {
        setUser(null);
        setView('login');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const mapUser = (supabaseUser: any) => {
    if (!supabaseUser) return;

    // Normalizar a role vinda do Supabase para os nossos tipos internos
    const rawRole = supabaseUser.user_metadata?.role?.toLowerCase() || '';
    let userRole: UserRole = 'manager'; // Default seguro (Gerente tem permissões médias)

    if (rawRole.includes('admin') || rawRole.includes('administrador')) {
      userRole = 'admin';
    } else if (rawRole.includes('boss')) {
      userRole = 'boss';
    } else if (rawRole.includes('manager') || rawRole.includes('gerente')) {
      userRole = 'manager';
    }

    setUser({
      id: supabaseUser.id,
      name: supabaseUser.user_metadata.name || supabaseUser.email?.split('@')[0] || 'Usuário',
      email: supabaseUser.email || '',
      role: userRole,
      avatar: supabaseUser.user_metadata.avatar_url || `https://ui-avatars.com/api/?name=${supabaseUser.email?.split('@')[0] || 'U'}&background=random`
    });
  };

  const handleLogin = (newUser: User) => {
    // O listener do Supabase cuidará da atualização do estado, 
    // mas deixamos aqui caso precise de lógica extra
    setUser(newUser);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // User state será limpo pelo listener
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setState(prev => ({
      ...prev,
      toasts: [...prev.toasts, { id, message, type }]
    }));
  };

  const removeToast = (id: string) => {
    setState(prev => ({
      ...prev,
      toasts: prev.toasts.filter(t => t.id !== id)
    }));
  };

  const showConfirm = (message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setState(prev => ({
        ...prev,
        confirmationModal: {
          isOpen: true,
          message,
          onConfirm: () => {
            setState(s => ({ ...s, confirmationModal: { ...s.confirmationModal, isOpen: false } }));
            resolve(true);
          },
          onCancel: () => {
            setState(s => ({ ...s, confirmationModal: { ...s.confirmationModal, isOpen: false } }));
            resolve(false);
          }
        }
      }));
    });
  };

  // Fetch Initial Data
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        const { data: cashData, error: cashError } = await supabase
          .from('cash_transactions')
          .select('*')
          .order('date', { ascending: false });

        if (cashError) {
          console.error('Error fetching cash transactions:', cashError);
        } else if (cashData) {
          const mappedTransactions: CashTransaction[] = cashData.map(tx => ({
            id: tx.id,
            date: tx.date,
            type: tx.type as 'entrada' | 'saida',
            category: tx.category,
            description: tx.description,
            amount: tx.amount,
            manager: tx.manager,
            isVendaDinheiro: tx.is_venda_dinheiro
          }));

          setState(prev => ({ ...prev, cashTransactions: mappedTransactions }));
        }

        // Fetch Mileage Records
        const { data: mileageData, error: mileageError } = await supabase
          .from('mileage_records')
          .select('*')
          .order('date', { ascending: false });

        if (mileageError) {
          console.error('Error fetching mileage records:', mileageError);
        } else if (mileageData) {
          const mappedMileage: MileageRecord[] = mileageData.map(rec => ({
            id: rec.id,
            date: rec.date,
            vehicle: rec.vehicle,
            kmInitial: rec.km_initial,
            kmFinal: rec.km_final,
            liters: rec.liters,
            cost: rec.cost
          }));
          setState(prev => ({ ...prev, mileageRecords: mappedMileage }));
        }

        // Fetch New Kegs System
        const { data: kegsData, error: kegsError } = await supabase
          .from('kegs')
          .select('*')
          .order('purchase_date', { ascending: false });

        if (kegsError) {
          console.error('Error fetching kegs:', kegsError);
        } else if (kegsData) {
          const mappedKegs: Keg[] = kegsData.map(k => ({
            id: k.id,
            brand: k.brand,
            capacity: k.capacity,
            currentLiters: k.current_liters,
            purchasePrice: k.purchase_price,
            purchaseDate: k.purchase_date,
            activationDate: k.activation_date,
            status: k.status as KegStatus,
            code: k.code
          }));
          setState(prev => ({ ...prev, kegs: mappedKegs }));
        }

        const { data: movementsData, error: movementsError } = await supabase
          .from('keg_movements')
          .select('*')
          .order('date', { ascending: false });

        if (movementsError) {
          console.error('Error fetching keg movements:', movementsError);
        } else if (movementsData) {
          const mappedMovements: KegMovement[] = movementsData.map(m => ({
            id: m.id,
            kegId: m.keg_id,
            type: m.type as 'Venda' | 'Perda' | 'Transferência',
            liters: m.liters,
            date: m.date,
            description: m.description
          }));
          setState(prev => ({ ...prev, kegMovements: mappedMovements }));

        }

        // Fetch Legacy Keg Sales (keeping for compatibility/other modules if needed)
        const { data: kegData, error: kegError } = await supabase
          .from('keg_sales')
          .select('*')
          .order('date', { ascending: false });

        if (kegError) {
          console.error('Error fetching keg sales:', kegError);
        } else if (kegData) {
          const mappedLegacy: KegSale[] = kegData.map(sale => ({
            id: sale.id,
            date: sale.date,
            brand: sale.brand,
            volume: sale.volume,
            quantity: sale.quantity,
            code: sale.code,
            value: sale.value,
            status: sale.status as 'Confirmado' | 'Pendente',
            operationType: sale.operation_type as 'purchase' | 'sale'
          }));
          setState(prev => ({ ...prev, kegSales: mappedLegacy }));
        }

        // Fetch Categories
        const { data: catData, error: catError } = await supabase
          .from('transaction_categories')
          .select('*')
          .order('name', { ascending: true });

        if (catError) {
          console.error('Error fetching categories:', catError);
        } else if (catData) {
          setState(prev => ({ ...prev, categories: catData }));
        }

        // Fetch Managers
        const { data: managerData, error: managerError } = await supabase
          .from('managers')
          .select('*')
          .order('name', { ascending: true });

        if (managerError) {
          console.error('Error fetching managers:', managerError);
        } else if (managerData) {
          setState(prev => ({ ...prev, managers: managerData }));
        }

        // Fetch Vehicles
        const { data: vehicleData, error: vehicleError } = await supabase
          .from('vehicles')
          .select('*')
          .order('model', { ascending: true });

        if (vehicleError) {
          console.error('Error fetching vehicles:', vehicleError);
        } else if (vehicleData) {
          setState(prev => ({ ...prev, vehicles: vehicleData }));
        }

        // Fetch Keg Brands
        const { data: brandData, error: brandError } = await supabase
          .from('keg_brands')
          .select('*')
          .order('name', { ascending: true });

        if (brandError) {
          console.error('Error fetching keg brands:', brandError);
        } else if (brandData) {
          setState(prev => ({ ...prev, kegBrands: brandData }));
        }
      } catch (err) {
        console.error("Critical error during initial data fetch:", err);
      }
    };

    fetchData();
  }, [user]);

  const addCashTransaction = async (tx: CashTransaction | CashTransaction[]) => {
    const newTransactions = Array.isArray(tx) ? tx : [tx];

    // Preparar dados para insert (mapping camelCase -> snake_case)
    const dbTransactions = newTransactions.map(t => ({
      date: t.date,
      type: t.type,
      category: t.category,
      description: t.description,
      amount: t.amount,
      manager: t.manager,
      is_venda_dinheiro: t.isVendaDinheiro,
      user_id: user?.id
    }));

    const { data, error } = await supabase
      .from('cash_transactions')
      .insert(dbTransactions)
      .select();

    if (error) {
      console.error("Erro ao salvar transação:", error);
      showToast(`Erro ao gravar registo: ${error.message || 'Erro de base de dados'}`, "error");
      throw error; // Lança o erro para que o formulário saiba que falhou
    }

    showToast("Registado com sucesso.", "success");

    if (data) {
      const savedTransactions: CashTransaction[] = data.map(item => ({
        id: item.id,
        date: item.date,
        type: item.type as 'entrada' | 'saida',
        category: item.category,
        description: item.description,
        amount: item.amount,
        manager: item.manager,
        isVendaDinheiro: item.is_venda_dinheiro
      }));

      setState(prev => ({ ...prev, cashTransactions: [...savedTransactions, ...prev.cashTransactions] }));
      setView('cash-fund');
    }
  };

  const updateCashTransaction = async (id: string, updatedTx: Partial<CashTransaction>) => {
    // Preparar dados para update (mapping camelCase -> snake_case)
    const dbUpdate: any = {};
    if (updatedTx.date) dbUpdate.date = updatedTx.date;
    if (updatedTx.type) dbUpdate.type = updatedTx.type;
    if (updatedTx.category) dbUpdate.category = updatedTx.category;
    if (updatedTx.description) dbUpdate.description = updatedTx.description;
    if (updatedTx.amount) dbUpdate.amount = updatedTx.amount;
    if (updatedTx.manager) dbUpdate.manager = updatedTx.manager;
    if (updatedTx.isVendaDinheiro !== undefined) dbUpdate.is_venda_dinheiro = updatedTx.isVendaDinheiro;

    const { error } = await supabase
      .from('cash_transactions')
      .update(dbUpdate)
      .eq('id', id);

    if (error) {
      console.error("Erro ao atualizar transação:", error);
      showToast("O registo não foi gravado.", "error");
      return;
    }

    showToast("Registado com sucesso.", "success");

    setState(prev => ({
      ...prev,
      cashTransactions: prev.cashTransactions.map(tx =>
        tx.id === id ? { ...tx, ...updatedTx, id } : tx
      )
    }));

    setEditingTransaction(null);
    setView('cash-fund');
  };

  const deleteCashTransaction = async (id: string) => {
    const { error } = await supabase
      .from('cash_transactions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error("Erro ao remover transação:", error);
      showToast("Erro ao remover transação!", "error");
      return;
    }

    showToast("Transação removida.", "success");

    setState(prev => ({
      ...prev,
      cashTransactions: prev.cashTransactions.filter(tx => tx.id !== id)
    }));
  };

  const addMileageRecord = async (record: MileageRecord | MileageRecord[]) => {
    const newRecords = Array.isArray(record) ? record : [record];

    const dbRecords = newRecords.map(r => ({
      date: r.date,
      vehicle: r.vehicle,
      km_initial: r.kmInitial,
      km_final: r.kmFinal,
      liters: r.liters,
      cost: r.cost,
      user_id: user?.id
    }));

    const { data, error } = await supabase
      .from('mileage_records')
      .insert(dbRecords)
      .select();

    if (error) {
      console.error("Erro ao salvar quilometragem:", error);
      showToast("O registo não foi gravado.", "error");
      return;
    }

    showToast("Registado com sucesso.", "success");

    if (data) {
      const savedRecords: MileageRecord[] = data.map(item => ({
        id: item.id,
        date: item.date,
        vehicle: item.vehicle,
        kmInitial: item.km_initial,
        kmFinal: item.km_final,
        liters: item.liters,
        cost: item.cost
      }));

      setState(prev => ({ ...prev, mileageRecords: [...savedRecords, ...prev.mileageRecords] }));
      setView('mileage');
    }
  };

  const updateMileageRecord = async (id: string, updatedRecord: Partial<MileageRecord>) => {
    // Database Mapping (camelCase -> snake_case)
    const dbUpdate: any = {};
    if (updatedRecord.date) dbUpdate.date = updatedRecord.date;
    if (updatedRecord.vehicle) dbUpdate.vehicle = updatedRecord.vehicle;
    if (updatedRecord.kmInitial !== undefined) dbUpdate.km_initial = updatedRecord.kmInitial;
    if (updatedRecord.kmFinal !== undefined) dbUpdate.km_final = updatedRecord.kmFinal;
    if (updatedRecord.liters !== undefined) dbUpdate.liters = updatedRecord.liters;
    if (updatedRecord.cost !== undefined) dbUpdate.cost = updatedRecord.cost;

    const { error } = await supabase
      .from('mileage_records')
      .update(dbUpdate)
      .eq('id', id);

    if (error) {
      console.error("Erro ao atualizar quilometragem:", error);
      showToast("O registo não foi gravado.", "error");
      return;
    }

    showToast("Registado com sucesso.", "success");

    setState(prev => ({
      ...prev,
      mileageRecords: prev.mileageRecords.map(rec =>
        rec.id === id ? { ...rec, ...updatedRecord, id } : rec
      )
    }));

    setEditingMileageRecord(null);
    setView('mileage');
  };

  const deleteMileageRecord = async (id: string) => {
    const { error } = await supabase
      .from('mileage_records')
      .delete()
      .eq('id', id);

    if (error) {
      console.error("Erro ao remover quilometragem:", error);
      showToast("Erro ao remover registo!", "error");
      return;
    }

    setState(prev => ({
      ...prev,
      mileageRecords: prev.mileageRecords.filter(rec => rec.id !== id)
    }));
  };

  const addKegSale = async (sale: KegSale | KegSale[]) => {
    const newSales = Array.isArray(sale) ? sale : [sale];

    const dbSales = newSales.map(s => ({
      date: s.date,
      brand: s.brand,
      volume: s.volume,
      quantity: s.quantity,
      code: s.code,
      value: s.value,
      status: s.status,
      operation_type: s.operationType,
      user_id: user?.id
    }));

    const { data, error } = await supabase
      .from('keg_sales')
      .insert(dbSales)
      .select();

    if (error) {
      console.error("Erro ao salvar vendas:", error);
      showToast("O registo não foi gravado.", "error");
      return;
    }

    showToast("Registado com sucesso.", "success");

    if (data) {
      const savedSales: KegSale[] = data.map(item => ({
        id: item.id,
        date: item.date,
        brand: item.brand,
        volume: item.volume,
        quantity: item.quantity,
        code: item.code,
        value: item.value,
        status: item.status as 'Confirmado' | 'Pendente',
        operationType: item.operation_type as 'purchase' | 'sale'
      }));

      setState(prev => ({ ...prev, kegSales: [...savedSales, ...prev.kegSales] }));
      setView('keg-sales');
    }
  };

  const updateKegSale = async (id: string, updatedSale: Partial<KegSale>) => {
    // Database Mapping
    const dbUpdate: any = {};
    if (updatedSale.date) dbUpdate.date = updatedSale.date;
    if (updatedSale.brand) dbUpdate.brand = updatedSale.brand;
    if (updatedSale.volume !== undefined) dbUpdate.volume = updatedSale.volume;
    if (updatedSale.quantity !== undefined) dbUpdate.quantity = updatedSale.quantity;
    if (updatedSale.code) dbUpdate.code = updatedSale.code;
    if (updatedSale.value !== undefined) dbUpdate.value = updatedSale.value;
    if (updatedSale.status) dbUpdate.status = updatedSale.status;
    if (updatedSale.operationType) dbUpdate.operation_type = updatedSale.operationType;

    const { error } = await supabase
      .from('keg_sales')
      .update(dbUpdate)
      .eq('id', id);

    if (error) {
      console.error("Erro ao atualizar venda de barril:", error);
      showToast("O registo não foi gravado.", "error");
      return;
    }

    showToast("Registado com sucesso.", "success");

    setState(prev => ({
      ...prev,
      kegSales: prev.kegSales.map(sale =>
        sale.id === id ? { ...sale, ...updatedSale, id } : sale
      )
    }));

    setEditingKegSale(null);
    setView('keg-sales');
  };

  const deleteKegSale = async (id: string) => {
    const { error } = await supabase
      .from('keg_sales')
      .delete()
      .eq('id', id);

    if (error) {
      console.error("Erro ao remover venda de barril:", error);
      showToast("Erro ao remover venda!", "error");
      return;
    }

    showToast("Venda removida com sucesso.", "success");

    setState(prev => ({
      ...prev,
      kegSales: prev.kegSales.filter(sale => sale.id !== id)
    }));
  };

  // --- NEW KEG SYSTEM FUNCTIONS ---

  const addKeg = async (keg: Keg | Keg[]) => {
    const newKegs = Array.isArray(keg) ? keg : [keg];
    const dbKegs = newKegs.map(k => ({
      brand: k.brand,
      capacity: k.capacity,
      current_liters: k.currentLiters,
      purchase_price: k.purchasePrice,
      purchase_date: k.purchaseDate,
      status: k.status,
      code: k.code,
      user_id: user?.id
    }));

    const { data, error } = await supabase.from('kegs').insert(dbKegs).select();

    if (error) {
      showToast("Erro ao registar barril.", "error");
      return;
    }

    if (data) {
      const saved: Keg[] = data.map(k => ({
        id: k.id,
        brand: k.brand,
        capacity: k.capacity,
        currentLiters: k.current_liters,
        purchasePrice: k.purchase_price,
        purchaseDate: k.purchase_date,
        status: k.status as KegStatus,
        code: k.code
      }));
      setState(prev => ({ ...prev, kegs: [...saved, ...prev.kegs] }));
      showToast(`${saved.length} barril(s) registado(s).`, "success");
    }
  };

  const updateKeg = async (id: string, updates: Partial<Keg>) => {
    const dbUpdate: any = {};
    if (updates.status) dbUpdate.status = updates.status;
    if (updates.currentLiters !== undefined) dbUpdate.current_liters = updates.currentLiters;
    if (updates.activationDate) dbUpdate.activation_date = updates.activationDate;

    const { error } = await supabase.from('kegs').update(dbUpdate).eq('id', id);

    if (error) {
      showToast("Erro ao atualizar barril.", "error");
      return;
    }

    setState(prev => ({
      ...prev,
      kegs: prev.kegs.map(k => k.id === id ? { ...k, ...updates } : k)
    }));
  };
  const deleteKeg = async (id: string) => {
    const { error } = await supabase.from('kegs').delete().eq('id', id);

    if (error) {
      showToast("Erro ao remover barril.", "error");
      return;
    }

    showToast("Barril removido com sucesso.", "success");
    setState(prev => ({
      ...prev,
      kegs: prev.kegs.filter(k => k.id !== id)
    }));
  };

  const transferKeg = async (kegId: string, liters: number, destination: string) => {
    // 1. Update Keg
    await updateKeg(kegId, {
      status: 'Transferido',
      currentLiters: 0
    });

    // 2. Record Transfer Movement
    await addKegMovement({
      id: '', // DB Generated
      kegId: kegId,
      type: 'Transferência',
      liters: liters,
      date: new Date().toISOString(),
      description: `Transferido/Emprestado para: ${destination}`
    });

    showToast(`Transferência de ${liters}L concluída.`, "success");
  };


  const addKegMovement = async (movement: KegMovement) => {
    const { data, error } = await supabase.from('keg_movements').insert([{
      keg_id: movement.kegId,
      type: movement.type,
      liters: movement.liters,
      date: movement.date,
      description: movement.description,
      user_id: user?.id
    }]).select();

    if (error) return;

    if (data) {
      const saved: KegMovement = {
        id: data[0].id,
        kegId: data[0].keg_id,
        type: data[0].type,
        liters: data[0].liters,
        date: data[0].date,
        description: data[0].description
      };
      setState(prev => ({ ...prev, kegMovements: [saved, ...prev.kegMovements] }));
    }
  };

  /**
   * FIFO Engine for Sales Distribution
   * Proccesses external sales volume and drains active kegs.
   */
  const processExternalSales = async (brand: string, totalLiters: number, date: string) => {
    // 1. Get active kegs for the brand, sorted by activation_date
    let remaining = totalLiters;
    const activeKegs = state.kegs
      .filter(k => k.brand === brand && k.status === 'Ativo' && k.currentLiters > 0)
      .sort((a, b) => new Date(a.activationDate || 0).getTime() - new Date(b.activationDate || 0).getTime());

    if (activeKegs.length === 0) {
      showToast(`Nenhum barril ativo de ${brand} para consumir!`, "error");
      return;
    }

    for (const keg of activeKegs) {
      if (remaining <= 0) break;

      const consumption = Math.min(keg.currentLiters, remaining);
      const newLiters = keg.currentLiters - consumption;
      const newStatus: KegStatus = newLiters <= 0 ? 'Esgotado' : 'Ativo';

      // Update Keg
      await updateKeg(keg.id, {
        currentLiters: newLiters,
        status: newStatus
      });

      // Record Movement
      await addKegMovement({
        id: '', // Generated by DB
        kegId: keg.id,
        type: 'Venda',
        liters: consumption,
        date: date,
        description: `Consumo FIFO de venda externa (${brand})`
      });

      remaining -= consumption;
    }

    if (remaining > 0) {
      showToast(`Atenção: Sobraram ${remaining}L sem barril associado!`, "info");
    } else {
      showToast(`Venda de ${totalLiters}L processada com sucesso via FIFO.`, "success");
    }
  };

  const registerKegLoss = async (kegId: string, liters: number, description: string = 'Barril estragado') => {
    // 1. Update Keg
    await updateKeg(kegId, {
      status: 'Estragado',
      currentLiters: 0
    });

    // 2. Record Loss Movement
    await addKegMovement({
      id: '', // DB Generated
      kegId: kegId,
      type: 'Perda',
      liters: liters,
      date: new Date().toISOString(),
      description: description
    });

    showToast(`Perda de ${liters}L registada com sucesso.`, "success");
  };



  const addCategory = async (name: string) => {
    const { data, error } = await supabase
      .from('transaction_categories')
      .insert([{ name, user_id: user?.id }])
      .select();

    if (error) {
      console.error('Error adding category:', error);
      showToast('Erro ao adicionar categoria!', 'error');
      return;
    }

    showToast('Categoria adicionada!', 'success');

    if (data && data.length > 0) {
      setState(prev => ({ ...prev, categories: [...prev.categories, data[0]] }));
    }
  };

  const updateCategory = async (id: string, name: string) => {
    const { data, error } = await supabase
      .from('transaction_categories')
      .update({ name })
      .eq('id', id)
      .select();

    if (error) {
      console.error('Error updating category:', error);
      showToast('Erro ao atualizar categoria!', 'error');
      return;
    }

    showToast('Categoria atualizada!', 'success');

    if (data && data.length > 0) {
      setState(prev => ({
        ...prev,
        categories: prev.categories.map(cat => cat.id === id ? data[0] : cat)
      }));
    }
  };

  const deleteCategory = async (id: string) => {
    const { error } = await supabase
      .from('transaction_categories')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting category:', error);
      showToast('Erro ao remover categoria!', 'error');
      return;
    }

    showToast('Categoria removida!', 'success');

    setState(prev => ({
      ...prev,
      categories: prev.categories.filter(cat => cat.id !== id)
    }));
  };

  const addManager = async (name: string, role: string) => {
    const { data, error } = await supabase
      .from('managers')
      .insert([{ name, role, user_id: user?.id }])
      .select();

    if (error) {
      console.error('Error adding manager:', error);
      showToast('Erro ao adicionar gerente!', 'error');
      return;
    }

    showToast('Gerente adicionado!', 'success');

    if (data && data.length > 0) {
      setState(prev => ({ ...prev, managers: [...prev.managers, data[0]] }));
    }
  };

  const updateManager = async (id: string, name: string, role: string) => {
    const { data, error } = await supabase
      .from('managers')
      .update({ name, role })
      .eq('id', id)
      .select();

    if (error) {
      console.error('Error updating manager:', error);
      showToast('Erro ao atualizar gerente!', 'error');
      return;
    }

    showToast('Gerente atualizado!', 'success');

    if (data && data.length > 0) {
      setState(prev => ({
        ...prev,
        managers: prev.managers.map(mgr => mgr.id === id ? data[0] : mgr)
      }));
    }
  };

  const deleteManager = async (id: string) => {
    const { error } = await supabase
      .from('managers')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting manager:', error);
      showToast('Erro ao remover gerente!', 'error');
      return;
    }

    showToast('Gerente removido!', 'success');

    setState(prev => ({
      ...prev,
      managers: prev.managers.filter(mgr => mgr.id !== id)
    }));
  };

  const addVehicle = async (model: string, plate: string, type: string) => {
    const { data, error } = await supabase
      .from('vehicles')
      .insert([{ model, plate, type, user_id: user?.id }])
      .select();

    if (error) {
      console.error('Error adding vehicle:', error);
      showToast('Erro ao adicionar veículo!', 'error');
      return;
    }

    showToast('Veículo adicionado!', 'success');

    if (data && data.length > 0) {
      setState(prev => ({ ...prev, vehicles: [...prev.vehicles, data[0]] }));
    }
  };

  const updateVehicle = async (id: string, model: string, plate: string, type: string) => {
    const { data, error } = await supabase
      .from('vehicles')
      .update({ model, plate, type })
      .eq('id', id)
      .select();

    if (error) {
      console.error('Error updating vehicle:', error);
      showToast('Erro ao atualizar veículo!', 'error');
      return;
    }

    showToast('Veículo atualizado!', 'success');

    if (data && data.length > 0) {
      setState(prev => ({
        ...prev,
        vehicles: prev.vehicles.map(veh => veh.id === id ? data[0] : veh)
      }));
    }
  };

  const deleteVehicle = async (id: string) => {
    const { error } = await supabase
      .from('vehicles')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting vehicle:', error);
      showToast('Erro ao remover veículo!', 'error');
      return;
    }

    showToast('Veículo removido!', 'success');

    setState(prev => ({
      ...prev,
      vehicles: prev.vehicles.filter(veh => veh.id !== id)
    }));
  };

  const addKegBrand = async (name: string) => {
    const { data, error } = await supabase
      .from('keg_brands')
      .insert([{ name, user_id: user?.id }])
      .select();

    if (error) {
      console.error('Error adding keg brand:', error);
      showToast('Erro ao adicionar marca!', 'error');
      return;
    }

    showToast('Marca adicionada!', 'success');

    if (data && data.length > 0) {
      setState(prev => ({ ...prev, kegBrands: [...prev.kegBrands, data[0]] }));
    }
  };

  const updateKegBrand = async (id: string, name: string) => {
    const { data, error } = await supabase
      .from('keg_brands')
      .update({ name })
      .eq('id', id)
      .select();

    if (error) {
      console.error('Error updating keg brand:', error);
      showToast('Erro ao atualizar marca!', 'error');
      return;
    }

    showToast('Marca atualizada!', 'success');

    if (data && data.length > 0) {
      setState(prev => ({
        ...prev,
        kegBrands: prev.kegBrands.map(brand => brand.id === id ? data[0] : brand)
      }));
    }
  };

  const deleteKegBrand = async (id: string) => {
    const { error } = await supabase
      .from('keg_brands')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting keg brand:', error);
      showToast('Erro ao remover marca!', 'error');
      return;
    }

    showToast('Marca removida!', 'success');

    setState(prev => ({
      ...prev,
      kegBrands: prev.kegBrands.filter(brand => brand.id !== id)
    }));
  };

  const importBackup = async (backupData: any) => {
    if (!backupData || !backupData.data) {
      showToast('Formato de backup inválido.', 'error');
      return;
    }

    const confirmed = await showConfirm(
      'Atenção: A importação irá adicionar ou atualizar os dados existentes. Recomenda-se exportar um backup atual antes de prosseguir. Deseja continuar?'
    );

    if (!confirmed) return;

    try {
      const { data } = backupData;
      const userId = user?.id;

      showToast('Iniciando restauração...', 'info');

      // 1. Restore Categories
      if (data.categories && data.categories.length > 0) {
        const cats = data.categories.map((c: any) => ({
          id: c.id,
          name: c.name,
          user_id: userId
        }));
        await supabase.from('transaction_categories').upsert(cats);
      }

      // 2. Restore Managers
      if (data.managers && data.managers.length > 0) {
        const mgrs = data.managers.map((m: any) => ({
          id: m.id,
          name: m.name,
          role: m.role,
          user_id: userId
        }));
        await supabase.from('managers').upsert(mgrs);
      }

      // 3. Restore Vehicles
      if (data.vehicles && data.vehicles.length > 0) {
        const vehs = data.vehicles.map((v: any) => ({
          id: v.id,
          model: v.model,
          plate: v.plate,
          type: v.type,
          user_id: userId
        }));
        await supabase.from('vehicles').upsert(vehs);
      }

      // 4. Restore Keg Brands
      if (data.kegBrands && data.kegBrands.length > 0) {
        const brands = data.kegBrands.map((b: any) => ({
          id: b.id,
          name: b.name,
          user_id: userId
        }));
        await supabase.from('keg_brands').upsert(brands);
      }

      // 5. Restore Cash Transactions
      if (data.cashTransactions && data.cashTransactions.length > 0) {
        const txs = data.cashTransactions.map((t: any) => ({
          id: t.id,
          date: t.date,
          type: t.type,
          category: t.category,
          description: t.description,
          amount: t.amount,
          manager: t.manager,
          is_venda_dinheiro: t.isVendaDinheiro,
          user_id: userId
        }));
        await supabase.from('cash_transactions').upsert(txs);
      }

      // 6. Restore Mileage Records
      if (data.mileageRecords && data.mileageRecords.length > 0) {
        const recs = data.mileageRecords.map((r: any) => ({
          id: r.id,
          date: r.date,
          vehicle: r.vehicle,
          km_initial: r.kmInitial,
          km_final: r.kmFinal,
          liters: r.liters,
          cost: r.cost,
          user_id: userId
        }));
        await supabase.from('mileage_records').upsert(recs);
      }

      // 7. Restore Keg Sales
      if (data.kegSales && data.kegSales.length > 0) {
        const sales = data.kegSales.map((s: any) => ({
          id: s.id,
          date: s.date,
          brand: s.brand,
          volume: s.volume,
          quantity: s.quantity,
          code: s.code,
          value: s.value,
          status: s.status,
          user_id: userId
        }));
        await supabase.from('keg_sales').upsert(sales);
      }

      showToast('Backup restaurado com sucesso! A recarregar...', 'success');

      // Force reload to update state
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error) {
      console.error("Erro na restauração:", error);
      showToast('Erro ao restaurar backup. Verifique o console.', 'error');
    }
  };

  const clearData = async () => {
    const confirmed = await showConfirm(
      '⚠️ PERIGO: Tem certeza absoluta que deseja apagar TODOS os dados do sistema? Esta ação não pode ser desfeita e irá remover todas as transações, configurações e registros.'
    );

    if (!confirmed) return;

    // Double confirmation for safety
    // In a real app we might ask for typing "DELETE" or password, but here a simple double check is ok for now.
    const doubleConfirmed = await showConfirm(
      'Último aviso: Todos os dados serão perdidos permanentemente. Deseja realmente prosseguir para zerar o sistema?'
    );

    if (!doubleConfirmed) return;

    try {
      const userId = user?.id;
      showToast('A limpar sistema...', 'info');

      // Delete data in reverse order of dependencies (child tables first)

      // 1. Transactions and records
      await supabase.from('cash_transactions').delete().eq('user_id', userId);
      await supabase.from('mileage_records').delete().eq('user_id', userId);
      await supabase.from('keg_sales').delete().eq('user_id', userId);

      // 2. Configuration tables
      await supabase.from('transaction_categories').delete().eq('user_id', userId);
      await supabase.from('vehicles').delete().eq('user_id', userId);
      await supabase.from('managers').delete().eq('user_id', userId);
      await supabase.from('keg_brands').delete().eq('user_id', userId);

      // Limpar cache local para garantir que não sobram dados antigos
      localStorage.removeItem('volare_state');
      localStorage.clear(); // Limpeza completa por segurança

      showToast('Sistema reinicializado com sucesso! A recarregar...', 'success');

      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error) {
      console.error("Erro ao limpar dados:", error);
      showToast('Erro ao limpar dados. Verifique o console.', 'error');
    }
  };

  const handleAddSystemUser = async (data: { name: string, email: string, password: string, role: string }) => {
    try {
      // 1. Validar campos
      if (!data.email || !data.password || !data.name || !data.role) {
        showToast("Por favor, preencha todos os campos obrigatórios.", "error");
        return;
      }

      if (data.password.length < 6) {
        showToast("A senha deve ter pelo menos 6 caracteres.", "error");
        return;
      }

      // 2. Criar cliente temporário para não deslogar o administrador atual
      // O Supabase Client por padrão persiste a sessão no localStorage.
      // Usamos persistSession: false para que o signUp não substitua o login do admin.
      const tempSupabase = createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      });

      // 3. Criar utilizador usando a API oficial de Auth
      const { data: authData, error: authError } = await tempSupabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            name: data.name,
            role: data.role.toLowerCase()
          }
        }
      });

      if (authError) {
        console.error("Erro no Supabase Auth:", authError);

        // Tratamento de erros específicos conforme solicitado
        let errorMessage = authError.message;
        if (errorMessage.includes("already registered")) {
          errorMessage = "Este e-mail já está registado no sistema.";
        } else if (errorMessage.includes("Invalid email")) {
          errorMessage = "O e-mail inserido é inválido.";
        } else if (authError.status === 400 || authError.status === 422) {
          errorMessage = `Falha na validação: ${authError.message}`;
        }

        showToast(errorMessage, 'error');
        return;
      }

      if (authData.user) {
        showToast(`Utilizador ${data.name} criado com sucesso!`, 'success');
        // Opcional: Se houver uma tabela de perfis extra, poderia ser inserido aqui,
        // mas o sistema atual usa user_metadata.
      }

    } catch (err: any) {
      console.error("Erro inesperado na criação:", err);
      showToast(`Falha na comunicação com Supabase: ${err.message}`, 'error');
    }
  };

  if (!user) {
    return <LoginView onLogin={handleLogin} />;
  }

  const renderView = () => {
    switch (view) {
      case 'dashboard':
        return <GeneralDashboard state={state} onNavigate={setView} />;
      case 'cash-fund':
        return (
          <CashFundDashboard
            state={state}
            onAdd={canCreate(user.role) ? () => {
              setEditingTransaction(null);
              setView('cash-fund-new');
            } : undefined}
            onEdit={canEdit(user.role) ? (tx) => {
              setEditingTransaction(tx);
              setView('cash-fund-edit');
            } : undefined}
            onDelete={canDelete(user.role) ? deleteCashTransaction : undefined}
            onConfirmRequest={showConfirm}
          />
        );
      case 'cash-fund-new':
        return <CashFundForm state={state} onSubmit={addCashTransaction} onCancel={() => setView('cash-fund')} onNotify={showToast} onConfirmRequest={showConfirm} />;
      case 'cash-fund-edit':
        return (
          <CashFundForm
            state={state}
            initialData={editingTransaction || undefined}
            onSubmit={(tx) => {
              if (!Array.isArray(tx) && editingTransaction) {
                updateCashTransaction(editingTransaction.id, tx);
              }
            }}
            onCancel={() => {
              setEditingTransaction(null);
              setView('cash-fund');
            }}
            onNotify={showToast}
            onConfirmRequest={showConfirm}
          />
        );
      case 'mileage':
        return (
          <MileageDashboard
            state={state}
            onAdd={canCreate(user.role) ? () => {
              setEditingMileageRecord(null);
              setView('mileage-new');
            } : undefined}
            onEdit={canEdit(user.role) ? (record) => {
              setEditingMileageRecord(record);
              setView('mileage-edit');
            } : undefined}
            onDelete={canDelete(user.role) ? deleteMileageRecord : undefined}
            onConfirmRequest={showConfirm}
          />
        );
      case 'mileage-new':
        return <MileageForm state={state} onSubmit={addMileageRecord} onCancel={() => setView('mileage')} onNotify={showToast} onConfirmRequest={showConfirm} />;
      case 'mileage-edit':
        return (
          <MileageForm
            state={state}
            initialData={editingMileageRecord || undefined}
            onSubmit={(record) => {
              if (!Array.isArray(record) && editingMileageRecord) {
                updateMileageRecord(editingMileageRecord.id, record);
              }
            }}
            onCancel={() => {
              setEditingMileageRecord(null);
              setView('mileage');
            }}
            onNotify={showToast}
            onConfirmRequest={showConfirm}
          />
        );
      case 'keg-sales':
        return (
          <KegSalesDashboard
            state={state}
            onAdd={canCreate(user.role) ? () => {
              setEditingKegSale(null);
              setView('keg-sales-new');
            } : undefined}
            onEdit={canEdit(user.role) ? (sale) => {
              setEditingKegSale(sale);
              setView('keg-sales-edit');
            } : undefined}
            onDelete={canDelete(user.role) ? deleteKegSale : undefined}
            onUpdateKeg={updateKeg}
            onRegisterLoss={registerKegLoss}
            onDeleteKeg={canDelete(user.role) ? deleteKeg : undefined}
            onTransferKeg={canEdit(user.role) ? transferKeg : undefined}
            onEditKeg={canEdit(user.role) ? (keg) => {
              setEditingKeg(keg);
              setView('keg-edit');
            } : undefined}
            onConfirmRequest={showConfirm}
          />
        );
      case 'keg-sales-new':
        return (
          <KegSalesForm
            state={state}
            onSubmit={addKegSale}
            onAddKeg={addKeg}
            onProcessSales={processExternalSales}
            onCancel={() => setView('keg-sales')}
            onNotify={showToast}
            onConfirmRequest={showConfirm}
          />
        );
      case 'keg-sales-edit':
        return (
          <KegSalesForm
            state={state}
            initialData={editingKegSale || undefined}
            onSubmit={(sale) => {
              if (!Array.isArray(sale) && editingKegSale) {
                updateKegSale(editingKegSale.id, sale);
              }
            }}
            onAddKeg={addKeg}
            onProcessSales={processExternalSales}
            onCancel={() => {
              setEditingKegSale(null);
              setView('keg-sales');
            }}
            onNotify={showToast}
            onConfirmRequest={showConfirm}
          />
        );
      case 'keg-edit':
        return (
          <KegSalesForm
            state={state}
            initialKegData={editingKeg || undefined}
            onSubmit={() => { }} // Not used for direct keg edit in this flow
            onUpdateKeg={async (id, updates) => {
              await updateKeg(id, updates);
              setEditingKeg(null);
              setView('keg-sales');
            }}
            onAddKeg={addKeg}
            onProcessSales={processExternalSales}
            onCancel={() => {
              setEditingKeg(null);
              setView('keg-sales');
            }}
            onNotify={showToast}
            onConfirmRequest={showConfirm}
          />
        );


      case 'settings':
        if (!canConfigure(user.role)) {
          return (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 animate-in fade-in zoom-in duration-300">
              <span className="material-symbols-outlined text-6xl mb-4 text-slate-300">lock_person</span>
              <h2 className="font-black text-2xl text-slate-700 mb-2">Acesso Restrito</h2>
              <p className="text-sm font-medium opacity-70 mb-6">Você não tem permissão para aceder às configurações.</p>
              <button
                onClick={() => setView('dashboard')}
                className="px-6 py-2 bg-primary text-white rounded-lg font-bold hover:bg-primary-hover transition-colors shadow-lg shadow-primary/20"
              >
                Voltar ao Painel
              </button>
            </div>
          );
        }
        return (
          <SettingsView
            state={state}
            user={user}
            onNavigate={setView}
            onAddCategory={addCategory}
            onUpdateCategory={updateCategory}
            onDeleteCategory={deleteCategory}
            onAddManager={addManager}
            onUpdateManager={updateManager}
            onDeleteManager={deleteManager}
            onAddVehicle={addVehicle}
            onUpdateVehicle={updateVehicle}
            onDeleteVehicle={deleteVehicle}
            onAddKegBrand={addKegBrand}
            onUpdateKegBrand={updateKegBrand}
            onDeleteKegBrand={deleteKegBrand}
            onNotify={showToast}
            onConfirmRequest={showConfirm}
            onImportBackup={importBackup}
            onClearData={clearData}
            onCreateSystemUser={handleAddSystemUser}
          />
        );
      default:
        return <GeneralDashboard state={state} onNavigate={setView} />;
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar
        currentView={view}
        onViewChange={setView}
        user={user}
        onLogout={handleLogout}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <div className="flex flex-1 flex-col overflow-hidden bg-background-light relative">
        <Header view={view} onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          <div className="max-w-[1600px] mx-auto w-full">
            {renderView()}
          </div>
        </main>
        {canUseChatbot(user.role) && <Chatbot appState={state} user={user} />}
      </div>
      <Toast toasts={state.toasts} onRemove={removeToast} />
      <ConfirmationModal state={state.confirmationModal} />
    </div>
  );
};

export default App;
