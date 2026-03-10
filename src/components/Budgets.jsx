import { useState } from 'react';
import { Plus, Trash2, PiggyBank } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/formatters';
import ConfirmModal from './ConfirmModal';
import CurrencyInput, { centsToFloat } from './CurrencyInput';

function ProgressBar({ spent, limit }) {
  const pct = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;
  const color =
    pct >= 90 ? 'bg-red-500' :
    pct >= 70 ? 'bg-amber-400' :
    'bg-emerald-500';
  const bgColor =
    pct >= 90 ? 'bg-red-100 dark:bg-red-900/20' :
    pct >= 70 ? 'bg-amber-50 dark:bg-amber-900/20' :
    'bg-emerald-50 dark:bg-emerald-900/20';
  const textColor =
    pct >= 90 ? 'text-red-600 dark:text-red-400' :
    pct >= 70 ? 'text-amber-600 dark:text-amber-400' :
    'text-emerald-600 dark:text-emerald-400';

  return (
    <div>
      <div className="flex justify-between text-sm mb-2">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${bgColor} ${textColor}`}>
            {pct.toFixed(0)}%
          </span>
          <span className="text-gray-500 dark:text-gray-400 text-xs">
            {formatCurrency(spent)} de {formatCurrency(limit)}
          </span>
        </div>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          Restam: {formatCurrency(Math.max(0, limit - spent))}
        </span>
      </div>
      <div className="h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function Budgets() {
  const { data, addBudget, deleteBudget, getBudgetSpent } = useApp();

  const [showForm, setShowForm] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const [form, setForm] = useState({ category: '', limit: '' });

  const expenseCategories = data.categories.expense || [];
  const existingCategories = data.budgets.map(b => b.category);
  const availableCategories = expenseCategories.filter(c => !existingCategories.includes(c));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.category || !form.limit) return;
    addBudget({ category: form.category, limit: centsToFloat(form.limit) });
    setForm({ category: '', limit: '' });
    setShowForm(false);
  };

  const handleDelete = () => {
    if (confirmId) {
      deleteBudget(confirmId);
      setConfirmId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Orçamentos</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Controle seus limites mensais de gastos</p>
        </div>
        {availableCategories.length > 0 && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700
                       text-white rounded-2xl font-medium transition-colors shadow-lg
                       shadow-violet-200 dark:shadow-violet-900/40 text-sm"
          >
            <Plus className="w-4 h-4" />
            Novo Orçamento
          </button>
        )}
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-gray-700
                        animate-[fadeInScale_0.2s_ease-out]">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Definir Orçamento</h3>
          <form onSubmit={handleSubmit} className="flex gap-3 flex-wrap">
            <select
              required
              value={form.category}
              onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
              className="flex-1 min-w-40 px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-600
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm
                         focus:outline-none focus:ring-2 focus:ring-violet-400"
            >
              <option value="">Selecionar categoria</option>
              {availableCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <CurrencyInput
              required
              placeholder="Limite mensal (R$)"
              value={form.limit}
              onChange={(v) => setForm(p => ({ ...p, limit: v }))}
              className="flex-1 min-w-40 px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-600
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm
                         placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-600
                           text-gray-600 dark:text-gray-400 text-sm font-medium hover:bg-gray-50
                           dark:hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2.5 rounded-2xl bg-violet-600 hover:bg-violet-700
                           text-white text-sm font-medium transition-colors"
              >
                Salvar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Budget list */}
      {data.budgets.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-12 text-center shadow-sm
                        border border-gray-100 dark:border-gray-700">
          <PiggyBank className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 dark:text-gray-500 text-sm mb-1">Nenhum orçamento definido.</p>
          <p className="text-gray-400 dark:text-gray-500 text-xs">
            Crie orçamentos para controlar seus gastos por categoria.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {data.budgets.map(budget => {
            const spent = getBudgetSpent(budget.category);
            const pct = budget.limit > 0 ? Math.min(100, (spent / budget.limit) * 100) : 0;
            const status = pct >= 90 ? '🔴 Crítico' : pct >= 70 ? '🟡 Atenção' : '🟢 OK';

            return (
              <div
                key={budget.id}
                className="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-sm border border-gray-100
                           dark:border-gray-700 hover:shadow-md transition-shadow group"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{budget.category}</h3>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{status}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      {formatCurrency(budget.limit)}<span className="text-xs font-normal text-gray-400">/mês</span>
                    </span>
                    <button
                      onClick={() => setConfirmId(budget.id)}
                      className="w-8 h-8 rounded-xl flex items-center justify-center opacity-0
                                 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/20
                                 text-gray-400 hover:text-red-500 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <ProgressBar spent={spent} limit={budget.limit} />
              </div>
            );
          })}
        </div>
      )}

      <ConfirmModal
        isOpen={!!confirmId}
        title="Excluir Orçamento"
        message="Ao excluir este orçamento, as transações desta categoria não serão apagadas, mas ficarão desvinculadas do orçamento."
        onConfirm={handleDelete}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}
