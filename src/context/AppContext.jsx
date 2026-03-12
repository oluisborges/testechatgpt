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
const mapTransaction = (r) => ({ id: r.id, type: r.type, description: r.description, amount: parseFloat(r.amount), date: r.date, category: r.category, accountId: r.account_id, paymentMethod: r.payment_method, notes: r.notes || '', isRecurring: r.is_recurring || false, recurrenceInterval: r.recurrence_interval || 'monthly', fileUrl: r.file_url || null, fileName: r.file_name || null, createdAt: r.created_at });
const mapBudget      = (r) => ({ id: r.id, category: r.category, limit: parseFloat(r.limit) });
const mapGoal        = (r) => ({ id: r.id, name: r.name, target: parseFloat(r.target), current: parseFloat(r.current), category: r.category, color: r.color, deadline: r.deadline || '' });
const mapBill        = (r) => ({ id: r.id, name: r.name, description: r.description || '', amount: parseFloat(r.amount), dueDate: r.due_date, paymentMethod: r.payment_method || 'Pix', accountId: r.account_id, pixKey: r.pix_key || '', category: r.category || 'Outros', status: r.status || 'pending', paidAt: r.paid_at || null, fileUrl: r.file_url || null, fileName: r.file_name || null, createdAt: r.created_at });

export function AppProvider({ user, children }) {
  const [data, setData] = useState({
    accounts: [], transactions: [], budgets: [], goals: [], bills: [], categories: DEFAULT_CATEGORIES,
  });
  const [loading, setLoading] = useState(true);
  const [billsTableExists, setBillsTableExists] = useState(true);
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
      { data: bills, error: billsError },
    ] = await Promise.all([
      supabase.from('accounts').select('*').eq('user_id', uid).order('created_at'),
      supabase.from('transactions').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
      supabase.from('budgets').select('*').eq('user_id', uid),
      supabase.from('goals').select('*').eq('user_id', uid),
      supabase.from('user_settings').select('*').eq('user_id', uid).maybeSingle(),
      supabase.from('bills').select('*').eq('user_id', uid).order('due_date'),
    ]);

    if (billsError?.code === '42P01') setBillsTableExists(false);
    else setBillsTableExists(true);

    if (!accounts?.length) {
      const { data: newAccounts } = await supabase.from('accounts').insert([
        { user_id: uid, name: 'Banco Principal', balance: 0, color: '#6366f1' },
        { user_id: uid, name: 'Carteira',        balance: 0, color: '#10b981' },
      ]).select();
      await supabase.from('user_settings').upsert({ user_id: uid, categories: DEFAULT_CATEGORIES });
      setData({ accounts: (newAccounts || []).map(mapAccount), transactions: [], budgets: [], goals: [], bills: [], categories: DEFAULT_CATEGORIES });
    } else {
      setData({
        accounts:     (accounts     || []).map(mapAccount),
        transactions: (transactions || []).map(mapTransaction),
        budgets:      (budgets      || []).map(mapBudget),
        goals:        (goals        || []).map(mapGoal),
        bills:        (bills        || []).map(mapBill),
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
  // totalBalance: sum of actual account balances (source of truth)
  const totalBalance = data.accounts.reduce((s, a) => s + a.balance, 0);
  // totalInvested: all-time sum of investment transactions
  const totalInvested = data.transactions
    .filter(t => t.type === 'investment')
    .reduce((s, t) => s + t.amount, 0);

  const currentMonth = getCurrentMonth();

  const selectedMonthTxs = data.transactions.filter(t => getTransactionMonth(t.date) === selectedMonth);
  const monthlyIncome      = selectedMonthTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const monthlyExpenses    = selectedMonthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const monthlyInvestments = selectedMonthTxs.filter(t => t.type === 'investment').reduce((s, t) => s + t.amount, 0);

  // ── Shared file upload ────────────────────────────────────────────────────
  const uploadAttachment = useCallback(async (file, folder) => {
    if (!file) return { url: null, name: null };
    try {
      const ext = file.name.split('.').pop();
      const path = `${folder}/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('attachments').upload(path, file, { upsert: false });
      if (error) return { url: null, name: file.name };
      const { data: { publicUrl } } = supabase.storage.from('attachments').getPublicUrl(path);
      return { url: publicUrl, name: file.name };
    } catch {
      return { url: null, name: file.name };
    }
  }, [user.id]);

  // ── Transactions ──────────────────────────────────────────────────────────
  const addTransaction = useCallback(async (tx, file = null) => {
    const { url: fileUrl, name: fileName } = await uploadAttachment(file, 'transactions');
    const insertPayload = {
      user_id: user.id, type: tx.type, description: tx.description, amount: tx.amount,
      date: tx.date, category: tx.category, account_id: tx.accountId,
      payment_method: tx.paymentMethod,
      notes: tx.notes || null,
      is_recurring: tx.isRecurring || false,
      recurrence_interval: tx.recurrenceInterval || 'monthly',
      file_url: fileUrl,
      file_name: fileName,
    };

    let { data: newTx, error } = await supabase.from('transactions').insert(insertPayload).select().single();
    if (error) {
      // Fallback: try without new columns in case migration hasn't been run
      const { notes, is_recurring, recurrence_interval, file_url, file_name, ...corePayload } = insertPayload;
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

  const updateTransaction = useCallback(async (id, updates, file = null) => {
    const { url: fileUrl, name: fileName } = await uploadAttachment(file, 'transactions');
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

      const updated = { ...old, ...updates, id, ...(file ? { fileUrl, fileName } : {}) };
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
      ...(file ? { file_url: fileUrl, file_name: fileName } : {}),
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
  }, [loadUserData, uploadAttachment]);

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

  // ── Bills ─────────────────────────────────────────────────────────────────
  const addBill = useCallback(async (bill, file) => {
    const { url: fileUrl, name: fileName } = await uploadAttachment(file, 'bills');
    const { data: newBill, error } = await supabase.from('bills').insert({
      user_id: user.id,
      name: bill.name,
      description: bill.description || null,
      amount: bill.amount,
      due_date: bill.dueDate,
      payment_method: bill.paymentMethod,
      account_id: bill.accountId || null,
      pix_key: bill.pixKey || null,
      category: bill.category,
      status: 'pending',
      file_url: fileUrl,
      file_name: fileName,
    }).select().single();
    if (error) { console.error('addBill:', error); return false; }
    setData(prev => ({ ...prev, bills: [...prev.bills, mapBill(newBill)].sort((a, b) => a.dueDate.localeCompare(b.dueDate)) }));
    return true;
  }, [user.id, uploadAttachment]);

  const updateBill = useCallback(async (id, bill, file) => {
    let fileUrl, fileName;
    if (file) {
      ({ url: fileUrl, name: fileName } = await uploadAttachment(file, 'bills'));
    }
    const dbUpdates = {
      name: bill.name,
      description: bill.description || null,
      amount: bill.amount,
      due_date: bill.dueDate,
      payment_method: bill.paymentMethod,
      account_id: bill.accountId || null,
      pix_key: bill.pixKey || null,
      category: bill.category,
    };
    if (file) { dbUpdates.file_url = fileUrl; dbUpdates.file_name = fileName; }
    const { error } = await supabase.from('bills').update(dbUpdates).eq('id', id);
    if (error) { console.error('updateBill:', error); return; }
    setData(prev => ({
      ...prev,
      bills: prev.bills.map(b => b.id === id ? { ...b, ...bill, ...(file ? { fileUrl, fileName } : {}) } : b),
    }));
  }, [uploadAttachment]);

  const deleteBill = useCallback(async (id) => {
    const { error } = await supabase.from('bills').delete().eq('id', id);
    if (error) { console.error('deleteBill:', error); return; }
    setData(prev => ({ ...prev, bills: prev.bills.filter(b => b.id !== id) }));
  }, []);

  const payBill = useCallback(async (id) => {
    let accountToUpdate = null;
    const bill = data.bills.find(b => b.id === id);
    if (!bill) return;

    const today = new Date().toISOString().split('T')[0];

    // Insert transaction (carry over file attachment from bill)
    const insertPayload = {
      user_id: user.id,
      type: 'expense',
      description: bill.name,
      amount: bill.amount,
      date: today,
      category: bill.category,
      account_id: bill.accountId || null,
      payment_method: bill.paymentMethod,
      notes: bill.description || null,
      file_url: bill.fileUrl || null,
      file_name: bill.fileName || null,
    };
    let { data: newTx, error: txError } = await supabase.from('transactions').insert(insertPayload).select().single();
    if (txError) {
      const { notes, file_url, file_name, ...corePay } = insertPayload;
      ({ data: newTx, error: txError } = await supabase.from('transactions').insert(corePay).select().single());
    }
    if (txError) { console.error('payBill - transaction:', txError); return; }

    // Mark bill as paid
    const { error: billError } = await supabase.from('bills')
      .update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', id);
    if (billError) { console.error('payBill - bill update:', billError); return; }

    setData(prev => {
      const account = prev.accounts.find(a => a.id === bill.accountId);
      const newBalance = (account?.balance || 0) - bill.amount;
      if (account) accountToUpdate = { id: bill.accountId, balance: newBalance };
      return {
        ...prev,
        bills: prev.bills.map(b => b.id === id ? { ...b, status: 'paid', paidAt: new Date().toISOString() } : b),
        transactions: [mapTransaction(newTx), ...prev.transactions],
        accounts: prev.accounts.map(a => a.id === bill.accountId ? { ...a, balance: newBalance } : a),
      };
    });

    if (accountToUpdate) {
      await supabase.from('accounts').update({ balance: accountToUpdate.balance }).eq('id', accountToUpdate.id);
    }
  }, [data.bills, user.id]);

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
    addBill, updateBill, deleteBill, payBill,
    billsTableExists,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
