import React, { useState, useEffect, useReducer } from 'react';
import { 
  HashRouter as Router, 
  Routes, 
  Route, 
  Navigate, 
  Link, 
  useLocation
} from 'react-router-dom';
import { User, Transaction, TransactionType, Category, Currency } from './types.ts';
import { ICONS, guessIconForCategory, SUPPORTED_CURRENCIES } from './constants.tsx';
import Dashboard from './pages/Dashboard.tsx';
import TransactionsPage from './pages/Transactions.tsx';
import StatisticsPage from './pages/Statistics.tsx';
import InsightsPage from './pages/Insights.tsx';
import SettingsPage from './pages/Settings.tsx';
import ProfilesPage from './pages/Profiles.tsx';
import CreateProfilePage from './pages/CreateProfile.tsx';
import Login from './pages/Login.tsx';
import Register from './pages/Register.tsx';

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch (e) {}
  }
  return 'id-' + Math.random().toString(36).substring(2, 15) + '-' + Date.now().toString(36);
};

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'Food & Dining', icon: 'Food', type: TransactionType.EXPENSE, isCustom: false },
  { id: 'cat-2', name: 'Transportation', icon: 'Transport', type: TransactionType.EXPENSE, isCustom: false },
  { id: 'cat-3', name: 'Housing & Rent', icon: 'Home', type: TransactionType.EXPENSE, isCustom: false },
  { id: 'cat-4', name: 'Entertainment', icon: 'Entertainment', type: TransactionType.EXPENSE, isCustom: false },
  { id: 'cat-5', name: 'Shopping', icon: 'Shopping', type: TransactionType.EXPENSE, isCustom: false },
  { id: 'cat-6', name: 'Health & Medical', icon: 'Health', type: TransactionType.EXPENSE, isCustom: false },
  { id: 'cat-7', name: 'Education', icon: 'Education', type: TransactionType.EXPENSE, isCustom: false },
  { id: 'cat-8', name: 'Utilities & Bills', icon: 'Bills', type: TransactionType.EXPENSE, isCustom: false },
  { id: 'cat-9', name: 'Salary', icon: 'Salary', type: TransactionType.INCOME, isCustom: false },
  { id: 'cat-10', name: 'Freelance', icon: 'Salary', type: TransactionType.INCOME, isCustom: false },
];

interface FinanceState {
  transactions: Transaction[];
  categories: Category[];
}

type FinanceAction = 
  | { type: 'ADD_TRANSACTION'; payload: { transaction: Transaction; newCategory?: Category } }
  | { type: 'UPDATE_TRANSACTION'; payload: { transaction: Transaction; newCategory?: Category } }
  | { type: 'DELETE_TRANSACTION'; payload: string }
  | { type: 'SET_DATA'; payload: FinanceState }
  | { type: 'RESET_DATA' };

const financeReducer = (state: FinanceState, action: FinanceAction): FinanceState => {
  switch (action.type) {
    case 'ADD_TRANSACTION':
      return {
        ...state,
        categories: action.payload.newCategory ? [...state.categories, action.payload.newCategory] : state.categories,
        transactions: [action.payload.transaction, ...state.transactions],
      };
    case 'UPDATE_TRANSACTION':
      return {
        ...state,
        categories: action.payload.newCategory ? [...state.categories, action.payload.newCategory] : state.categories,
        transactions: state.transactions.map(t => t.id === action.payload.transaction.id ? action.payload.transaction : t),
      };
    case 'DELETE_TRANSACTION':
      return { ...state, transactions: state.transactions.filter(t => t.id !== action.payload) };
    case 'SET_DATA':
      return action.payload;
    case 'RESET_DATA':
      return { transactions: [], categories: DEFAULT_CATEGORIES };
    default:
      return state;
  }
};

const SidebarLink = ({ to, icon, label, collapsed }: { to: string, icon: React.ReactNode, label: string, collapsed: boolean }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  
  return (
    <Link 
      to={to} 
      className={`
        flex items-center gap-4 px-4 py-3.5 rounded-2xl font-bold transition-all relative group
        ${collapsed ? 'justify-center mx-2' : 'mx-2'}
        ${isActive ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 dark:shadow-none' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'}
      `}
    >
      <div className="w-6 h-6 shrink-0">{icon}</div>
      {!collapsed && <span className="text-sm whitespace-nowrap">{label}</span>}
      {isActive && !collapsed && <div className="absolute right-4 w-1.5 h-1.5 bg-white rounded-full" />}
    </Link>
  );
};

const App = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('currentUser');
    return saved ? JSON.parse(saved) : null;
  });

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved as 'light' | 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });

  const [financeState, dispatch] = useReducer(financeReducer, {
    transactions: [],
    categories: DEFAULT_CATEGORIES
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', isSidebarCollapsed.toString());
  }, [isSidebarCollapsed]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      const savedData = localStorage.getItem(`finance_data_${currentUser.id}`);
      if (savedData) dispatch({ type: 'SET_DATA', payload: JSON.parse(savedData) });
      else dispatch({ type: 'RESET_DATA' });
    } else {
      localStorage.removeItem('currentUser');
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`finance_data_${currentUser.id}`, JSON.stringify(financeState));
    }
  }, [financeState, currentUser]);

  const handleLogout = () => setCurrentUser(null);

  const handleUpdateUser = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    const usersStr = localStorage.getItem('users');
    if (usersStr) {
      const users: User[] = JSON.parse(usersStr);
      const idx = users.findIndex(u => u.id === updatedUser.id);
      if (idx !== -1) {
        users[idx] = updatedUser;
        localStorage.setItem('users', JSON.stringify(users));
      }
    }
  };

  const handleAddTransaction = (tx: any) => {
    if (!currentUser) return false;
    let category = financeState.categories.find(c => c.name.toLowerCase() === tx.categoryName.toLowerCase() && c.type === tx.type);
    let newCategory: Category | undefined;
    if (!category) {
      category = { id: generateId(), name: tx.categoryName, icon: tx.categoryIcon || guessIconForCategory(tx.categoryName), type: tx.type, isCustom: true };
      newCategory = category;
    }
    const transaction: Transaction = {
      id: generateId(),
      userId: currentUser.id,
      type: tx.type,
      categoryId: category.id,
      amount: tx.amount,
      date: tx.date,
      description: tx.description || '',
      merchant: tx.merchant || '',
      receiptImage: tx.receiptImage
    };
    dispatch({ type: 'ADD_TRANSACTION', payload: { transaction, newCategory } });
    return true;
  };

  const handleUpdateTransaction = (id: string, tx: any) => {
    if (!currentUser) return false;
    let category = financeState.categories.find(c => c.name.toLowerCase() === tx.categoryName.toLowerCase() && c.type === tx.type);
    let newCategory: Category | undefined;
    if (!category) {
      category = { id: generateId(), name: tx.categoryName, icon: tx.categoryIcon || guessIconForCategory(tx.categoryName), type: tx.type, isCustom: true };
      newCategory = category;
    }
    const transaction: Transaction = {
      id,
      userId: currentUser.id,
      type: tx.type,
      categoryId: category.id,
      amount: tx.amount,
      date: tx.date,
      description: tx.description || '',
      merchant: tx.merchant || '',
      receiptImage: tx.receiptImage
    };
    dispatch({ type: 'UPDATE_TRANSACTION', payload: { transaction, newCategory } });
    return true;
  };

  if (!currentUser) {
    return (
      <Router>
        <Routes>
          <Route path="/login" element={<Login onLogin={setCurrentUser} />} />
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    );
  }

  const currency = SUPPORTED_CURRENCIES.find(c => c.code === currentUser.currencyCode) || SUPPORTED_CURRENCIES[0];

  return (
    <Router>
      <div className="flex h-screen bg-white dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 overflow-hidden">
        
        <aside 
          className={`
            bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 
            flex flex-col shrink-0 transition-all duration-300 ease-in-out z-40
            ${isSidebarCollapsed ? 'w-[88px]' : 'w-[280px]'}
          `}
        >
          <div 
            className="h-20 flex items-center px-6 gap-3 cursor-pointer select-none shrink-0"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          >
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shrink-0">
              <ICONS.Logo className="w-6 h-6" />
            </div>
            {!isSidebarCollapsed && (
              <div className="flex flex-col overflow-hidden">
                <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white whitespace-nowrap">FinTrack <span className="text-indigo-600">Pro</span></span>
              </div>
            )}
          </div>

          <nav className="flex-1 pt-6 space-y-2 overflow-y-auto scrollbar-hide">
            <SidebarLink to="/" icon={<ICONS.Dashboard />} label="Dashboard" collapsed={isSidebarCollapsed} />
            <SidebarLink to="/transactions" icon={<ICONS.Transactions />} label="Transactions" collapsed={isSidebarCollapsed} />
            <SidebarLink to="/statistics" icon={<ICONS.Statistics />} label="Statistics" collapsed={isSidebarCollapsed} />
            <SidebarLink to="/insights" icon={<ICONS.Chat />} label="AI chat" collapsed={isSidebarCollapsed} />
            <SidebarLink to="/settings" icon={<ICONS.Settings />} label="Settings" collapsed={isSidebarCollapsed} />
          </nav>

          <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-2 shrink-0">
            <button 
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className={`
                w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl font-bold transition-all group
                ${isSidebarCollapsed ? 'justify-center mx-0' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}
                text-slate-500 dark:text-slate-400
              `}
            >
              <div className="w-6 h-6 flex-shrink-0">
                {theme === 'light' ? <ICONS.Moon className="w-full h-full" /> : <ICONS.Sun className="w-full h-full" />}
              </div>
              {!isSidebarCollapsed && <span className="text-sm">Switch to {theme === 'light' ? 'dark' : 'light'}</span>}
            </button>

            <button 
              onClick={handleLogout}
              className={`
                w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl font-bold transition-all group
                ${isSidebarCollapsed ? 'justify-center mx-0' : 'hover:bg-rose-50 dark:hover:bg-rose-900/20'}
                text-rose-500
              `}
            >
              <div className="w-6 h-6 flex-shrink-0">
                <ICONS.Logout className="w-full h-full" />
              </div>
              {!isSidebarCollapsed && <span className="text-sm">Sign out</span>}
            </button>
          </div>
        </aside>

        <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          <header className="h-20 px-8 flex items-center justify-between shrink-0">
            <div />
            <Link 
              to="/settings" 
              className="flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-900 p-2 rounded-2xl transition-all"
            >
              <div className="text-right hidden sm:block">
                <div className="text-sm font-bold text-slate-900 dark:text-white leading-none mb-1">{currentUser.name}</div>
                <div className="text-[10px] font-medium text-slate-400">{currentUser.email}</div>
              </div>
              <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800 shadow-sm overflow-hidden">
                {currentUser.profileImage ? (
                  <img src={currentUser.profileImage} className="w-full h-full object-cover" alt="Profile" />
                ) : (
                  currentUser.name[0].toUpperCase()
                )}
              </div>
            </Link>
          </header>
          
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            <Routes>
              <Route path="/" element={<Dashboard transactions={financeState.transactions} categories={financeState.categories} currency={currency} onAdd={handleAddTransaction} />} />
              <Route path="/transactions" element={<TransactionsPage transactions={financeState.transactions} categories={financeState.categories} currency={currency} onAdd={handleAddTransaction} onEdit={handleUpdateTransaction} onDelete={(id) => dispatch({ type: 'DELETE_TRANSACTION', payload: id })} />} />
              <Route path="/statistics" element={<StatisticsPage transactions={financeState.transactions} categories={financeState.categories} currency={currency} />} />
              <Route path="/insights" element={<InsightsPage transactions={financeState.transactions} categories={financeState.categories} currency={currency} />} />
              <Route path="/settings" element={<SettingsPage currentUser={currentUser} onUpdateUser={handleUpdateUser} onUpdateCurrency={(code) => handleUpdateUser({ ...currentUser, currencyCode: code })} onResetData={() => dispatch({ type: 'RESET_DATA' })} />} />
              <Route path="/profiles" element={<ProfilesPage currentUser={currentUser} onSwitchProfile={setCurrentUser} onDeleteProfile={() => {}} />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
};

export default App;