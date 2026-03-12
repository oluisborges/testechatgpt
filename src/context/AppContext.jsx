import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { getCurrentMonth, getTransactionMonth, formatCurrency } from '../utils/formatters';
import { supabase } from '../lib/supabase';
import { useToast } from './ToastContext';
import { insertTx, updateTxDb, deleteTxDb } from '../services/transactionService';
import { insertBillDb, updateBillDb, deleteBillDb, insertPayBillTx, markBillPaidDb } from '../services/billService';

const AppContext = createContext(null);

const DEFAULT_CATEGORIES = {
  income: ['Salário', 'Freelance', 'Dividendos', 'Outros'],
  expense: ['Alimentação', 'Moradia', 'Transporte', 'Saúde', 'Educação', 'Lazer', 'Outros'],
  investment: ['Renda Fixa', 'Ações', 'Fundos', 'Reserva de Emergência', 'Outros'],
};

const PAYMENT_METHODS = ['Pix', 'Cartão de Débito', 'Cartão de Crédito', 'Dinheiro', 'Transferência', 'Boleto'];

// ── Mappers Supabase → App ────────────────────────────────────────────────────
const mapAccount     = (r) => ({ id: r.id, name: r.name, balance: parseFloat(r.balance), color: r.color });
const mapTransaction = (r) => ({
  id: r.id, type: r.type, description: r.description, amount: parseFloat(r.amount),
  date: r.date, category: r.category, accountId: r.account_id, paymentMethod: r.payment_method,
  notes: r.notes || '', isRecurring: r.is_recurring || false,
  recurrenceInterval: r.recurrence_interval || 'monthly',
  fileUrl: r.file_url || null, fileName: r.file_name || null, createdAt: r.created_at,
});
const mapBudget = (r) => ({ id: r.id, category: r.category, limit: parseFloat(r.limit) });
const mapGoal   = (r) => ({ id: r.id, name: r.name, target: parseFloat(r.target), current: parseFloat(r.current), category: r.category, color: r.color, deadline: r.deadline || '' });
const mapBill   = (r) => ({
  id: r.id, name: r.name, description: r.description || '', amount: parseFloat(r.amount),
  dueDate: r.due_date, paymentMethod: r.payment_method || 'Pix', accountId: r.account_id,
  pixKey: r.pix_key || '', category: r.category || 'Outros', status: r.status || 'pending',
  paidAt: r.paid_at || null, fileUrl: r.file_url || null, fileName: r.file_name || null,
  createdAt: r.created_at,
});

// ── Pure helpers ──────────────────────────────────────────────────────────────

/** Returns +amount for income, -amount for expenses/investments (balance effect). */
function balanceEffect(type, amount) {
  return type === 'income' ? amount : -amount;
}

/** Computes updated accounts array and the list of DB updates needed. */
function computeAccountUpdates(accounts, oldAccountId, newAccountId, oldEffect, newEffect) {
  if (newAccountId !== oldAccountId) {
    const oldAcc = accounts.find(a => a.id === oldAccountId);
    const newAcc = accounts.find(a => a.id === newAccountId);
    const dbUpdates = [
      { id: oldAccountId, balance: (oldAcc?.balance ?? 0) - oldEffect },
      { id: newAccountId, balance: (newAcc?.balance ?? 0) + newEffect },
    ];
    return {
      accounts: accounts.map(a => {
        const u = dbUpdates.find(x => x.id === a.id);
        return u ? { ...a, balance: u.balance } : a;
      }),
      dbUpdates,
    };
  }
  const acc = accounts.find(a => a.id === oldAccountId);
  const newBalance = (acc?.balance ?? 0) - oldEffect + newEffect;
  return {
    accounts: accounts.map(a => a.id === oldAccountId ? { ...a, balance: newBalance } : a),
    dbUpdates: [{ id: oldAccountId, balance: newBalance }],
  };
}

/** Computes updated goals array and the list of DB updates needed for investment changes. */
function computeGoalUpdates(goals, oldType, oldCategory, oldAmount, newType, newCategory, newAmount) {
  let updated = goals;
  const dbUpdates = [];

  if (oldType === 'investment') {
    updated = updated.map(g => {
      if (g.category !== oldCategory) return g;
      const reverted = Math.max(0, g.current - oldAmount);
      dbUpdates.push({ id: g.id, current: reverted });
      return { ...g, current: reverted };
    });
  }
  if (newType === 'investment') {
    updated = updated.map(g => {
      if (g.category !== newCategory) return g;
      const existing = dbUpdates.find(x => x.id === g.id);
      const base     = existing ? existing.current : g.current;
      const next     = Math.min(g.target, base + newAmount);
      if (existing) existing.current = next;
      else dbUpdates.push({ id: g.id, current: next });
      return { ...g, current: next };
    });
  }

  return { goals: updated, dbUpdates };
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function AppProvider({ user, children }) {
  const { showToast } = useToast();

  const [data, setData] = useState({
    accounts: [], transactions: [], budgets: [], goals: [], bills: [], categories: DEFAULT_CATEGORIES,
  });
  const [loading, setLoading]               = useState(true);
  const [billsTableExists, setBillsTableExists] = useState(true);
  const [selectedMonth, setSelectedMonth]   = useState(() => getCurrentMonth());
  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem('nosso_controle_theme');
    if (stored) return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const [activePage, setActivePage]   = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ── Load data ─────────────────────────────────────────────────────────────
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

  // ── Computed values (memoized) ────────────────────────────────────────────
  const totalBalance = useMemo(
    () => data.accounts.reduce((s, a) => s + a.balance, 0),
    [data.accounts],
  );

  const totalInvested = useMemo(
    () => data.transactions.filter(t => t.type === 'investment').reduce((s, t) => s + t.amount, 0),
    [data.transactions],
  );

  const currentMonth = getCurrentMonth();

  const selectedMonthTxs = useMemo(
    () => data.transactions.filter(t => getTransactionMonth(t.date) === selectedMonth),
    [data.transactions, selectedMonth],
  );

  const monthlyIncome = useMemo(
    () => selectedMonthTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
    [selectedMonthTxs],
  );

  const monthlyExpenses = useMemo(
    () => selectedMonthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    [selectedMonthTxs],
  );

  const monthlyInvestments = useMemo(
    () => selectedMonthTxs.filter(t => t.type === 'investment').reduce((s, t) => s + t.amount, 0),
    [selectedMonthTxs],
  );

  // ── Budget alert helper ───────────────────────────────────────────────────
  const checkBudgetAlert = useCallback((txType, txCategory, txAmount, txDate, existingTransactions, budgets) => {
    if (txType !== 'expense') return;
    const budget = budgets.find(b => b.category === txCategory);
    if (!budget) return;
    const txMonth = getTransactionMonth(txDate);
    const currentSpent = existingTransactions
      .filter(t => t.type === 'expense' && t.category === txCategory && getTransactionMonth(t.date) === txMonth)
      .reduce((s, t) => s + t.amount, 0);
    const totalSpent = currentSpent + txAmount;
    const pct = budget.limit > 0 ? (totalSpent / budget.limit) * 100 : 0;
    if (pct >= 100) {
      showToast(`Orçamento de "${txCategory}" excedido! ${formatCurrency(totalSpent)} de ${formatCurrency(budget.limit)}`, 'warning');
    } else if (pct >= 80) {
      showToast(`Atenção: orçamento de "${txCategory}" em ${pct.toFixed(0)}%`, 'warning');
    }
  }, [showToast]);

  // ── File upload ───────────────────────────────────────────────────────────
  const uploadAttachment = useCallback(async (file, folder) => {
    if (!file) return { url: null, name: null };
    try {
      const ext  = file.name.split('.').pop();
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
    const payload = {
      user_id: user.id, type: tx.type, description: tx.description,
      amount: tx.amount, date: tx.date, category: tx.category,
      account_id: tx.accountId, payment_method: tx.paymentMethod,
      notes: tx.notes || null, file_url: fileUrl, file_name: fileName,
    };

    const { data: newTx, error } = await insertTx(payload);
    if (error) { showToast('Erro ao salvar transação. Tente novamente.'); return; }

    const effect = balanceEffect(tx.type, tx.amount);

    setData(prev => {
      const account    = prev.accounts.find(a => a.id === tx.accountId);
      const newBalance = (account?.balance ?? 0) + effect;
      const accounts   = prev.accounts.map(a => a.id === tx.accountId ? { ...a, balance: newBalance } : a);

      let goals = prev.goals;
      const goalDbUpdates = [];
      if (tx.type === 'investment') {
        goals = prev.goals.map(g => {
          if (g.category !== tx.category) return g;
          const newCurrent = Math.min(g.target, g.current + tx.amount);
          goalDbUpdates.push({ id: g.id, current: newCurrent });
          return { ...g, current: newCurrent };
        });
      }

      // Persist account + goal changes to DB (async, best-effort)
      if (account) {
        supabase.from('accounts').update({ balance: newBalance }).eq('id', tx.accountId);
      }
      for (const gu of goalDbUpdates) {
        supabase.from('goals').update({ current: gu.current }).eq('id', gu.id);
      }

      return { ...prev, transactions: [mapTransaction(newTx), ...prev.transactions], accounts, goals };
    });

    // Budget alert (uses pre-setData transactions — correct snapshot at call time)
    checkBudgetAlert(tx.type, tx.category, tx.amount, tx.date, data.transactions, data.budgets);

    showToast('Transação salva com sucesso!', 'success');
  }, [user.id, uploadAttachment, checkBudgetAlert, showToast, data.transactions, data.budgets]);

  const updateTransaction = useCallback(async (id, updates, file = null) => {
    const { url: fileUrl, name: fileName } = await uploadAttachment(file, 'transactions');

    // ── 1. Find current transaction ───────────────────────────────────────
    const old = data.transactions.find(t => t.id === id);
    if (!old) return;

    const newType      = updates.type      ?? old.type;
    const newAmount    = updates.amount    ?? old.amount;
    const newAccountId = updates.accountId ?? old.accountId;
    const newCategory  = updates.category  ?? old.category;

    // ── 2. Compute account balance changes ────────────────────────────────
    const oldEffect = balanceEffect(old.type, old.amount);
    const newEffect = balanceEffect(newType,  newAmount);
    const { accounts, dbUpdates: accDbUpdates } = computeAccountUpdates(
      data.accounts, old.accountId, newAccountId, oldEffect, newEffect,
    );

    // ── 3. Compute goal changes ───────────────────────────────────────────
    const { goals, dbUpdates: goalDbUpdates } = computeGoalUpdates(
      data.goals, old.type, old.category, old.amount, newType, newCategory, newAmount,
    );

    // ── 4. Apply local state update ───────────────────────────────────────
    const updatedTx = { ...old, ...updates, id, ...(file ? { fileUrl, fileName } : {}) };
    setData(prev => ({
      ...prev,
      transactions: prev.transactions.map(t => t.id === id ? updatedTx : t),
      accounts,
      goals,
    }));

    // ── 5. Persist to Supabase ────────────────────────────────────────────
    const dbPayload = Object.fromEntries(
      Object.entries({
        type:           updates.type,
        description:    updates.description,
        amount:         updates.amount,
        date:           updates.date,
        category:       updates.category,
        account_id:     updates.accountId,
        payment_method: updates.paymentMethod,
        notes:          updates.notes,
        ...(file ? { file_url: fileUrl, file_name: fileName } : {}),
      }).filter(([, v]) => v !== undefined),
    );

    const { error } = await updateTxDb(id, dbPayload);
    if (error) { showToast('Erro ao atualizar transação. Dados recarregados.'); loadUserData(); return; }

    for (const acc of accDbUpdates) {
      await supabase.from('accounts').update({ balance: acc.balance }).eq('id', acc.id);
    }
    for (const gu of goalDbUpdates) {
      await supabase.from('goals').update({ current: gu.current }).eq('id', gu.id);
    }

    showToast('Transação atualizada!', 'success');
  }, [data.transactions, data.accounts, data.goals, loadUserData, uploadAttachment, showToast]);

  const deleteTransaction = useCallback(async (id) => {
    const tx = data.transactions.find(t => t.id === id);
    if (!tx) return;

    const effect = -balanceEffect(tx.type, tx.amount); // reverse
    const account = data.accounts.find(a => a.id === tx.accountId);
    const newBalance = (account?.balance ?? 0) + effect;

    const { goals, dbUpdates: goalDbUpdates } = computeGoalUpdates(
      data.goals, tx.type, tx.category, tx.amount, 'none', '', 0,
    );

    setData(prev => ({
      ...prev,
      transactions: prev.transactions.filter(t => t.id !== id),
      accounts: prev.accounts.map(a => a.id === tx.accountId ? { ...a, balance: newBalance } : a),
      goals,
    }));

    const { error } = await deleteTxDb(id);
    if (error) { showToast('Erro ao excluir transação. Dados recarregados.'); loadUserData(); return; }

    if (account) {
      await supabase.from('accounts').update({ balance: newBalance }).eq('id', tx.accountId);
    }
    for (const gu of goalDbUpdates) {
      await supabase.from('goals').update({ current: gu.current }).eq('id', gu.id);
    }
  }, [data.transactions, data.accounts, data.goals, loadUserData, showToast]);

  // ── Accounts ──────────────────────────────────────────────────────────────
  const addAccount = useCallback(async (account) => {
    const { data: newAcc, error } = await supabase.from('accounts').insert({
      user_id: user.id, name: account.name, balance: account.balance || 0, color: account.color,
    }).select().single();
    if (error) { showToast('Erro ao criar conta bancária.'); return; }
    setData(prev => ({ ...prev, accounts: [...prev.accounts, mapAccount(newAcc)] }));
  }, [user.id, showToast]);

  const deleteAccount = useCallback(async (id) => {
    const { error } = await supabase.from('accounts').delete().eq('id', id);
    if (error) { showToast('Erro ao excluir conta bancária.'); return; }
    setData(prev => ({
      ...prev,
      accounts:     prev.accounts.filter(a => a.id !== id),
      transactions: prev.transactions.map(t => t.accountId === id ? { ...t, accountId: null } : t),
    }));
  }, [showToast]);

  const updateAccount = useCallback(async (id, updates) => {
    const dbUpdates = {};
    if (updates.name  !== undefined) dbUpdates.name  = updates.name;
    if (updates.color !== undefined) dbUpdates.color = updates.color;
    const { error } = await supabase.from('accounts').update(dbUpdates).eq('id', id);
    if (error) { showToast('Erro ao atualizar conta bancária.'); return; }
    setData(prev => ({ ...prev, accounts: prev.accounts.map(a => a.id === id ? { ...a, ...updates } : a) }));
  }, [showToast]);

  // ── Budgets ───────────────────────────────────────────────────────────────
  const addBudget = useCallback(async (budget) => {
    const { data: newBudget, error } = await supabase.from('budgets').upsert(
      { user_id: user.id, category: budget.category, limit: budget.limit },
      { onConflict: 'user_id,category' },
    ).select().single();
    if (error) { showToast('Erro ao salvar orçamento.'); return; }

    let updatedCategories = null;
    setData(prev => {
      const exists     = prev.budgets.find(b => b.category === budget.category);
      const categories = { ...prev.categories };
      if (!categories.expense.includes(budget.category)) {
        categories.expense = [...categories.expense, budget.category];
        updatedCategories  = categories;
      }
      return {
        ...prev,
        budgets: exists
          ? prev.budgets.map(b => b.category === budget.category ? mapBudget(newBudget) : b)
          : [...prev.budgets, mapBudget(newBudget)],
        categories,
      };
    });
    if (updatedCategories) {
      await supabase.from('user_settings').upsert({ user_id: user.id, categories: updatedCategories });
    }
  }, [user.id, showToast]);

  const deleteBudget = useCallback(async (id) => {
    const { error } = await supabase.from('budgets').delete().eq('id', id);
    if (error) { showToast('Erro ao excluir orçamento.'); return; }
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
  }, [showToast]);

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
    if (error) { showToast('Erro ao criar meta.'); return; }

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
  }, [user.id, showToast]);

  const updateGoal = useCallback(async (id, updates) => {
    const { error } = await supabase.from('goals').update(updates).eq('id', id);
    if (error) { showToast('Erro ao atualizar meta.'); return; }
    setData(prev => ({ ...prev, goals: prev.goals.map(g => g.id === id ? { ...g, ...updates } : g) }));
  }, [showToast]);

  const deleteGoal = useCallback(async (id) => {
    const { error } = await supabase.from('goals').delete().eq('id', id);
    if (error) { showToast('Erro ao excluir meta.'); return; }
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
  }, [showToast]);

  // ── Bills ─────────────────────────────────────────────────────────────────
  const addBill = useCallback(async (bill, file) => {
    const { url: fileUrl, name: fileName } = await uploadAttachment(file, 'bills');
    const { data: newBill, error } = await insertBillDb({
      user_id:        user.id,
      name:           bill.name,
      amount:         bill.amount,
      due_date:       bill.dueDate,
      payment_method: bill.paymentMethod,
      account_id:     bill.accountId || null,
      pix_key:        bill.pixKey || null,
      category:       bill.category,
      status:         'pending',
      file_url:       fileUrl,
      file_name:      fileName,
    });
    if (error) { showToast('Erro ao salvar conta a pagar. Verifique se a migration foi executada.'); return false; }
    setData(prev => ({
      ...prev,
      bills: [...prev.bills, mapBill(newBill)].sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    }));
    return true;
  }, [user.id, uploadAttachment, showToast]);

  const updateBill = useCallback(async (id, bill, file) => {
    let fileUrl, fileName;
    if (file) ({ url: fileUrl, name: fileName } = await uploadAttachment(file, 'bills'));

    const dbUpdates = {
      name:           bill.name,
      amount:         bill.amount,
      due_date:       bill.dueDate,
      payment_method: bill.paymentMethod,
      account_id:     bill.accountId || null,
      pix_key:        bill.pixKey || null,
      category:       bill.category,
      ...(file ? { file_url: fileUrl, file_name: fileName } : {}),
    };

    const { error } = await updateBillDb(id, dbUpdates);
    if (error) { showToast('Erro ao atualizar conta a pagar.'); return; }
    setData(prev => ({
      ...prev,
      bills: prev.bills.map(b => b.id === id ? { ...b, ...bill, ...(file ? { fileUrl, fileName } : {}) } : b),
    }));
  }, [uploadAttachment, showToast]);

  const deleteBill = useCallback(async (id) => {
    const { error } = await deleteBillDb(id);
    if (error) { showToast('Erro ao excluir conta a pagar.'); return; }
    setData(prev => ({ ...prev, bills: prev.bills.filter(b => b.id !== id) }));
  }, [showToast]);

  const payBill = useCallback(async (id) => {
    const bill = data.bills.find(b => b.id === id);
    if (!bill) return;

    const today = new Date().toISOString().split('T')[0];
    const txPayload = {
      user_id:        user.id,
      type:           'expense',
      description:    bill.name,
      amount:         bill.amount,
      date:           today,
      category:       bill.category,
      account_id:     bill.accountId || null,
      payment_method: bill.paymentMethod,
      notes:          bill.description || null,
      file_url:       bill.fileUrl || null,
      file_name:      bill.fileName || null,
    };

    const { data: newTx, error: txError } = await insertPayBillTx(txPayload);
    if (txError) { showToast('Erro ao registrar pagamento.'); return; }

    const { error: billError } = await markBillPaidDb(id);
    if (billError) { showToast('Erro ao marcar conta como paga.'); return; }

    const account    = data.accounts.find(a => a.id === bill.accountId);
    const newBalance = (account?.balance ?? 0) - bill.amount;

    setData(prev => ({
      ...prev,
      bills:        prev.bills.map(b => b.id === id ? { ...b, status: 'paid', paidAt: new Date().toISOString() } : b),
      transactions: [mapTransaction(newTx), ...prev.transactions],
      accounts:     prev.accounts.map(a => a.id === bill.accountId ? { ...a, balance: newBalance } : a),
    }));

    if (account) {
      await supabase.from('accounts').update({ balance: newBalance }).eq('id', bill.accountId);
    }

    showToast(`Pagamento de "${bill.name}" registrado!`, 'success');
  }, [data.bills, data.accounts, user.id, showToast]);

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

  // ─────────────────────────────────────────────────────────────────────────
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
