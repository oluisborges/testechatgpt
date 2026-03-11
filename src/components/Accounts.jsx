import { useState } from 'react';
import { Plus, Trash2, Pencil, Check, X, Wallet } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/formatters';
import ConfirmModal from './ConfirmModal';
import CurrencyInput, { centsToFloat, floatToCents } from './CurrencyInput';

const COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#84cc16',
];

const INPUT_CLASS = `w-full px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-600
  bg-white dark:bg-gray-700 text-gray-900 dark:text-white
  placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-400
  dark:focus:ring-violet-500 transition-shadow text-sm`;

function ColorPicker({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {COLORS.map(c => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={`w-7 h-7 rounded-full transition-transform ${
            value === c ? 'scale-125 ring-2 ring-offset-2 ring-gray-400 dark:ring-gray-500' : 'hover:scale-110'
          }`}
          style={{ backgroundColor: c }}
        />
      ))}
    </div>
  );
}

function AccountForm({ initial, onSave, onCancel }) {
  const [name, setName] = useState(initial?.name || '');
  const [color, setColor] = useState(initial?.color || COLORS[0]);
  const [balance, setBalance] = useState(initial ? floatToCents(initial.balance) : '');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name: name.trim(), color, balance: centsToFloat(balance) });
  };

  const isEdit = !!initial;

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Nome da Conta</label>
        <input
          type="text"
          required
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Ex: Nubank, Carteira, C6..."
          className={INPUT_CLASS}
        />
      </div>

      {!isEdit && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Saldo Inicial (R$)</label>
          <CurrencyInput
            value={balance}
            onChange={setBalance}
            placeholder="0,00"
            className={INPUT_CLASS}
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cor</label>
        <ColorPicker value={color} onChange={setColor} />
      </div>

      <div className="flex gap-3 pt-1">
        <button
          type="submit"
          className="flex-1 py-2.5 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white
                     font-semibold text-sm transition-colors"
        >
          {isEdit ? 'Salvar' : 'Criar Conta'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-2xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200
                     dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-semibold
                     text-sm transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

export default function Accounts() {
  const { data, addAccount, updateAccount, deleteAccount } = useApp();

  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  const totalBalance = data.accounts.reduce((s, a) => s + a.balance, 0);

  const handleAdd = (values) => {
    addAccount(values);
    setShowAdd(false);
  };

  const handleEdit = (id, values) => {
    updateAccount(id, values);
    setEditingId(null);
  };

  const handleDelete = () => {
    if (confirmId) {
      deleteAccount(confirmId);
      setConfirmId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Contas</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {data.accounts.length} conta{data.accounts.length !== 1 ? 's' : ''} · Saldo total: {formatCurrency(totalBalance)}
          </p>
        </div>
        {!showAdd && (
          <button
            onClick={() => { setShowAdd(true); setEditingId(null); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700
                       text-white rounded-2xl font-medium transition-colors shadow-lg
                       shadow-violet-200 dark:shadow-violet-900/40 text-sm"
          >
            <Plus className="w-4 h-4" />
            Nova Conta
          </button>
        )}
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-violet-200 dark:border-violet-800/50 overflow-hidden">
          <div className="px-5 pt-5 pb-1">
            <h3 className="font-semibold text-gray-900 dark:text-white">Nova Conta</h3>
          </div>
          <AccountForm onSave={handleAdd} onCancel={() => setShowAdd(false)} />
        </div>
      )}

      {/* Accounts list */}
      {data.accounts.length === 0 && !showAdd ? (
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 py-16 text-center">
          <Wallet className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 dark:text-gray-500 text-sm">Nenhuma conta cadastrada.</p>
          <button
            onClick={() => setShowAdd(true)}
            className="mt-3 text-sm text-violet-600 dark:text-violet-400 font-medium hover:underline"
          >
            Adicionar conta
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {data.accounts.map(account => {
            const txCount = data.transactions.filter(t => t.accountId === account.id).length;
            return (
              <div
                key={account.id}
                className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100
                           dark:border-gray-700 overflow-hidden"
              >
                {editingId === account.id ? (
                  <>
                    <div className="px-5 pt-5 pb-1 flex items-center gap-3">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: account.color }} />
                      <h3 className="font-semibold text-gray-900 dark:text-white">Editar conta</h3>
                    </div>
                    <AccountForm
                      initial={account}
                      onSave={(v) => handleEdit(account.id, v)}
                      onCancel={() => setEditingId(null)}
                    />
                  </>
                ) : (
                  <div className="p-5">
                    {/* Color bar */}
                    <div className="h-1 rounded-full mb-4" style={{ backgroundColor: account.color }} />

                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{account.name}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          {txCount} transaç{txCount !== 1 ? 'ões' : 'ão'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { setEditingId(account.id); setShowAdd(false); }}
                          className="w-8 h-8 rounded-xl flex items-center justify-center
                                     hover:bg-blue-50 dark:hover:bg-blue-900/20
                                     text-gray-400 hover:text-blue-500 transition-colors"
                          title="Editar"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setConfirmId(account.id)}
                          className="w-8 h-8 rounded-xl flex items-center justify-center
                                     hover:bg-red-50 dark:hover:bg-red-900/20
                                     text-gray-400 hover:text-red-500 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className={`text-2xl font-bold mt-4 ${
                      account.balance >= 0 ? 'text-gray-900 dark:text-white' : 'text-red-500'
                    }`}>
                      {formatCurrency(account.balance)}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ConfirmModal
        isOpen={!!confirmId}
        title="Excluir Conta"
        message="Tem certeza? As transações vinculadas ficarão sem conta associada."
        onConfirm={handleDelete}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}
