import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getCurrentMonth, getTransactionMonth } from '../utils/formatters';
import { supabase } from '../lib/supabase';

const AppContext = createContext(null);

const DEFAULT_CATEGORIES = {
  income: ['Salário', 'Freelance', 'Dividendos', 'Outros'],
  expense: ['Alimentação', 'Moradia', 'Transporte', 'Saúde', 'Educação', 'Lazer', 'Outros'],
  investment: ['Renda Fixa', 'Ações', 'Fundos', 'Reserva de Emergência', 'Outros'],
};

const PAYMENT_METHODS = ['Pix', 'Cartão de Débito', 'Cartão de Crédito', 'Dinheiro', 'Transferência', 'Boleto'];

// ── Mappers Supabase → App ────────────────────────────────────────────────────
const mapAccount     = (r) => ({ id: r.id, name: r.name, balance: parseFloat(r.balance), color: r.color });
const mapTransaction = (r) => ({ id: r.id, type: r.type, description: r.description, amount: parseFloat(r.amount), date: r.date, category: r.category, accountId: r.account_id, paymentMethod: r.payment_method, notes: r.notes || '', isRecurring: r.is_recurring || false, recurrenceInterval: r.recurrence_interval || 'monthly', createdAt: r.created_at });
const mapBudget      = (r) => ({ id: r.id, category: r.category, limit: parseFloat(r.limit) });
const mapGoal        = (r) => ({ id: r.id, name: r.name, target: parseFloat(r.target), current: parseFloat(r.current), category: r.category, color: r.color, deadline: r.deadline || '' });

export function AppProvider({ user, children }) {
  const [data, setData] = useState({
    accounts: [], transactions: [], budgets: [], goals: [], categories: DEFAULT_CATEGORIES,
  });
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => getCurrentMonth());
  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem('nosso_controle_theme');
    if (stored) return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const [activePage, setActivePage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ── Load data from Supabase ───────────────────────────────────────────────
  const loadUserData = useCallback(async () => {
    setLoading(true);
    const uid = user.id;

    const [
      { data: accounts },
      { data: transactions },
      { data: budgets },
      { data: goals },
      { data: settings },
    ] = await Promise.all([
      supabase.from('accounts').select('*').eq('user_id', uid).order('created_at'),
      supabase.from('transactions').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
      supabase.from('budgets').select('*').eq('user_id', uid),
      supabase.from('goals').select('*').eq('user_id', uid),
      supabase.from('user_settings').select('*').eq('user_id', uid).maybeSingle(),
    ]);

    if (!accounts?.length) {
      const { data: newAccounts } = await supabase.from('accounts').insert([
        { user_id: uid, name: 'Banco Principal', balance: 0, color: '#6366f1' },
        { user_id: uid, name: 'Carteira',        balance: 0, color: '#10b981' },
      ]).select();
      await supabase.from('user_settings').upsert({ user_id: uid, categories: DEFAULT_CATEGORIES });
      setData({ accounts: (newAccounts || []).map(mapAccount), transactions: [], budgets: [], goals: [], categories: DEFAULT_CATEGORIES });
    } else {
      setData({
        accounts:     (accounts     || []).map(mapAccount),
        transactions: (transactions || []).map(mapTransaction),
        budgets:      (budgets      || []).map(mapBudget),
        goals:        (goals        || []).map(mapGoal),
        categories:   settings?.categories || DEFAULT_CATEGORIES,
      });
    }

    setLoading(false);
  }, [user.id]);

  useEffect(() => { loadUserData(); }, [loadUserData]);

  useEffect(() => {
    localStorage.setItem('nosso_controle_theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  // ── Computed ──────────────────────────────────────────────────────────────
  // totalBalance: all-time net (income − expense − investment) — independent of month filter
  const totalBalance = data.transactions.reduce(
    (s, t) => t.type === 'income' ? s + t.amount : s - t.amount, 0
  );
  // totalInvested: all-time sum of investment transactions
  const totalInvested = data.transactions
    .filter(t => t.type === 'investment')
    .reduce((s, t) => s + t.amount, 0);

  const currentMonth = getCurrentMonth();

  const selectedMonthTxs = data.transactions.filter(t => getTransactionMonth(t.date) === selectedMonth);
  const monthlyIncome      = selectedMonthTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const monthlyExpenses    = selectedMonthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const monthlyInvestments = selectedMonthTxs.filter(t => t.type === 'investment').reduce((s, t) => s + t.amount, 0);

  // ── Transactions ──────────────────────────────────────────────────────────
  const addTransaction = useCallback(async (tx) => {
    const insertPayload = {
      user_id: user.id, type: tx.type, description: tx.description, amount: tx.amount,
      date: tx.date, category: tx.category, account_id: tx.accountId,
      payment_method: tx.paymentMethod,
      notes: tx.notes || null,
      is_recurring: tx.isRecurring || false,
      recurrence_interval: tx.recurrenceInterval || 'monthly',
    };

    let { data: newTx, error } = await supabase.from('transactions').insert(insertPayload).select().single();
    if (error) {
      // Fallback: try without new columns in case migration hasn't been run
      const { notes, is_recurring, recurrence_interval, ...corePayload } = insertPayload;
      ({ data: newTx, error } = await supabase.from('transactions').insert(corePayload).select().single());
    }
    if (error) { console.error('addTransaction:', error); return; }

    const delta = tx.type === 'income' ? tx.amount : -tx.amount;
    let accountToUpdate = null;
    const goalToUpdates = [];

    setData(prev => {
      const account = prev.accounts.find(a => a.id === tx.accountId);
      const newBalance = (account?.balance || 0) + delta;
      if (account) accountToUpdate = { id: tx.accountId, balance: newBalance };

      const accounts = prev.accounts.map(a =>
        a.id === tx.accountId ? { ...a, balance: newBalance } : a
      );

      let goals = prev.goals;
      if (tx.type === 'investment') {
        goals = prev.goals.map(g => {
          if (g.category !== tx.category) return g;
          const newCurrent = Math.min(g.target, g.current + tx.amount);
          goalToUpdates.push({ id: g.id, current: newCurrent });
          return { ...g, current: newCurrent };
        });
      }

      return { ...prev, transactions: [mapTransaction(newTx), ...prev.transactions], accounts, goals };
    });

    if (accountToUpdate) {
      await supabase.from('accounts').update({ balance: accountToUpdate.balance }).eq('id', accountToUpdate.id);
    }
    for (const gu of goalToUpdates) {
      await supabase.from('goals').update({ current: gu.current }).eq('id', gu.id);
    }
  }, [user.id]);

  const updateTransaction = useCallback(async (id, updates) => {
    let accountToUpdate = null;
    const goalToUpdates = [];

    setData(prev => {
      const old = prev.transactions.find(t => t.id === id);
      if (!old) return prev;

      // Revert old effect on account balance
      const oldDelta = old.type === 'income' ? -old.amount : old.amount;
      // Apply new effect on account balance
      const newAmount = updates.amount ?? old.amount;
      const newType = updates.type ?? old.type;
      const newAccountId = updates.accountId ?? old.accountId;
      const newDelta = newType === 'income' ? newAmount : -newAmount;

      let accounts = prev.accounts;
      // If account changed, revert old account and apply to new account
      if (newAccountId !== old.accountId) {
        const oldAcc = prev.accounts.find(a => a.id === old.accountId);
        const newAcc = prev.accounts.find(a => a.id === newAccountId);
        const oldAccBalance = (oldAcc?.balance || 0) + oldDelta;
        const newAccBalance = (newAcc?.balance || 0) + newDelta;
        if (oldAcc) accountToUpdate = [{ id: old.accountId, balance: oldAccBalance }, { id: newAccountId, balance: newAccBalance }];
        accounts = prev.accounts.map(a => {
          if (a.id === old.accountId) return { ...a, balance: oldAccBalance };
          if (a.id === newAccountId) return { ...a, balance: newAccBalance };
          return a;
        });
      } else {
        const acc = prev.accounts.find(a => a.id === old.accountId);
        const newBalance = (acc?.balance || 0) + oldDelta + newDelta;
        if (acc) accountToUpdate = [{ id: old.accountId, balance: newBalance }];
        accounts = prev.accounts.map(a => a.id === old.accountId ? { ...a, balance: newBalance } : a);
      }

      // Handle goal updates for investment type changes
      let goals = prev.goals;
      const oldCategory = old.category;
      const newCategory = updates.category ?? old.category;
      if (old.type === 'investment') {
        goals = goals.map(g => {
          if (g.category !== oldCategory) return g;
          const reverted = Math.max(0, g.current - old.amount);
          goalToUpdates.push({ id: g.id, current: reverted });
          return { ...g, current: reverted };
        });
      }
      if (newType === 'investment') {
        goals = goals.map(g => {
          if (g.category !== newCategory) return g;
          const existing = goalToUpdates.find(x => x.id === g.id);
          const base = existing ? existing.current : g.current;
          const updated = Math.min(g.target, base + newAmount);
          if (existing) existing.current = updated; else goalToUpdates.push({ id: g.id, current: updated });
          return { ...g, current: updated };
        });
      }

      const dbUpdates = {
        type: newType,
        description: updates.description ?? old.description,
        amount: newAmount,
        date: updates.date ?? old.date,
        category: newCategory,
        account_id: newAccountId,
        payment_method: updates.paymentMethod ?? old.paymentMethod,
        notes: updates.notes ?? old.notes,
        is_recurring: updates.isRecurring ?? old.isRecurring,
        recurrence_interval: updates.recurrenceInterval ?? old.recurrenceInterval,
      };

      const updated = { ...old, ...updates, id };
      return { ...prev, transactions: prev.transactions.map(t => t.id === id ? updated : t), accounts, goals };
    });

    const dbUpdates = {
      type: updates.type,
      description: updates.description,
      amount: updates.amount,
      date: updates.date,
      category: updates.category,
      account_id: updates.accountId,
      payment_method: updates.paymentMethod,
      notes: updates.notes,
      is_recurring: updates.isRecurring,
      recurrence_interval: updates.recurrenceInterval,
    };
    // Remove undefined keys
    Object.keys(dbUpdates).forEach(k => dbUpdates[k] === undefined && delete dbUpdates[k]);

    let { error } = await supabase.from('transactions').update(dbUpdates).eq('id', id);
    if (error) {
      // Fallback: retry without new columns in case migration hasn't been run
      const { notes, is_recurring, recurrence_interval, ...fallback } = dbUpdates;
      ({ error } = await supabase.from('transactions').update(fallback).eq('id', id));
    }
    if (error) { console.error('updateTransaction:', error); loadUserData(); return; }
    if (accountToUpdate) {
      for (const acc of accountToUpdate) {
        await supabase.from('accounts').update({ balance: acc.balance }).eq('id', acc.id);
      }
    }
    for (const gu of goalToUpdates) {
      await supabase.from('goals').update({ current: gu.current }).eq('id', gu.id);
    }
  }, [loadUserData]);

  const deleteTransaction = useCallback(async (id) => {
    let accountToUpdate = null;
    const goalToUpdates = [];

    setData(prev => {
      const tx = prev.transactions.find(t => t.id === id);
      if (!tx) return prev;

      const delta = tx.type === 'income' ? -tx.amount : tx.amount;
      const account = prev.accounts.find(a => a.id === tx.accountId);
      const newBalance = (account?.balance || 0) + delta;
      if (account) accountToUpdate = { id: tx.accountId, balance: newBalance };

      const accounts = prev.accounts.map(a =>
        a.id === tx.accountId ? { ...a, balance: newBalance } : a
      );

      let goals = prev.goals;
      if (tx.type === 'investment') {
        goals = prev.goals.map(g => {
          if (g.category !== tx.category) return g;
          const newCurrent = Math.max(0, g.current - tx.amount);
          goalToUpdates.push({ id: g.id, current: newCurrent });
          return { ...g, current: newCurrent };
        });
      }

      return { ...prev, transactions: prev.transactions.filter(t => t.id !== id), accounts, goals };
    });

    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) {
      console.error('deleteTransaction:', error);
      loadUserData();
      return;
    }
    if (accountToUpdate) {
      await supabase.from('accounts').update({ balance: accountToUpdate.balance }).eq('id', accountToUpdate.id);
    }
    for (const gu of goalToUpdates) {
      await supabase.from('goals').update({ current: gu.current }).eq('id', gu.id);
    }
  }, [loadUserData]);

  // ── Accounts ──────────────────────────────────────────────────────────────
  const addAccount = useCallback(async (account) => {
    const { data: newAcc, error } = await supabase.from('accounts').insert({
      user_id: user.id, name: account.name, balance: account.balance || 0, color: account.color,
    }).select().single();
    if (error) { console.error('addAccount:', error); return; }
    setData(prev => ({ ...prev, accounts: [...prev.accounts, mapAccount(newAcc)] }));
  }, [user.id]);

  const deleteAccount = useCallback(async (id) => {
    const { error } = await supabase.from('accounts').delete().eq('id', id);
    if (error) { console.error('deleteAccount:', error); return; }
    setData(prev => ({
      ...prev,
      accounts: prev.accounts.filter(a => a.id !== id),
      transactions: prev.transactions.map(t => t.accountId === id ? { ...t, accountId: null } : t),
    }));
  }, []);

  const updateAccount = useCallback(async (id, updates) => {
    const dbUpdates = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.color !== undefined) dbUpdates.color = updates.color;
    const { error } = await supabase.from('accounts').update(dbUpdates).eq('id', id);
    if (error) { console.error('updateAccount:', error); return; }
    setData(prev => ({ ...prev, accounts: prev.accounts.map(a => a.id === id ? { ...a, ...updates } : a) }));
  }, []);

  // ── Budgets ───────────────────────────────────────────────────────────────
  const addBudget = useCallback(async (budget) => {
    const { data: newBudget, error } = await supabase.from('budgets').upsert(
      { user_id: user.id, category: budget.category, limit: budget.limit },
      { onConflict: 'user_id,category' }
    ).select().single();
    if (error) { console.error('addBudget:', error); return; }

    setData(prev => {
      const exists = prev.budgets.find(b => b.category === budget.category);
      return {
        ...prev,
        budgets: exists
          ? prev.budgets.map(b => b.category === budget.category ? mapBudget(newBudget) : b)
          : [...prev.budgets, mapBudget(newBudget)],
      };
    });
  }, [user.id]);

  const deleteBudget = useCallback(async (id) => {
    const { error } = await supabase.from('budgets').delete().eq('id', id);
    if (error) { console.error('deleteBudget:', error); return; }
    setData(prev => {
      const budget = prev.budgets.find(b => b.id === id);
      return {
        ...prev,
        budgets: prev.budgets.filter(b => b.id !== id),
        transactions: budget
          ? prev.transactions.map(t => t.category === budget.category && t.type === 'expense' ? { ...t, category: 'Outros' } : t)
          : prev.transactions,
      };
    });
  }, []);

  const getBudgetSpent = useCallback((category) =>
    data.transactions
      .filter(t => t.type === 'expense' && t.category === category && getTransactionMonth(t.date) === selectedMonth)
      .reduce((s, t) => s + t.amount, 0),
  [data.transactions, selectedMonth]);

  // ── Goals ─────────────────────────────────────────────────────────────────
  const addGoal = useCallback(async (goal) => {
    const { data: newGoal, error } = await supabase.from('goals').insert({
      user_id: user.id, name: goal.name, target: goal.target, current: goal.current || 0,
      category: goal.category, color: goal.color, deadline: goal.deadline || null,
    }).select().single();
    if (error) { console.error('addGoal:', error); return; }

    let updatedCategories = null;
    setData(prev => {
      const categories = { ...prev.categories };
      if (!categories.investment.includes(goal.category)) {
        categories.investment = [...categories.investment, goal.category];
        updatedCategories = categories;
      }
      return { ...prev, goals: [...prev.goals, mapGoal(newGoal)], categories };
    });

    if (updatedCategories) {
      await supabase.from('user_settings').upsert({ user_id: user.id, categories: updatedCategories });
    }
  }, [user.id]);

  const updateGoal = useCallback(async (id, updates) => {
    const { error } = await supabase.from('goals').update(updates).eq('id', id);
    if (error) { console.error('updateGoal:', error); return; }
    setData(prev => ({ ...prev, goals: prev.goals.map(g => g.id === id ? { ...g, ...updates } : g) }));
  }, []);

  const deleteGoal = useCallback(async (id) => {
    const { error } = await supabase.from('goals').delete().eq('id', id);
    if (error) { console.error('deleteGoal:', error); return; }
    setData(prev => {
      const goal = prev.goals.find(g => g.id === id);
      return {
        ...prev,
        goals: prev.goals.filter(g => g.id !== id),
        transactions: goal
          ? prev.transactions.map(t => t.category === goal.category && t.type === 'investment' ? { ...t, category: 'Outros' } : t)
          : prev.transactions,
      };
    });
  }, []);

  // ── Categories ────────────────────────────────────────────────────────────
  const addCategory = useCallback(async (type, name) => {
    let newCategories = null;
    setData(prev => {
      if (prev.categories[type]?.includes(name)) return prev;
      const categories = { ...prev.categories, [type]: [...(prev.categories[type] || []), name] };
      newCategories = categories;
      return { ...prev, categories };
    });
    if (newCategories) {
      await supabase.from('user_settings').upsert({ user_id: user.id, categories: newCategories });
    }
  }, [user.id]);

  const value = {
    data, loading, theme, activePage, sidebarOpen,
    totalBalance, totalInvested, currentMonth,
    selectedMonth, setSelectedMonth,
    monthlyIncome, monthlyExpenses, monthlyInvestments,
    PAYMENT_METHODS,
    toggleTheme, setActivePage, setSidebarOpen,
    addTransaction, updateTransaction, deleteTransaction,
    addAccount, updateAccount, deleteAccount,
    addBudget, deleteBudget, getBudgetSpent,
    addGoal, updateGoal, deleteGoal,
    addCategory,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
