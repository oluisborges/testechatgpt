import { useState, useEffect, useRef } from 'react';
import { X, Upload, Paperclip, RefreshCw, Repeat } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatDateInput } from '../utils/formatters';
import CurrencyInput, { centsToFloat, floatToCents } from './CurrencyInput';

const INPUT_CLASS = `w-full px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-600
  bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400
  focus:outline-none focus:ring-2 focus:ring-violet-400 dark:focus:ring-violet-500
  transition-shadow text-sm`;

// { key, label, interval (months), totalOccurrences (extra bills beyond the first) }
const RECURRENCE_OPTIONS = [
  { key: '',          label: 'Não repete',  interval: 0, extra: 0 },
  { key: 'mensal',    label: 'Mensal',      interval: 1, extra: 11 },
  { key: 'bimestral', label: 'Bimestral',   interval: 2, extra: 5  },
  { key: 'trimestral',label: 'Trimestral',  interval: 3, extra: 3  },
  { key: 'semestral', label: 'Semestral',   interval: 6, extra: 1  },
  { key: 'anual',     label: 'Anual',       interval: 12, extra: 1 },
];

function addMonthsToDate(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setMonth(d.getMonth() + n);
  return d.toISOString().substring(0, 10);
}

export default function BillModal({ isOpen, onClose, bill = null }) {
  const { data, addBill, updateBill, PAYMENT_METHODS } = useApp();
  const isEdit = !!bill;
  const fileRef = useRef(null);

  const [form, setForm] = useState({
    name: '',
    amount: '',
    dueDate: formatDateInput(new Date()),
    category: 'Outros',
    paymentMethod: 'Pix',
    accountId: '',
    pixKey: '',
    recurrence: '',
  });
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (isEdit) {
      setForm({
        name: bill.name,
        amount: floatToCents(bill.amount),
        dueDate: bill.dueDate,
        category: bill.category || 'Outros',
        paymentMethod: bill.paymentMethod || 'Pix',
        accountId: bill.accountId || '',
        pixKey: bill.pixKey || '',
        recurrence: '',
      });
    } else {
      const defaultAccount = data.accounts.find(a => a.name === 'Banco Principal') || data.accounts[0];
      setForm({
        name: '',
        amount: '',
        dueDate: formatDateInput(new Date()),
        category: 'Outros',
        paymentMethod: 'Pix',
        accountId: defaultAccount?.id || '',
        pixKey: '',
        recurrence: '',
      });
    }
    setFile(null);
    setSaveError('');
  }, [isOpen, isEdit, bill, data.accounts]);

  if (!isOpen) return null;

  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.amount || !form.dueDate) return;
    setSaving(true);
    setSaveError('');
    const { recurrence, ...rest } = form;
    const basePayload = { ...rest, amount: centsToFloat(form.amount) };

    if (isEdit) {
      await updateBill(bill.id, basePayload, file);
      setSaving(false);
      onClose();
      return;
    }

    // New bill
    const ok = await addBill(basePayload, file);
    if (!ok) {
      setSaving(false);
      setSaveError('Não foi possível salvar. Verifique se a migration da tabela bills foi executada no Supabase.');
      return;
    }

    // Create recurring copies (no pixKey, no file)
    if (recurrence) {
      const opt = RECURRENCE_OPTIONS.find(o => o.key === recurrence);
      if (opt && opt.interval > 0) {
        for (let i = 1; i <= opt.extra; i++) {
          const recurringPayload = {
            ...basePayload,
            dueDate: addMonthsToDate(form.dueDate, opt.interval * i),
            pixKey: '', // never carry over pix key
          };
          await addBill(recurringPayload, null);
        }
      }
    }

    setSaving(false);
    onClose();
  };

  const expenseCategories = data.categories.expense || [];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl
                      shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {isEdit ? 'Editar Conta a Pagar' : 'Nova Conta a Pagar'}
          </h2>
          <button onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto scrollbar-thin">

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Nome da conta *</label>
            <input type="text" required value={form.name} onChange={set('name')}
              placeholder="Ex: Conta de Luz, Internet, Aluguel..." className={INPUT_CLASS} />
          </div>

          {/* Amount + Due date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Valor *</label>
              <CurrencyInput required value={form.amount} onChange={v => setForm(p => ({ ...p, amount: v }))}
                placeholder="0,00" className={INPUT_CLASS} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Vencimento *</label>
              <input type="date" required value={form.dueDate} onChange={set('dueDate')} className={INPUT_CLASS} />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Categoria</label>
            <select value={form.category} onChange={set('category')} className={INPUT_CLASS}>
              {expenseCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Payment method + Account */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Forma de pagamento</label>
              <select value={form.paymentMethod} onChange={set('paymentMethod')} className={INPUT_CLASS}>
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Conta de débito</label>
              <select value={form.accountId} onChange={set('accountId')} className={INPUT_CLASS}>
                <option value="">Sem conta</option>
                {data.accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>

          {/* Recurrence — only for new bills */}
          {!isEdit && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                <span className="flex items-center gap-1.5"><Repeat className="w-3.5 h-3.5" /> Recorrência</span>
              </label>
              <select value={form.recurrence} onChange={set('recurrence')} className={INPUT_CLASS}>
                {RECURRENCE_OPTIONS.map(o => (
                  <option key={o.key} value={o.key}>{o.label}</option>
                ))}
              </select>
              {form.recurrence && (
                <p className="text-xs text-violet-600 dark:text-violet-400 mt-1">
                  {(() => {
                    const opt = RECURRENCE_OPTIONS.find(o => o.key === form.recurrence);
                    return opt ? `Serão criadas ${opt.extra + 1} contas no total (esta + ${opt.extra} cópias). A chave Pix não será copiada.` : '';
                  })()}
                </p>
              )}
            </div>
          )}

          {/* Pix key — show only when payment is Pix */}
          {form.paymentMethod === 'Pix' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Chave Pix</label>
              <input type="text" value={form.pixKey} onChange={set('pixKey')}
                placeholder="CPF, e-mail, telefone ou chave aleatória..."
                className={INPUT_CLASS} />
            </div>
          )}

          {/* File upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Anexar comprovante / fatura
            </label>
            <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp"
              onChange={e => setFile(e.target.files[0] || null)} className="hidden" />

            {file ? (
              <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border-2 border-violet-300 dark:border-violet-600
                              bg-violet-50 dark:bg-violet-900/20">
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
                {isEdit && bill?.fileName
                  ? `Substituir: ${bill.fileName}`
                  : 'Clique para selecionar PDF ou imagem'}
              </button>
            )}
          </div>

          {saveError && (
            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-2xl
                            border border-red-100 dark:border-red-800/30">
              <span className="text-xs text-red-600 dark:text-red-400">{saveError}</span>
            </div>
          )}

          <button type="submit" disabled={saving}
            className="w-full py-3 rounded-2xl bg-violet-600 hover:bg-violet-700 disabled:opacity-60
                       text-white font-semibold transition-colors shadow-lg shadow-violet-200 dark:shadow-violet-900/30
                       flex items-center justify-center gap-2">
            {saving && <RefreshCw className="w-4 h-4 animate-spin" />}
            {saving ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Adicionar Conta'}
          </button>
        </form>
      </div>
    </div>
  );
}
