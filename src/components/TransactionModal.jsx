import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatDateInput } from '../utils/formatters';

const TYPE_CONFIG = {
  income: { label: 'Receita', color: 'bg-emerald-500', ring: 'ring-emerald-400' },
  expense: { label: 'Despesa', color: 'bg-red-500', ring: 'ring-red-400' },
  investment: { label: 'Investimento', color: 'bg-violet-500', ring: 'ring-violet-400' },
};

export default function TransactionModal({ isOpen, onClose }) {
  const { data, addTransaction, PAYMENT_METHODS } = useApp();

  const [form, setForm] = useState({
    type: 'expense',
    description: '',
    amount: '',
    date: formatDateInput(new Date()),
    category: '',
    accountId: '',
    paymentMethod: 'Pix',
  });

  useEffect(() => {
    if (isOpen) {
      const defaultAccount = data.accounts.find(a => a.name === 'Banco Principal') || data.accounts[0];
      setForm({
        type: 'expense',
        description: '',
        amount: '',
        date: formatDateInput(new Date()),
        category: '',
        accountId: defaultAccount?.id || '',
        paymentMethod: 'Pix',
      });
    }
  }, [isOpen, data.accounts]);

  if (!isOpen) return null;

  const categories = data.categories[form.type] || [];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.description || !form.amount || !form.date || !form.accountId) return;
    addTransaction({
      ...form,
      amount: parseFloat(form.amount),
      category: form.category || categories[0] || 'Outros',
    });
    onClose();
  };

  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl
                      shadow-2xl overflow-hidden animate-[slideUp_0.3s_ease-out] sm:animate-[fadeInScale_0.2s_ease-out]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Nova Movimentação</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center
                       hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto scrollbar-thin">
          {/* Type selector */}
          <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-700/50 rounded-2xl">
            {Object.entries(TYPE_CONFIG).map(([type, cfg]) => (
              <button
                key={type}
                type="button"
                onClick={() => setForm(prev => ({ ...prev, type, category: '' }))}
                className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all ${
                  form.type === type
                    ? `${cfg.color} text-white shadow-sm`
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {cfg.label}
              </button>
            ))}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Descrição</label>
            <input
              type="text"
              required
              value={form.description}
              onChange={set('description')}
              placeholder="Ex: Almoço, Salário..."
              className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-600
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-400
                         dark:focus:ring-violet-500 transition-shadow"
            />
          </div>

          {/* Amount + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Valor (R$)</label>
              <input
                type="number"
                required
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={set('amount')}
                placeholder="0,00"
                className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-600
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                           placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-400
                           dark:focus:ring-violet-500 transition-shadow"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Data</label>
              <input
                type="date"
                required
                value={form.date}
                onChange={set('date')}
                className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-600
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                           focus:outline-none focus:ring-2 focus:ring-violet-400 dark:focus:ring-violet-500
                           transition-shadow"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Categoria</label>
            <select
              value={form.category}
              onChange={set('category')}
              className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-600
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:outline-none focus:ring-2 focus:ring-violet-400 dark:focus:ring-violet-500
                         transition-shadow"
            >
              <option value="">Selecionar categoria</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Account */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Conta de Origem</label>
            <select
              required
              value={form.accountId}
              onChange={set('accountId')}
              className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-600
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:outline-none focus:ring-2 focus:ring-violet-400 dark:focus:ring-violet-500
                         transition-shadow"
            >
              {data.accounts.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Método de Pagamento</label>
            <select
              value={form.paymentMethod}
              onChange={set('paymentMethod')}
              className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-600
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:outline-none focus:ring-2 focus:ring-violet-400 dark:focus:ring-violet-500
                         transition-shadow"
            >
              {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white
                       font-semibold transition-colors shadow-lg shadow-violet-200 dark:shadow-violet-900/30"
          >
            Adicionar Movimentação
          </button>
        </form>
      </div>
    </div>
  );
}
