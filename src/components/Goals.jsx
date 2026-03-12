import { useState } from 'react';
import { Plus, Trash2, Target, Pencil } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate, getTransactionMonth } from '../utils/formatters';
import ConfirmModal from './ConfirmModal';
import CurrencyInput, { centsToFloat, floatToCents } from './CurrencyInput';
import MonthFilter from './MonthFilter';

const COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#14b8a6',
];

const EMPTY_FORM = { name: '', target: '', current: '', category: '', color: COLORS[0], deadline: '' };

function GoalForm({ title, initial, onSave, onCancel, submitLabel, investmentCategories }) {
  const [form, setForm] = useState(initial || EMPTY_FORM);
  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.target) return;
    onSave({
      name: form.name,
      target: centsToFloat(form.target),
      current: centsToFloat(form.current),
      category: form.category || form.name,
      color: form.color,
      deadline: form.deadline,
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-gray-700
                    animate-[fadeInScale_0.2s_ease-out]">
      <h3 className="font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Nome da Meta</label>
            <input
              type="text" required placeholder="Ex: Viagem para Europa, Reserva de Emergência..."
              value={form.name} onChange={set('name')}
              className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-600
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm
                         placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Valor Alvo (R$)</label>
            <CurrencyInput required placeholder="0,00" value={form.target}
              onChange={(v) => setForm(prev => ({ ...prev, target: v }))}
              className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-600
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm
                         placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Já economizei (R$)</label>
            <CurrencyInput placeholder="0,00" value={form.current}
              onChange={(v) => setForm(prev => ({ ...prev, current: v }))}
              className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-600
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm
                         placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Categoria de Investimento</label>
            <input type="text" list="inv-categories-form" placeholder="Nome da meta (padrão)"
              value={form.category} onChange={set('category')}
              className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-600
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm
                         placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
            <datalist id="inv-categories-form">
              {investmentCategories.map(c => <option key={c} value={c} />)}
            </datalist>
            <p className="text-xs text-gray-400 mt-1">Deixe em branco para usar o nome da meta.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Data Limite</label>
            <input type="date" value={form.deadline} onChange={set('deadline')}
              className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-600
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm
                         focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cor da Meta</label>
          <div className="flex gap-2 flex-wrap">
            {COLORS.map(c => (
              <button key={c} type="button" onClick={() => setForm(p => ({ ...p, color: c }))}
                className={`w-8 h-8 rounded-xl transition-transform hover:scale-110 ${
                  form.color === c ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-gray-500 scale-110' : ''
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onCancel}
            className="px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-600
                       text-gray-600 dark:text-gray-400 text-sm font-medium hover:bg-gray-50
                       dark:hover:bg-gray-700 transition-colors">
            Cancelar
          </button>
          <button type="submit"
            className="px-6 py-2.5 rounded-2xl bg-violet-600 hover:bg-violet-700
                       text-white text-sm font-medium transition-colors">
            {submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function Goals() {
  const { data, addGoal, updateGoal, deleteGoal, selectedMonth } = useApp();

  const [showForm, setShowForm] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const [editingGoal, setEditingGoal] = useState(null);

  const investmentCategories = data.categories.investment || [];

  const handleAdd = (values) => {
    addGoal(values);
    setShowForm(false);
  };

  const handleEditSave = (values) => {
    updateGoal(editingGoal.id, {
      name: values.name,
      target: values.target,
      current: Math.min(values.target, values.current),
      category: values.category,
      color: values.color,
      deadline: values.deadline || null,
    });
    setEditingGoal(null);
  };

  const handleDelete = () => {
    if (confirmId) { deleteGoal(confirmId); setConfirmId(null); }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Metas de Economia</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Acompanhe seus objetivos financeiros</p>
        </div>
        <div className="flex items-center gap-3">
          <MonthFilter />
          <button onClick={() => { setShowForm(!showForm); setEditingGoal(null); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700
                       text-white rounded-2xl font-medium transition-colors shadow-lg
                       shadow-violet-200 dark:shadow-violet-900/40 text-sm">
            <Plus className="w-4 h-4" />
            Nova Meta
          </button>
        </div>
      </div>

      {showForm && !editingGoal && (
        <GoalForm
          title="Nova Meta de Economia"
          onSave={handleAdd}
          onCancel={() => setShowForm(false)}
          submitLabel="Criar Meta"
          investmentCategories={investmentCategories}
        />
      )}

      {editingGoal && (
        <GoalForm
          title="Editar Meta"
          initial={{
            name: editingGoal.name,
            target: floatToCents(editingGoal.target),
            current: floatToCents(editingGoal.current),
            category: editingGoal.category,
            color: editingGoal.color,
            deadline: editingGoal.deadline || '',
          }}
          onSave={handleEditSave}
          onCancel={() => setEditingGoal(null)}
          submitLabel="Salvar Alterações"
          investmentCategories={investmentCategories}
        />
      )}

      {/* Goals list */}
      {data.goals.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-12 text-center shadow-sm
                        border border-gray-100 dark:border-gray-700">
          <Target className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 dark:text-gray-500 text-sm mb-1">Nenhuma meta criada ainda.</p>
          <p className="text-gray-400 dark:text-gray-500 text-xs">
            Crie metas e acompanhe seu progresso automaticamente ao registrar investimentos.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {data.goals.map(goal => {
            const pct = goal.target > 0 ? Math.min(100, (goal.current / goal.target) * 100) : 0;
            const completed = pct >= 100;
            const monthContrib = data.transactions
              .filter(t => t.type === 'investment' && t.category === goal.category && getTransactionMonth(t.date) === selectedMonth)
              .reduce((s, t) => s + t.amount, 0);

            return (
              <div key={goal.id}
                className="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-sm border border-gray-100
                           dark:border-gray-700 hover:shadow-md transition-shadow group">
                {/* Card header */}
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-2xl shrink-0 flex items-center justify-center"
                    style={{ backgroundColor: `${goal.color}20` }}>
                    <Target className="w-5 h-5" style={{ color: goal.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">{goal.name}</h3>
                      {completed && (
                        <span className="shrink-0 px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30
                                         text-emerald-700 dark:text-emerald-400 text-xs font-semibold rounded-lg">
                          Concluída!
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      Categoria: {goal.category}
                      {goal.deadline && ` · Prazo: ${formatDate(goal.deadline)}`}
                    </p>
                    {monthContrib > 0 && (
                      <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-lg
                                       bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400">
                        +{formatCurrency(monthContrib)} neste mês
                      </span>
                    )}
                  </div>
                  <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => { setEditingGoal(goal); setShowForm(false); }}
                      className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-blue-50
                                 dark:hover:bg-blue-900/20 text-gray-400 hover:text-blue-500 transition-colors"
                      title="Editar">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => setConfirmId(goal.id)}
                      className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-red-50
                                 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors"
                      title="Excluir">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Progress */}
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-500 dark:text-gray-400">
                      {formatCurrency(goal.current)} <span className="text-gray-400 text-xs">de {formatCurrency(goal.target)}</span>
                    </span>
                    <span className="font-bold text-gray-900 dark:text-white">{pct.toFixed(1)}%</span>
                  </div>
                  <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, backgroundColor: goal.color }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmModal
        isOpen={!!confirmId}
        title="Excluir Meta"
        message="Ao excluir esta meta, os investimentos registrados nesta categoria não serão apagados, mas serão desvinculados da meta."
        onConfirm={handleDelete}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}
