import { useState, useEffect, useRef } from 'react';
import { X, RefreshCw, Upload, Paperclip } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatDateInput } from '../utils/formatters';
import CurrencyInput, { centsToFloat, floatToCents } from './CurrencyInput';

const TYPE_CONFIG = {
  income: { label: 'Receita', color: 'bg-emerald-500' },
  expense: { label: 'Despesa', color: 'bg-red-500' },
  investment: { label: 'Investimento', color: 'bg-violet-500' },
};

const RECURRENCE_OPTIONS = [
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensal' },
  { value: 'yearly', label: 'Anual' },
];

const INPUT_CLASS = `w-full px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-600
  bg-white dark:bg-gray-700 text-gray-900 dark:text-white
  placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-400
  dark:focus:ring-violet-500 transition-shadow text-sm`;

export default function TransactionModal({ isOpen, onClose, transaction = null }) {
  const { data, addTransaction, updateTransaction, PAYMENT_METHODS } = useApp();
  const isEdit = !!transaction;
  const fileRef = useRef(null);

  const [form, setForm] = useState({
    type: 'expense',
    description: '',
    amount: '',
    date: formatDateInput(new Date()),
    category: '',
    accountId: '',
    paymentMethod: 'Pix',
    notes: '',
    isRecurring: false,
    recurrenceInterval: 'monthly',
  });
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setFile(null);
    if (isEdit) {
      setForm({
        type: transaction.type,
        description: transaction.description,
        amount: floatToCents(transaction.amount),
        date: transaction.date,
        category: transaction.category || '',
        accountId: transaction.accountId || '',
        paymentMethod: transaction.paymentMethod || 'Pix',
        notes: transaction.notes || '',
        isRecurring: transaction.isRecurring || false,
        recurrenceInterval: transaction.recurrenceInterval || 'monthly',
      });
    } else {
      const defaultAccount = data.accounts.find(a => a.name === 'Banco Principal') || data.accounts[0];
      setForm({
        type: 'expense',
        description: '',
        amount: '',
        date: formatDateInput(new Date()),
        category: '',
        accountId: defaultAccount?.id || '',
        paymentMethod: 'Pix',
        notes: '',
        isRecurring: false,
        recurrenceInterval: 'monthly',
      });
    }
  }, [isOpen, isEdit, transaction, data.accounts]);

  if (!isOpen) return null;

  const categories = data.categories[form.type] || [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.description || !form.amount || !form.date || !form.accountId) return;
    setSaving(true);
    const payload = {
      ...form,
      amount: centsToFloat(form.amount),
      category: form.category || categories[0] || 'Outros',
    };
    if (isEdit) {
      await updateTransaction(transaction.id, payload, file);
    } else {
      await addTransaction(payload, file);
    }
    setSaving(false);
    onClose();
  };

  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));
  const toggle = (field) => () => setForm(prev => ({ ...prev, [field]: !prev[field] }));

  const existingFile = isEdit && transaction?.fileName;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl
                      shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {isEdit ? 'Editar Movimentação' : 'Nova Movimentação'}
          </h2>
          <button onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto scrollbar-thin">
          {/* Type selector */}
          <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-700/50 rounded-2xl">
            {Object.entries(TYPE_CONFIG).map(([type, cfg]) => (
              <button key={type} type="button"
                onClick={() => setForm(prev => ({ ...prev, type, category: '' }))}
                className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all ${
                  form.type === type
                    ? `${cfg.color} text-white shadow-sm`
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}>
                {cfg.label}
              </button>
            ))}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Descrição *</label>
            <input type="text" required value={form.description} onChange={set('description')}
              placeholder="Ex: Almoço, Salário..." className={INPUT_CLASS} />
          </div>

          {/* Amount + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Valor (R$) *</label>
              <CurrencyInput required value={form.amount} onChange={v => setForm(p => ({ ...p, amount: v }))}
                placeholder="0,00" className={INPUT_CLASS} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Data *</label>
              <input type="date" required value={form.date} onChange={set('date')} className={INPUT_CLASS} />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Categoria</label>
            <select value={form.category} onChange={set('category')} className={INPUT_CLASS}>
              <option value="">Selecionar categoria</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Account */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Conta de Origem *</label>
            <select required value={form.accountId} onChange={set('accountId')} className={INPUT_CLASS}>
              {data.accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Método de Pagamento</label>
            <select value={form.paymentMethod} onChange={set('paymentMethod')} className={INPUT_CLASS}>
              {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Notas</label>
            <textarea value={form.notes} onChange={set('notes')} rows={2} placeholder="Observações opcionais..."
              className={`${INPUT_CLASS} resize-none`} />
          </div>

          {/* File attachment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Comprovante / Anexo
            </label>
            <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp"
              onChange={e => setFile(e.target.files[0] || null)} className="hidden" />

            {file ? (
              <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border-2 border-violet-300
                              dark:border-violet-600 bg-violet-50 dark:bg-violet-900/20">
                <Paperclip className="w-4 h-4 text-violet-600 dark:text-violet-400 shrink-0" />
                <span className="text-sm text-violet-700 dark:text-violet-300 flex-1 truncate">{file.name}</span>
                <button type="button" onClick={() => { setFile(null); fileRef.current.value = ''; }}
                  className="text-gray-400 hover:text-red-500 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => fileRef.current.click()}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl
                           border-2 border-dashed border-gray-200 dark:border-gray-600
                           hover:border-violet-400 dark:hover:border-violet-500
                           text-gray-400 hover:text-violet-600 dark:hover:text-violet-400
                           transition-colors text-sm">
                <Upload className="w-4 h-4" />
                {existingFile ? `Substituir: ${existingFile}` : 'Clique para selecionar PDF ou imagem'}
              </button>
            )}

            {existingFile && !file && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 flex items-center gap-1">
                <Paperclip className="w-3 h-3" /> Atual: {existingFile}
              </p>
            )}
          </div>

          {/* Recurring toggle */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/40 rounded-2xl">
            <button type="button" onClick={toggle('isRecurring')}
              className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${
                form.isRecurring ? 'bg-violet-600' : 'bg-gray-200 dark:bg-gray-600'
              }`}>
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${
                form.isRecurring ? 'left-5' : 'left-1'
              }`} />
            </button>
            <div className="flex items-center gap-2 flex-1">
              <RefreshCw className={`w-4 h-4 ${form.isRecurring ? 'text-violet-600 dark:text-violet-400' : 'text-gray-400'}`} />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Recorrente</span>
            </div>
            {form.isRecurring && (
              <select value={form.recurrenceInterval} onChange={set('recurrenceInterval')}
                className="text-sm border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700
                           text-gray-900 dark:text-white rounded-xl px-2 py-1 focus:outline-none
                           focus:ring-2 focus:ring-violet-400">
                {RECURRENCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            )}
          </div>

          <button type="submit" disabled={saving}
            className="w-full py-3 rounded-2xl bg-violet-600 hover:bg-violet-700 disabled:opacity-60
                       text-white font-semibold transition-colors shadow-lg shadow-violet-200
                       dark:shadow-violet-900/30 flex items-center justify-center gap-2">
            {saving && <RefreshCw className="w-4 h-4 animate-spin" />}
            {saving ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Adicionar Movimentação'}
          </button>
        </form>
      </div>
    </div>
  );
}
