import { useEffect, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import KpiCard from './components/KpiCard';
import ThemeToggle from './components/ThemeToggle';
import { mockCategories, mockGoals, mockTransactions, monthlySeries } from './lib/mockData';
import {
  calcAnnualProjection,
  calcDailyTicket,
  calcMonthlyGrowth,
  calcNeededIncome,
  createInsights,
  strategicBuckets,
  summarizeMonth,
} from './lib/calculations';

const colors = ['#10b981', '#0ea5e9', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function App() {
  const [transactions, setTransactions] = useState(mockTransactions);
  const [categories] = useState(mockCategories);
  const [goals] = useState(mockGoals);
  const [filter, setFilter] = useState('mês');
  const [dark, setDark] = useState(true);
  const [form, setForm] = useState({
    type: 'expense',
    value: '',
    category_id: mockCategories.find((c) => c.tipo === 'despesa')?.id || '',
    strategic_classification: 'Passivo',
    date: new Date().toISOString().slice(0, 10),
    description: '',
    recurring: false,
    satisfaction_score: '',
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  const summary = summarizeMonth(transactions, categories);
  const previousExpense = monthlySeries[monthlySeries.length - 2]?.expenses || 1;
  const growth = calcMonthlyGrowth(summary.totals.expense, previousExpense);
  const dailyTicket = calcDailyTicket(summary.totals.expense);
  const annualProjection = calcAnnualProjection(summary.totals.expense);
  const neededIncome = calcNeededIncome(summary.totals.income, summary.totals.expense);
  const insights = createInsights({ summary, previousExpense, goals });

  const categoryChart = Object.entries(summary.byCategory).map(([name, value]) => ({ name, value }));
  const strategicChart = strategicBuckets.map((bucket) => ({
    name: bucket,
    value: summary.byClassification[bucket] || 0,
    pct: summary.totals.expense ? (((summary.byClassification[bucket] || 0) / summary.totals.expense) * 100).toFixed(1) : '0',
  }));

  const handleSubmit = (event) => {
    event.preventDefault();
    const payload = {
      id: `tx-${Date.now()}`,
      user_id: 'user-demo',
      ...form,
      value: Number(form.value),
      satisfaction_score: form.satisfaction_score ? Number(form.satisfaction_score) : null,
    };
    setTransactions((prev) => [payload, ...prev]);
    setForm((prev) => ({ ...prev, value: '', description: '', satisfaction_score: '' }));
  };

  const exportCsv = () => {
    const headers = ['tipo', 'valor', 'categoria', 'classificacao', 'data', 'descricao'];
    const rows = transactions.map((tx) => {
      const category = categories.find((c) => c.id === tx.category_id)?.name || '';
      return [tx.type, tx.value, category, tx.strategic_classification || '', tx.date, tx.description || ''];
    });
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'financial-report.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="mx-auto max-w-7xl space-y-4 p-4 sm:p-6">
      <header className="card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Finance Strategy SaaS</p>
          <h1 className="text-2xl font-bold">Controle financeiro estratégico doméstico</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select className="input w-auto" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option>mês</option>
            <option>ano</option>
            <option>total</option>
          </select>
          <button className="btn border border-slate-300 dark:border-slate-700" type="button">
            <Upload size={14} className="mr-1 inline" /> Importar CSV
          </button>
          <button className="btn bg-emerald-600 text-white" type="button" onClick={exportCsv}>
            <Download size={14} className="mr-1 inline" /> Exportar CSV
          </button>
          <ThemeToggle dark={dark} onToggle={() => setDark((prev) => !prev)} />
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard title="Receita do mês" value={`R$ ${summary.totals.income.toLocaleString('pt-BR')}`} helper="Entrada total" healthy />
        <KpiCard title="Total gasto" value={`R$ ${summary.totals.expense.toLocaleString('pt-BR')}`} helper={`${summary.committedPct.toFixed(1)}% da renda comprometida`} healthy={summary.committedPct < 75} />
        <KpiCard title="Valor investido" value={`R$ ${summary.invested.toLocaleString('pt-BR')}`} helper={`${((summary.invested / Math.max(summary.totals.expense, 1)) * 100).toFixed(1)}% dos gastos`} healthy />
        <KpiCard title="Saldo disponível" value={`R$ ${summary.available.toLocaleString('pt-BR')}`} helper={`Meta de economia: R$ ${goals.monthlySavings.toLocaleString('pt-BR')}`} healthy={summary.available >= goals.monthlySavings} />
        <KpiCard title="Variação vs mês anterior" value={`${growth.toFixed(1)}%`} helper={growth <= 0 ? 'Queda saudável de consumo' : 'Atenção ao crescimento de gastos'} healthy={growth <= 0} />
        <KpiCard title="Ticket médio diário" value={`R$ ${dailyTicket.toFixed(2)}`} helper={`Projeção anual: R$ ${annualProjection.toLocaleString('pt-BR')}`} healthy={dailyTicket < 280} />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="card lg:col-span-2">
          <h2 className="mb-3 text-lg font-semibold">Evolução de gastos e receita</h2>
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={monthlySeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="income" stroke="#22c55e" strokeWidth={2} />
                <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>
        <article className="card">
          <h2 className="mb-3 text-lg font-semibold">Distribuição por categoria</h2>
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={categoryChart} dataKey="value" nameKey="name" outerRadius={80}>
                  {categoryChart.map((entry, index) => (
                    <Cell key={entry.name} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="card lg:col-span-2">
          <h2 className="mb-3 text-lg font-semibold">Classificação estratégica</h2>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={strategicChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#0ea5e9" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {strategicChart.map((item) => (
              <p key={item.name} className="rounded-xl bg-slate-100 p-2 text-sm dark:bg-slate-800">
                {item.name}: <strong>{item.pct}%</strong>
              </p>
            ))}
          </div>
        </article>

        <article className="card space-y-3">
          <h2 className="text-lg font-semibold">Insights automáticos</h2>
          {insights.map((insight) => (
            <p key={insight} className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700">
              {insight}
            </p>
          ))}
          <p className="rounded-xl border border-amber-500/60 bg-amber-500/10 p-3 text-sm text-amber-300">
            Para sustentar o padrão atual sem déficit, você precisa aumentar a renda em R$ {neededIncome.toLocaleString('pt-BR')}.
          </p>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="card">
          <h2 className="mb-3 text-lg font-semibold">Cadastro de transações</h2>
          <form className="grid gap-2 sm:grid-cols-2" onSubmit={handleSubmit}>
            <select className="input" value={form.type} onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}>
              <option value="income">Receita</option>
              <option value="expense">Despesa</option>
            </select>
            <input className="input" type="number" placeholder="Valor" required value={form.value} onChange={(e) => setForm((prev) => ({ ...prev, value: e.target.value }))} />
            <select className="input" value={form.category_id} onChange={(e) => setForm((prev) => ({ ...prev, category_id: e.target.value }))}>
              {categories
                .filter((c) => (form.type === 'income' ? c.tipo === 'receita' : c.tipo === 'despesa'))
                .map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
            </select>
            <select
              className="input"
              value={form.strategic_classification}
              disabled={form.type === 'income'}
              onChange={(e) => setForm((prev) => ({ ...prev, strategic_classification: e.target.value }))}
            >
              {strategicBuckets.map((bucket) => (
                <option key={bucket}>{bucket}</option>
              ))}
            </select>
            <input className="input" type="date" value={form.date} onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))} />
            <input className="input" placeholder="Descrição" value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.recurring} onChange={(e) => setForm((prev) => ({ ...prev, recurring: e.target.checked }))} /> Recorrente
            </label>
            <input className="input" type="number" min="0" max="10" placeholder="Nota de satisfação (0-10)" value={form.satisfaction_score} onChange={(e) => setForm((prev) => ({ ...prev, satisfaction_score: e.target.value }))} />
            <button className="btn bg-sky-600 text-white sm:col-span-2" type="submit">
              Salvar transação
            </button>
          </form>
        </article>

        <article className="card space-y-3">
          <h2 className="text-lg font-semibold">Metas e alertas (80%)</h2>
          <GoalBar label="Meta de economia mensal" current={summary.available} target={goals.monthlySavings} />
          <GoalBar label="Meta de investimento mensal" current={summary.invested} target={goals.monthlyInvestment} />
          {Object.entries(goals.categoryCaps).map(([category, cap]) => (
            <GoalBar
              key={category}
              label={`Teto - ${category}`}
              current={summary.byCategory[category] || 0}
              target={cap}
            />
          ))}
          <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
            <h3 className="text-sm font-semibold">Relatório reflexivo automático</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-500">
              <li>Qual gasto gerou mais valor?</li>
              <li>Qual gasto poderia ser evitado?</li>
              <li>O que deve aumentar no próximo mês?</li>
            </ul>
          </div>
        </article>
      </section>
    </main>
  );
}

function GoalBar({ label, current, target }) {
  const pct = target ? Math.min((current / target) * 100, 130) : 0;
  const alert = pct >= 80;
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span>{label}</span>
        <span>
          R$ {current.toLocaleString('pt-BR')} / {target.toLocaleString('pt-BR')} ({pct.toFixed(0)}%)
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div
          className={`h-2 ${alert ? 'bg-rose-500' : 'bg-emerald-500'}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}
