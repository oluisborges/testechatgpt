import { useState } from 'react';
import { Plus, Trash2, Target, Edit2, Check, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import ConfirmModal from './ConfirmModal';

const COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#14b8a6',
];

export default function Goals() {
  const { data, addGoal, updateGoal, deleteGoal } = useApp();

  const [showForm, setShowForm] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const [editId, setEditId] = useState(null);
  const [editAmount, setEditAmount] = useState('');
  const [form, setForm] = useState({
    name: '',
    target: '',
    current: '',
    category: '',
    color: COLORS[0],
    deadline: '',
  });

  const investmentCategories = data.categories.investment || [];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.target) return;
    const category = form.category || form.name;
    addGoal({
      name: form.name,
      target: parseFloat(form.target),
      current: parseFloat(form.current) || 0,
      category,
      color: form.color,
      deadline: form.deadline,
    });
    setForm({ name: '', target: '', current: '', category: '', color: COLORS[0], deadline: '' });
    setShowForm(false);
  };

  const handleDelete = () => {
    if (confirmId) {
      deleteGoal(confirmId);
      setConfirmId(null);
    }
  };

  const handleEditSave = (id) => {
    const amount = parseFloat(editAmount);
    if (!isNaN(amount) && amount >= 0) {
      const goal = data.goals.find(g => g.id === id);
      updateGoal(id, { current: Math.min(goal.target, amount) });
    }
    setEditId(null);
    setEditAmount('');
  };

  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Metas de Economia</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Acompanhe seus objetivos financeiros</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700
                     text-white rounded-2xl font-medium transition-colors shadow-lg
                     shadow-violet-200 dark:shadow-violet-900/40 text-sm"
        >
          <Plus className="w-4 h-4" />
          Nova Meta
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-gray-700
                        animate-[fadeInScale_0.2s_ease-out]">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Nova Meta de Economia</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Nome da Meta
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Viagem para Europa, Reserva de Emergência..."
                  value={form.name}
                  onChange={set('name')}
                  className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-600
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm
                             placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Valor Alvo (R$)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="0.01"
                  placeholder="10.000,00"
                  value={form.target}
                  onChange={set('target')}
                  className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-600
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm
                             placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Já economizei (R$)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0,00"
                  value={form.current}
                  onChange={set('current')}
                  className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-600
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm
                             placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Categoria de Investimento
                </label>
                <input
                  type="text"
                  list="inv-categories"
                  placeholder="Nome da meta (padrão)"
                  value={form.category}
                  onChange={set('category')}
                  className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-600
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm
                             placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
                <datalist id="inv-categories">
                  {investmentCategories.map(c => <option key={c} value={c} />)}
                </datalist>
                <p className="text-xs text-gray-400 mt-1">
                  Deixe em branco para criar uma categoria com o nome da meta.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Data Limite
                </label>
                <input
                  type="date"
                  value={form.deadline}
                  onChange={set('deadline')}
                  className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-600
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm
                             focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
              </div>
            </div>

            {/* Color picker */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Cor da Meta
              </label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, color: c }))}
                    className={`w-8 h-8 rounded-xl transition-transform hover:scale-110 ${
                      form.color === c ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-gray-500 scale-110' : ''
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
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
                className="px-6 py-2.5 rounded-2xl bg-violet-600 hover:bg-violet-700
                           text-white text-sm font-medium transition-colors"
              >
                Criar Meta
              </button>
            </div>
          </form>
        </div>
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

            return (
              <div
                key={goal.id}
                className="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-sm border border-gray-100
                           dark:border-gray-700 hover:shadow-md transition-shadow group"
              >
                {/* Card header */}
                <div className="flex items-start gap-3 mb-4">
                  <div
                    className="w-10 h-10 rounded-2xl shrink-0 flex items-center justify-center"
                    style={{ backgroundColor: `${goal.color}20` }}
                  >
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
                  </div>
                  <button
                    onClick={() => setConfirmId(goal.id)}
                    className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center opacity-0
                               group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/20
                               text-gray-400 hover:text-red-500 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Progress */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-500 dark:text-gray-400">
                      {formatCurrency(goal.current)} <span className="text-gray-400 text-xs">de {formatCurrency(goal.target)}</span>
                    </span>
                    <span className="font-bold text-gray-900 dark:text-white">{pct.toFixed(1)}%</span>
                  </div>
                  <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, backgroundColor: goal.color }}
                    />
                  </div>
                </div>

                {/* Manual update */}
                {editId === goal.id ? (
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Novo valor atual"
                      value={editAmount}
                      onChange={e => setEditAmount(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600
                                 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white
                                 focus:outline-none focus:ring-2 focus:ring-violet-400"
                    />
                    <button
                      onClick={() => handleEditSave(goal.id)}
                      className="w-9 h-9 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white
                                 flex items-center justify-center transition-colors"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => { setEditId(null); setEditAmount(''); }}
                      className="w-9 h-9 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-500
                                 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setEditId(goal.id); setEditAmount(String(goal.current)); }}
                    className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500
                               hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                  >
                    <Edit2 className="w-3 h-3" />
                    Atualizar manualmente
                  </button>
                )}
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
