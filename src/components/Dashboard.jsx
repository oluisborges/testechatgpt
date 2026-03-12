import { useState, useEffect } from 'react';
import {
  AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown, Wallet, BarChart3, Plus, ArrowRight, ChevronLeft, Clock } from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  formatCurrency, formatDate, getLast6MonthsFrom, getMonthName, getTransactionMonth, getCurrentMonth,
} from '../utils/formatters';
import TransactionModal from './TransactionModal';
import MonthFilter from './MonthFilter';

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6', '#f97316', '#84cc16'];

// futureColor: 'danger' = always red | 'success' = always green | 'auto' = sign-based
function SummaryCard({ title, value, future, futureColor = 'auto', icon: Icon, color }) {
  const futureColorClass = future == null || future === 0 ? '' :
    futureColor === 'danger'  ? 'text-red-400' :
    futureColor === 'success' ? 'text-emerald-500' :
    future > 0 ? 'text-emerald-500' : 'text-red-400';

  const futureSign = futureColor === 'danger' ? '+' : future > 0 ? '+' : '';

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
      {future != null && future !== 0 && (
        <div className="flex items-center gap-1 mt-1.5">
          <Clock className="w-3 h-3 text-gray-400" />
          <span className="text-xs text-gray-400 dark:text-gray-500">
            Futuro: <span className={futureColorClass}>
              {futureSign}{formatCurrency(future)}
            </span>
          </span>
        </div>
      )}
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

// Percentage label rendered inside each pie slice
const renderSliceLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.06) return null;
  const RADIAN = Math.PI / 180;
  const r = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central"
          fontSize={10} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export default function Dashboard() {
  const {
    data, monthlyBalance, monthlyIncome, monthlyExpenses,
    monthlyInvestments, selectedMonth, setActivePage,
    futureMonthlyIncome, futureMonthlyExpenses, futureMonthlyInvestments, futureMonthlyBalance,
  } = useApp();
  const isCurrentMonth = selectedMonth === getCurrentMonth();

  const [txModalOpen, setTxModalOpen] = useState(false);
  const [pieView, setPieView] = useState('expense');
  const [drillCategory, setDrillCategory] = useState(null);

  // Reset drill-down when switching view or month
  useEffect(() => { setDrillCategory(null); }, [pieView, selectedMonth]);

  // ── Area chart ────────────────────────────────────────────────────────────
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

  // ── Pie chart data ────────────────────────────────────────────────────────
  const baseTxs = data.transactions.filter(t =>
    t.type === pieView && getTransactionMonth(t.date) === selectedMonth
  );

  const pieData = (() => {
    if (drillCategory) {
      // Drill-down: individual transactions in the selected category
      const catTxs = baseTxs.filter(t => (t.category || 'Outros') === drillCategory);
      const groups = {};
      catTxs.forEach(t => {
        groups[t.description] = (groups[t.description] || 0) + t.amount;
      });
      return Object.entries(groups)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
    }
    // Overview: group by category
    const groups = {};
    baseTxs.forEach(t => {
      groups[t.category || 'Outros'] = (groups[t.category || 'Outros'] || 0) + t.amount;
    });
    return Object.entries(groups)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  })();

  const totalPie = pieData.reduce((s, d) => s + d.value, 0);

  // ── Recent transactions ───────────────────────────────────────────────────
  const recentTx = data.transactions
    .filter(t => getTransactionMonth(t.date) === selectedMonth)
    .sort((a, b) => b.date.localeCompare(a.date))
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
        <SummaryCard title="Receitas"        value={monthlyIncome}      future={isCurrentMonth ? futureMonthlyIncome        : null} futureColor="success" icon={TrendingUp}   color="bg-emerald-500" />
        <SummaryCard title="Despesas"        value={monthlyExpenses}    future={isCurrentMonth ? futureMonthlyExpenses      : null} futureColor="danger"  icon={TrendingDown} color="bg-red-400" />
        <SummaryCard title="Investido"       value={monthlyInvestments} future={isCurrentMonth ? futureMonthlyInvestments   : null} futureColor="danger"  icon={BarChart3}    color="bg-violet-500" />
        <SummaryCard title="Saldo em Contas" value={monthlyBalance}     future={isCurrentMonth ? futureMonthlyBalance       : null} futureColor="auto"    icon={Wallet}       color="bg-blue-500" />
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
              <Area type="monotone" dataKey="Receitas"     stroke="#10b981" strokeWidth={2.5} fill="url(#gradIncome)" />
              <Area type="monotone" dataKey="Despesas"     stroke="#ef4444" strokeWidth={2.5} fill="url(#gradExpense)" />
              <Area type="monotone" dataKey="Investimentos" stroke="#6366f1" strokeWidth={2.5} fill="url(#gradInvest)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart — Distribution */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-sm
                        border border-gray-100 dark:border-gray-700 flex flex-col">

          {/* Card header */}
          <div className="flex items-center justify-between mb-3 shrink-0">
            <div className="flex items-center gap-2">
              {drillCategory && (
                <button
                  onClick={() => setDrillCategory(null)}
                  className="w-7 h-7 flex items-center justify-center rounded-xl
                             hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 text-gray-500" />
                </button>
              )}
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white leading-tight">
                  {drillCategory ?? 'Distribuição'}
                </h3>
                {drillCategory && (
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {pieView === 'expense' ? 'Gastos' : 'Investimentos'} · clique para voltar
                  </p>
                )}
              </div>
            </div>
            {!drillCategory && (
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
            )}
          </div>

          {pieData.length > 0 ? (
            <>
              {/* Donut with center label */}
              <div className="relative shrink-0">
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%" cy="50%"
                      innerRadius={45} outerRadius={72}
                      paddingAngle={2}
                      dataKey="value"
                      labelLine={false}
                      label={renderSliceLabel}
                      onClick={!drillCategory ? (entry) => setDrillCategory(entry.name) : undefined}
                      style={{ cursor: drillCategory ? 'default' : 'pointer' }}
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                {/* Center total */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <p className="text-xs text-gray-400 dark:text-gray-500 leading-tight">Total</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
                      {formatCurrency(totalPie)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Custom legend with value + percentage */}
              <div className="flex-1 overflow-y-auto mt-1 space-y-1 min-h-0">
                {pieData.map((entry, i) => {
                  const pct = totalPie > 0 ? (entry.value / totalPie) * 100 : 0;
                  return (
                    <div
                      key={entry.name}
                      onClick={!drillCategory ? () => setDrillCategory(entry.name) : undefined}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-xl transition-colors
                                  ${!drillCategory ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50' : ''}`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: COLORS[i % COLORS.length] }}
                      />
                      <span className="flex-1 text-xs text-gray-700 dark:text-gray-300 truncate">
                        {entry.name}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                        {formatCurrency(entry.value)}
                      </span>
                      <span
                        className="text-xs font-bold shrink-0 min-w-8 text-right"
                        style={{ color: COLORS[i % COLORS.length] }}
                      >
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
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
                             dark:hover:bg-gray-700/50 transition-colors">
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
