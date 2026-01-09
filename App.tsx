
import React, { useState, useMemo, useEffect } from 'react';
import { ViewType, AppState, CashTransaction, MileageRecord, KegSale, User, TransactionCategory, Manager, Vehicle, KegBrand } from './types';
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
import { supabase } from './src/lib/supabase';

const App: React.FC = () => {
  const [view, setView] = useState<ViewType>('dashboard');
  const [user, setUser] = useState<User | null>(null);

  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('volare_state');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Merge com INITIAL_STATE para garantir que novos campos (como categories) existam
      return { ...INITIAL_STATE, ...parsed, categories: parsed.categories || INITIAL_STATE.categories };
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
        setView('dashboard');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const mapUser = (supabaseUser: any) => {
    if (!supabaseUser) return;
    setUser({
      id: supabaseUser.id,
      name: supabaseUser.user_metadata.name || supabaseUser.email?.split('@')[0] || 'Usuário',
      email: supabaseUser.email || '',
      role: supabaseUser.user_metadata.role || 'Usuário',
      avatar: supabaseUser.user_metadata.avatar_url || 'https://ui-avatars.com/api/?name=' + (supabaseUser.email?.split('@')[0] || 'U')
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

  // Fetch Initial Data
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const { data: cashData, error: cashError } = await supabase
        .from('cash_transactions')
        .select('*')
        .order('date', { ascending: false });

      if (cashError) {
        console.error('Error fetching cash transactions:', cashError);
        return;
      }

      if (cashData) {
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

      // Fetch Keg Sales
      const { data: kegData, error: kegError } = await supabase
        .from('keg_sales')
        .select('*')
        .order('date', { ascending: false });

      if (kegError) {
        console.error('Error fetching keg sales:', kegError);
      } else if (kegData) {
        const mappedKegs: KegSale[] = kegData.map(sale => ({
          id: sale.id,
          date: sale.date,
          brand: sale.brand,
          volume: sale.volume,
          quantity: sale.quantity,
          code: sale.code,
          value: sale.value,
          status: sale.status as 'Confirmado' | 'Pendente'
        }));
        setState(prev => ({ ...prev, kegSales: mappedKegs }));
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
      alert("Erro ao salvar dados no servidor!");
      return;
    }

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
      alert("Erro ao salvar dados no servidor!");
      return;
    }

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
      user_id: user?.id
    }));

    const { data, error } = await supabase
      .from('keg_sales')
      .insert(dbSales)
      .select();

    if (error) {
      console.error("Erro ao salvar vendas:", error);
      alert("Erro ao salvar dados no servidor!");
      return;
    }

    if (data) {
      const savedSales: KegSale[] = data.map(item => ({
        id: item.id,
        date: item.date,
        brand: item.brand,
        volume: item.volume,
        quantity: item.quantity,
        code: item.code,
        value: item.value,
        status: item.status as 'Confirmado' | 'Pendente'
      }));

      setState(prev => ({ ...prev, kegSales: [...savedSales, ...prev.kegSales] }));
      setView('keg-sales');
    }
  };

  const addCategory = async (name: string) => {
    const { data, error } = await supabase
      .from('transaction_categories')
      .insert([{ name, user_id: user?.id }])
      .select();

    if (error) {
      console.error('Error adding category:', error);
      alert('Erro ao adicionar categoria!');
      return;
    }

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
      alert('Erro ao atualizar categoria!');
      return;
    }

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
      alert('Erro ao remover categoria!');
      return;
    }

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
      alert('Erro ao adicionar gerente!');
      return;
    }

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
      alert('Erro ao atualizar gerente!');
      return;
    }

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
      alert('Erro ao remover gerente!');
      return;
    }

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
      alert('Erro ao adicionar veículo!');
      return;
    }

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
      alert('Erro ao atualizar veículo!');
      return;
    }

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
      alert('Erro ao remover veículo!');
      return;
    }

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
      alert('Erro ao adicionar marca de barril!');
      return;
    }

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
      alert('Erro ao atualizar marca de barril!');
      return;
    }

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
      alert('Erro ao remover marca de barril!');
      return;
    }

    setState(prev => ({
      ...prev,
      kegBrands: prev.kegBrands.filter(brand => brand.id !== id)
    }));
  };

  if (!user) {
    return <LoginView onLogin={handleLogin} />;
  }

  const renderView = () => {
    switch (view) {
      case 'dashboard':
        return <GeneralDashboard state={state} onNavigate={setView} />;
      case 'cash-fund':
        return <CashFundDashboard state={state} onAdd={() => setView('cash-fund-new')} />;
      case 'cash-fund-new':
        return <CashFundForm state={state} onSubmit={addCashTransaction} onCancel={() => setView('cash-fund')} />;
      case 'mileage':
        return <MileageDashboard state={state} onAdd={() => setView('mileage-new')} />;
      case 'mileage-new':
        return <MileageForm state={state} onSubmit={addMileageRecord} onCancel={() => setView('mileage')} />;
      case 'keg-sales':
        return <KegSalesDashboard state={state} onAdd={() => setView('keg-sales-new')} />;
      case 'keg-sales-new':
        return <KegSalesForm state={state} onSubmit={addKegSale} onCancel={() => setView('keg-sales')} />;
      case 'settings':
        return (
          <SettingsView
            state={state}
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
          />
        );
      default:
        return <GeneralDashboard state={state} onNavigate={setView} />;
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar currentView={view} onViewChange={setView} user={user} onLogout={handleLogout} />
      <div className="flex flex-1 flex-col overflow-hidden bg-background-light relative">
        <Header view={view} />
        <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          <div className="max-w-[1600px] mx-auto w-full">
            {renderView()}
          </div>
        </main>
        <Chatbot appState={state} />
      </div>
    </div>
  );
};

export default App;
