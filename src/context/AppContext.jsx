import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getCurrentMonth, getTransactionMonth } from '../utils/formatters';

const AppContext = createContext(null);

const STORAGE_KEY = 'nosso_controle_data';

const DEFAULT_ACCOUNTS = [
  { id: '1', name: 'Banco Principal', balance: 5000, color: '#6366f1' },
  { id: '2', name: 'Carteira', balance: 500, color: '#10b981' },
];

const DEFAULT_CATEGORIES = {
  income: ['Salário', 'Freelance', 'Dividendos', 'Outros'],
  expense: ['Alimentação', 'Moradia', 'Transporte', 'Saúde', 'Educação', 'Lazer', 'Outros'],
  investment: ['Renda Fixa', 'Ações', 'Fundos', 'Reserva de Emergência', 'Outros'],
};

const PAYMENT_METHODS = ['Pix', 'Cartão de Débito', 'Cartão de Crédito', 'Dinheiro', 'Transferência', 'Boleto'];

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const today = new Date();
const fmt = (d) => d.toISOString().split('T')[0];
const daysAgo = (n) => { const d = new Date(today); d.setDate(d.getDate() - n); return fmt(d); };

const SAMPLE_TRANSACTIONS = [
  { id: 's1', type: 'income',     description: 'Salário',           amount: 5500,  date: daysAgo(20), category: 'Salário',            accountId: '1', paymentMethod: 'Transferência' },
  { id: 's2', type: 'expense',    description: 'Supermercado',      amount: 420,   date: daysAgo(15), category: 'Alimentação',         accountId: '1', paymentMethod: 'Cartão de Débito' },
  { id: 's3', type: 'expense',    description: 'Aluguel',           amount: 1200,  date: daysAgo(14), category: 'Moradia',             accountId: '1', paymentMethod: 'Transferência' },
  { id: 's4', type: 'investment', description: 'Tesouro Direto',    amount: 500,   date: daysAgo(10), category: 'Renda Fixa',          accountId: '1', paymentMethod: 'Pix' },
  { id: 's5', type: 'expense',    description: 'Restaurante',       amount: 85,    date: daysAgo(8),  category: 'Alimentação',         accountId: '1', paymentMethod: 'Cartão de Crédito' },
  { id: 's6', type: 'expense',    description: 'Uber',              amount: 45,    date: daysAgo(6),  category: 'Transporte',          accountId: '1', paymentMethod: 'Pix' },
  { id: 's7', type: 'investment', description: 'Reserva de emergência', amount: 300, date: daysAgo(5), category: 'Reserva de Emergência', accountId: '1', paymentMethod: 'Transferência' },
  { id: 's8', type: 'income',     description: 'Freelance design',  amount: 800,   date: daysAgo(3),  category: 'Freelance',           accountId: '1', paymentMethod: 'Pix' },
  { id: 's9', type: 'expense',    description: 'Academia',          amount: 120,   date: daysAgo(2),  category: 'Saúde',               accountId: '1', paymentMethod: 'Cartão de Débito' },
  { id: 's10', type: 'expense',   description: 'Streaming',         amount: 55,    date: daysAgo(1),  category: 'Lazer',               accountId: '1', paymentMethod: 'Cartão de Crédito' },
];

const SAMPLE_BUDGETS = [
  { id: 'b1', category: 'Alimentação', limit: 800 },
  { id: 'b2', category: 'Moradia',     limit: 1500 },
  { id: 'b3', category: 'Transporte',  limit: 300 },
  { id: 'b4', category: 'Lazer',       limit: 200 },
  { id: 'b5', category: 'Saúde',       limit: 250 },
];

const SAMPLE_GOALS = [
  { id: 'g1', name: 'Reserva de Emergência', target: 18000, current: 2300,  category: 'Reserva de Emergência', color: '#10b981', deadline: '' },
  { id: 'g2', name: 'Viagem Europa',         target: 12000, current: 1500,  category: 'Viagem Europa',         color: '#6366f1', deadline: fmt(new Date(today.getFullYear() + 1, 5, 1)) },
  { id: 'g3', name: 'Novo Notebook',         target: 4000,  current: 3200,  category: 'Novo Notebook',         color: '#f59e0b', deadline: fmt(new Date(today.getFullYear(), today.getMonth() + 2, 1)) },
];

const getDefaultData = () => ({
  accounts: [
    { id: '1', name: 'Banco Principal', balance: 2375, color: '#6366f1' },
    { id: '2', name: 'Carteira',        balance: 500,  color: '#10b981' },
  ],
  transactions: SAMPLE_TRANSACTIONS,
  budgets: SAMPLE_BUDGETS,
  goals: SAMPLE_GOALS,
  categories: {
    ...DEFAULT_CATEGORIES,
    investment: [...DEFAULT_CATEGORIES.investment, 'Viagem Europa', 'Novo Notebook'],
  },
});

const loadFromStorage = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        ...getDefaultData(),
        ...parsed,
        categories: {
          ...DEFAULT_CATEGORIES,
          ...(parsed.categories || {}),
        },
      };
    }
  } catch (e) {
    console.error('Failed to load data:', e);
  }
  return getDefaultData();
};

export function AppProvider({ children }) {
  const [data, setData] = useState(() => loadFromStorage());
  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem('nosso_controle_theme');
    if (stored) return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const [activePage, setActivePage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Persist data on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  // Apply theme
  useEffect(() => {
    localStorage.setItem('nosso_controle_theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  // ── Computed values ──────────────────────────────────────────────────────────
  const totalBalance = data.accounts.reduce((sum, a) => sum + (a.balance || 0), 0);

  const totalInvested = data.goals.reduce((sum, g) => sum + (g.current || 0), 0);

  const currentMonth = getCurrentMonth();

  const currentMonthTransactions = data.transactions.filter(
    t => getTransactionMonth(t.date) === currentMonth
  );

  const monthlyIncome = currentMonthTransactions
    .filter(t => t.type === 'income')
    .reduce((s, t) => s + t.amount, 0);

  const monthlyExpenses = currentMonthTransactions
    .filter(t => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0);

  const monthlyInvestments = currentMonthTransactions
    .filter(t => t.type === 'investment')
    .reduce((s, t) => s + t.amount, 0);

  // ── Transactions ─────────────────────────────────────────────────────────────
  const addTransaction = useCallback((tx) => {
    const newTx = { ...tx, id: generateId() };
    setData(prev => {
      const accounts = prev.accounts.map(acc => {
        if (acc.id !== tx.accountId) return acc;
        let delta = 0;
        if (tx.type === 'income') delta = tx.amount;
        if (tx.type === 'expense') delta = -tx.amount;
        if (tx.type === 'investment') delta = -tx.amount;
        return { ...acc, balance: acc.balance + delta };
      });

      // Update goal progress if it's an investment
      let goals = prev.goals;
      if (tx.type === 'investment') {
        goals = prev.goals.map(g => {
          if (g.category === tx.category) {
            return { ...g, current: Math.min(g.target, (g.current || 0) + tx.amount) };
          }
          return g;
        });
      }

      return { ...prev, transactions: [newTx, ...prev.transactions], accounts, goals };
    });
  }, []);

  const deleteTransaction = useCallback((id) => {
    setData(prev => {
      const tx = prev.transactions.find(t => t.id === id);
      if (!tx) return prev;

      const accounts = prev.accounts.map(acc => {
        if (acc.id !== tx.accountId) return acc;
        let delta = 0;
        if (tx.type === 'income') delta = -tx.amount;
        if (tx.type === 'expense') delta = tx.amount;
        if (tx.type === 'investment') delta = tx.amount;
        return { ...acc, balance: acc.balance + delta };
      });

      // Reverse goal progress
      let goals = prev.goals;
      if (tx.type === 'investment') {
        goals = prev.goals.map(g => {
          if (g.category === tx.category) {
            return { ...g, current: Math.max(0, (g.current || 0) - tx.amount) };
          }
          return g;
        });
      }

      return {
        ...prev,
        transactions: prev.transactions.filter(t => t.id !== id),
        accounts,
        goals,
      };
    });
  }, []);

  // ── Accounts ──────────────────────────────────────────────────────────────────
  const addAccount = useCallback((account) => {
    setData(prev => ({
      ...prev,
      accounts: [...prev.accounts, { ...account, id: generateId() }],
    }));
  }, []);

  const deleteAccount = useCallback((id) => {
    setData(prev => ({
      ...prev,
      accounts: prev.accounts.filter(a => a.id !== id),
      transactions: prev.transactions.map(t =>
        t.accountId === id ? { ...t, accountId: null } : t
      ),
    }));
  }, []);

  // ── Budgets ───────────────────────────────────────────────────────────────────
  const addBudget = useCallback((budget) => {
    setData(prev => {
      const existing = prev.budgets.find(b => b.category === budget.category);
      if (existing) {
        return {
          ...prev,
          budgets: prev.budgets.map(b =>
            b.category === budget.category ? { ...b, limit: budget.limit } : b
          ),
        };
      }
      return { ...prev, budgets: [...prev.budgets, { ...budget, id: generateId() }] };
    });
  }, []);

  const deleteBudget = useCallback((id) => {
    setData(prev => {
      const budget = prev.budgets.find(b => b.id === id);
      return {
        ...prev,
        budgets: prev.budgets.filter(b => b.id !== id),
        // Disassociate transactions from the deleted budget category
        transactions: budget
          ? prev.transactions.map(t =>
              t.category === budget.category && t.type === 'expense'
                ? { ...t, category: 'Outros' }
                : t
            )
          : prev.transactions,
      };
    });
  }, []);

  const getBudgetSpent = useCallback((category) => {
    return data.transactions
      .filter(t => t.type === 'expense' && t.category === category &&
        getTransactionMonth(t.date) === currentMonth)
      .reduce((s, t) => s + t.amount, 0);
  }, [data.transactions, currentMonth]);

  // ── Goals ─────────────────────────────────────────────────────────────────────
  const addGoal = useCallback((goal) => {
    setData(prev => {
      let categories = prev.categories;
      // Auto-create investment category if needed
      if (!prev.categories.investment.includes(goal.category)) {
        categories = {
          ...prev.categories,
          investment: [...prev.categories.investment, goal.category],
        };
      }
      return {
        ...prev,
        goals: [...prev.goals, { ...goal, id: generateId(), current: goal.current || 0 }],
        categories,
      };
    });
  }, []);

  const updateGoal = useCallback((id, updates) => {
    setData(prev => ({
      ...prev,
      goals: prev.goals.map(g => g.id === id ? { ...g, ...updates } : g),
    }));
  }, []);

  const deleteGoal = useCallback((id) => {
    setData(prev => {
      const goal = prev.goals.find(g => g.id === id);
      return {
        ...prev,
        goals: prev.goals.filter(g => g.id !== id),
        // Disassociate transactions that referenced this goal's category
        transactions: goal
          ? prev.transactions.map(t =>
              t.category === goal.category && t.type === 'investment'
                ? { ...t, category: 'Outros' }
                : t
            )
          : prev.transactions,
      };
    });
  }, []);

  // ── Categories ────────────────────────────────────────────────────────────────
  const addCategory = useCallback((type, name) => {
    setData(prev => {
      if (prev.categories[type]?.includes(name)) return prev;
      return {
        ...prev,
        categories: {
          ...prev.categories,
          [type]: [...(prev.categories[type] || []), name],
        },
      };
    });
  }, []);

  const value = {
    // State
    data,
    theme,
    activePage,
    sidebarOpen,
    // Computed
    totalBalance,
    totalInvested,
    currentMonth,
    monthlyIncome,
    monthlyExpenses,
    monthlyInvestments,
    // Constants
    PAYMENT_METHODS,
    // Actions
    toggleTheme,
    setActivePage,
    setSidebarOpen,
    addTransaction,
    deleteTransaction,
    addAccount,
    deleteAccount,
    addBudget,
    deleteBudget,
    getBudgetSpent,
    addGoal,
    updateGoal,
    deleteGoal,
    addCategory,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
