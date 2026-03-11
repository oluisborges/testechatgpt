import { useState } from 'react';
import {
  AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { TrendingUp, TrendingDown, Wallet, BarChart3, Plus, ArrowRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  formatCurrency, formatDate, getLast6MonthsFrom, getMonthName, getTransactionMonth,
} from '../utils/formatters';
import TransactionModal from './TransactionModal';
import MonthFilter from './MonthFilter';

const EXPENSE_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

function SummaryCard({ title, value, icon: Icon, color }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-gray-700
                    hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</span>
        <div className={`w-10 h-10 rounded-2xl ${color} flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(value)}</p>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl
                    shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-700 dark:text-gray-200 mb-2">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: entry.color }} />
          {entry.name}: {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  );
};

const PieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl
                    shadow-lg p-3 text-sm">
      <p className="font-semibold" style={{ color: payload[0].fill }}>{payload[0].name}</p>
      <p className="text-gray-700 dark:text-gray-200">{formatCurrency(payload[0].value)}</p>
    </div>
  );
};

export default function Dashboard() {
  const {
    data, totalBalance, monthlyIncome, monthlyExpenses,
    monthlyInvestments, selectedMonth, setActivePage,
  } = useApp();

  const [txModalOpen, setTxModalOpen] = useState(false);
  const [pieView, setPieView] = useState('expense');

  // ── Area chart: 6 months ending at selectedMonth ──────────────────────────
  const last6 = getLast6MonthsFrom(selectedMonth);
  const chartData = last6.map(month => {
    const txs = data.transactions.filter(t => getTransactionMonth(t.date) === month);
    return {
      month: getMonthName(month),
      Receitas: txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
      Despesas: txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
      Investimentos: txs.filter(t => t.type === 'investment').reduce((s, t) => s + t.amount, 0),
    };
  });

  // ── Pie chart: selectedMonth ───────────────────────────────────────────────
  const pieData = (() => {
    const txs = data.transactions.filter(t =>
      t.type === pieView && getTransactionMonth(t.date) === selectedMonth
    );
    const groups = {};
    txs.forEach(t => {
      groups[t.category || 'Outros'] = (groups[t.category || 'Outros'] || 0) + t.amount;
    });
    return Object.entries(groups).map(([name, value]) => ({ name, value }));
  })();

  const recentTx = data.transactions
    .filter(t => getTransactionMonth(t.date) === selectedMonth)
    .slice(0, 5);

  const txTypeStyle = {
    income: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20',
    expense: 'text-red-500 bg-red-50 dark:bg-red-900/20',
    investment: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20',
  };
  const txSign = { income: '+', expense: '-', investment: '↓' };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Resumo financeiro mensal</p>
        </div>
        <div className="flex items-center gap-3">
          <MonthFilter />
          <button
            onClick={() => setTxModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700
                       text-white rounded-2xl font-medium transition-colors shadow-lg
                       shadow-violet-200 dark:shadow-violet-900/40 text-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Lançar</span>
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard title="Receitas" value={monthlyIncome} icon={TrendingUp} color="bg-emerald-500" />
        <SummaryCard title="Despesas" value={monthlyExpenses} icon={TrendingDown} color="bg-red-400" />
        <SummaryCard title="Investido" value={monthlyInvestments} icon={BarChart3} color="bg-violet-500" />
        <SummaryCard title="Saldo em Contas" value={totalBalance} icon={Wallet} color="bg-blue-500" />
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-5 gap-4">
        {/* Area chart */}
        <div className="lg:col-span-3 bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-sm
                        border border-gray-100 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Evolução dos Últimos 6 Meses</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradInvest" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" className="dark:stroke-gray-700" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                     tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} />
              <Area type="monotone" dataKey="Receitas" stroke="#10b981" strokeWidth={2.5}
                    fill="url(#gradIncome)" />
              <Area type="monotone" dataKey="Despesas" stroke="#ef4444" strokeWidth={2.5}
                    fill="url(#gradExpense)" />
              <Area type="monotone" dataKey="Investimentos" stroke="#6366f1" strokeWidth={2.5}
                    fill="url(#gradInvest)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-sm
                        border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Distribuição</h3>
            <div className="flex p-1 bg-gray-100 dark:bg-gray-700 rounded-xl gap-1">
              {['expense', 'investment'].map(v => (
                <button
                  key={v}
                  onClick={() => setPieView(v)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all
                              ${pieView === v
                                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                                : 'text-gray-500 dark:text-gray-400'}`}
                >
                  {v === 'expense' ? 'Gastos' : 'Investimentos'}
                </button>
              ))}
            </div>
          </div>

          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={190}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                     paddingAngle={3} dataKey="value">
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={EXPENSE_COLORS[i % EXPENSE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
                <Legend iconType="circle" iconSize={8} formatter={(val) =>
                  <span className="text-xs text-gray-600 dark:text-gray-300">{val}</span>
                } />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center">
              <p className="text-sm text-gray-400 dark:text-gray-500">Sem dados este mês</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent transactions */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">Lançamentos Recentes</h3>
          <button
            onClick={() => setActivePage('transactions')}
            className="flex items-center gap-1 text-sm text-violet-600 dark:text-violet-400
                       hover:text-violet-700 dark:hover:text-violet-300 font-medium transition-colors"
          >
            Ver todos <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {recentTx.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-gray-400 dark:text-gray-500 text-sm">Nenhum lançamento neste mês.</p>
            <button
              onClick={() => setTxModalOpen(true)}
              className="mt-3 text-sm text-violet-600 dark:text-violet-400 font-medium hover:underline"
            >
              Adicionar lançamento
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {recentTx.map(tx => {
              const account = data.accounts.find(a => a.id === tx.accountId);
              return (
                <div key={tx.id}
                  className="flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50
                             dark:hover:bg-gray-700/50 transition-colors group">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg
                                   font-bold shrink-0 ${txTypeStyle[tx.type]}`}>
                    {txSign[tx.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
                      {tx.description}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {tx.category || '—'} · {account?.name || 'Conta removida'} · {formatDate(tx.date)}
                    </p>
                  </div>
                  <span className={`text-sm font-semibold shrink-0 ${
                    tx.type === 'income' ? 'text-emerald-500' :
                    tx.type === 'expense' ? 'text-red-500' : 'text-violet-600 dark:text-violet-400'
                  }`}>
                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Goals progress preview */}
      {data.goals.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Progresso das Metas</h3>
            <button
              onClick={() => setActivePage('goals')}
              className="flex items-center gap-1 text-sm text-violet-600 dark:text-violet-400
                         hover:text-violet-700 font-medium"
            >
              Ver todas <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3">
            {data.goals.slice(0, 3).map(goal => {
              const pct = goal.target > 0 ? Math.min(100, (goal.current / goal.target) * 100) : 0;
              return (
                <div key={goal.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700 dark:text-gray-300">{goal.name}</span>
                    <span className="text-gray-500 dark:text-gray-400">{pct.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: goal.color || '#6366f1' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <TransactionModal isOpen={txModalOpen} onClose={() => setTxModalOpen(false)} />
    </div>
  );
}
