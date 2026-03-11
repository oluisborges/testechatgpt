import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { TrendingUp, TrendingDown, BarChart3, Wallet, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency, getTransactionMonth } from '../utils/formatters';

const MONTHS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-700 dark:text-gray-200 mb-2">{label}</p>
      {payload.map(entry => (
        <p key={entry.name} style={{ color: entry.color }} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: entry.color }} />
          {entry.name}: {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  );
};

function StatCard({ title, value, icon: Icon, color, sub }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</span>
        <div className={`w-10 h-10 rounded-2xl ${color} flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(value)}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

export default function AnnualSummary() {
  const { data } = useApp();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);

  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const month = `${year}-${String(i + 1).padStart(2, '0')}`;
    const txs = data.transactions.filter(t => getTransactionMonth(t.date) === month);
    const income = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const investment = txs.filter(t => t.type === 'investment').reduce((s, t) => s + t.amount, 0);
    return { month: MONTHS_PT[i], income, expense, investment, balance: income - expense - investment };
  });

  const totals = monthlyData.reduce(
    (acc, m) => ({
      income: acc.income + m.income,
      expense: acc.expense + m.expense,
      investment: acc.investment + m.investment,
      balance: acc.balance + m.balance,
    }),
    { income: 0, expense: 0, investment: 0, balance: 0 }
  );

  const avgIncome = totals.income / 12;
  const avgExpense = totals.expense / 12;

  // Best/worst months
  const incomeMonths = [...monthlyData].sort((a, b) => b.income - a.income);
  const expenseMonths = [...monthlyData].sort((a, b) => b.expense - a.expense);

  const chartData = monthlyData.map(m => ({
    month: m.month,
    Receitas: m.income,
    Despesas: m.expense,
    Investimentos: m.investment,
  }));

  const balanceData = monthlyData.map(m => ({
    month: m.month,
    Saldo: m.balance,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Resumo Anual</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Visão consolidada do ano</p>
        </div>
        {/* Year selector */}
        <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-3 py-2">
          <button
            onClick={() => setYear(y => y - 1)}
            className="w-7 h-7 rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-gray-500" />
          </button>
          <span className="text-sm font-semibold text-gray-900 dark:text-white w-12 text-center">{year}</span>
          <button
            onClick={() => setYear(y => y + 1)}
            disabled={year >= currentYear}
            className="w-7 h-7 rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Annual totals */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Receitas" value={totals.income} icon={TrendingUp} color="bg-emerald-500"
          sub={`Média: ${formatCurrency(avgIncome)}/mês`} />
        <StatCard title="Total Despesas" value={totals.expense} icon={TrendingDown} color="bg-red-400"
          sub={`Média: ${formatCurrency(avgExpense)}/mês`} />
        <StatCard title="Total Investido" value={totals.investment} icon={BarChart3} color="bg-violet-500"
          sub={`Média: ${formatCurrency(totals.investment / 12)}/mês`} />
        <StatCard
          title="Saldo do Ano"
          value={totals.balance}
          icon={Wallet}
          color={totals.balance >= 0 ? 'bg-blue-500' : 'bg-orange-500'}
          sub={totals.balance >= 0 ? 'Ano positivo' : 'Ano negativo'}
        />
      </div>

      {/* Bar chart */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Receitas, Despesas e Investimentos por Mês</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }} barCategoryGap="25%">
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" className="dark:stroke-gray-700" />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                   tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} />
            <Bar dataKey="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Investimentos" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Balance per month */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Saldo Líquido por Mês</h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={balanceData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" className="dark:stroke-gray-700" />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                   tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="Saldo" radius={[4, 4, 0, 0]}
                 fill="#6366f1"
                 label={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Monthly breakdown table */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-5 border-b border-gray-100 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white">Detalhamento Mensal</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Mês</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Receitas</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-red-500 uppercase tracking-wider">Despesas</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wider">Investido</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
              {monthlyData.map((row, i) => {
                const hasData = row.income > 0 || row.expense > 0 || row.investment > 0;
                return (
                  <tr key={i} className={`transition-colors ${hasData ? 'hover:bg-gray-50 dark:hover:bg-gray-700/30' : 'opacity-40'}`}>
                    <td className="px-5 py-3 font-medium text-gray-900 dark:text-white">{MONTHS_PT[i]}/{year}</td>
                    <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400 font-medium">
                      {row.income > 0 ? formatCurrency(row.income) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-red-500 font-medium">
                      {row.expense > 0 ? formatCurrency(row.expense) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-violet-600 dark:text-violet-400 font-medium">
                      {row.investment > 0 ? formatCurrency(row.investment) : '—'}
                    </td>
                    <td className={`px-5 py-3 text-right font-bold ${
                      row.balance > 0 ? 'text-emerald-500' :
                      row.balance < 0 ? 'text-red-500' : 'text-gray-400 dark:text-gray-500'
                    }`}>
                      {hasData ? formatCurrency(row.balance) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 dark:bg-gray-700/50 font-semibold">
                <td className="px-5 py-3 text-gray-900 dark:text-white text-xs uppercase tracking-wider">Total</td>
                <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400">{formatCurrency(totals.income)}</td>
                <td className="px-4 py-3 text-right text-red-500">{formatCurrency(totals.expense)}</td>
                <td className="px-4 py-3 text-right text-violet-600 dark:text-violet-400">{formatCurrency(totals.investment)}</td>
                <td className={`px-5 py-3 text-right font-bold ${totals.balance >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {formatCurrency(totals.balance)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Highlights */}
      {(incomeMonths[0].income > 0 || expenseMonths[0].expense > 0) && (
        <div className="grid sm:grid-cols-2 gap-4">
          {incomeMonths[0].income > 0 && (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-3xl p-5 border border-emerald-100 dark:border-emerald-800/30">
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">Melhor mês (receita)</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{incomeMonths[0].month}</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(incomeMonths[0].income)}</p>
            </div>
          )}
          {expenseMonths[0].expense > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-3xl p-5 border border-red-100 dark:border-red-800/30">
              <p className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-1">Maior gasto</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{expenseMonths[0].month}</p>
              <p className="text-2xl font-bold text-red-500">{formatCurrency(expenseMonths[0].expense)}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
