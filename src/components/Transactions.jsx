import { useState } from 'react';
import { Plus, Trash2, Search, Filter, Pencil, RefreshCw, FileText, Paperclip } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate, getTransactionMonth } from '../utils/formatters';
import TransactionModal from './TransactionModal';
import ConfirmModal from './ConfirmModal';
import MonthFilter from './MonthFilter';

const TYPE_LABELS = { income: 'Receita', expense: 'Despesa', investment: 'Investimento' };
const TYPE_STYLES = {
  income:     'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
  expense:    'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
  investment: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400',
};
const AMOUNT_STYLES = {
  income:     'text-emerald-500',
  expense:    'text-red-500',
  investment: 'text-violet-600 dark:text-violet-400',
};

export default function Transactions() {
  const { data, deleteTransaction, selectedMonth } = useApp();

  const [txModalOpen, setTxModalOpen] = useState(false);
  const [editingTx, setEditingTx]     = useState(null);
  const [confirmId, setConfirmId]     = useState(null);
  const [search, setSearch]           = useState('');
  const [filterType, setFilterType]   = useState('all');

  const filtered = data.transactions
    .filter(tx => {
      const matchMonth  = getTransactionMonth(tx.date) === selectedMonth;
      const matchType   = filterType === 'all' || tx.type === filterType;
      const q           = search.toLowerCase();
      const matchSearch = !search ||
        tx.description.toLowerCase().includes(q) ||
        (tx.category || '').toLowerCase().includes(q) ||
        (tx.notes || '').toLowerCase().includes(q);
      return matchMonth && matchType && matchSearch;
    })
    .sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || '').localeCompare(a.createdAt || ''));

  const handleDelete = () => {
    if (confirmId) { deleteTransaction(confirmId); setConfirmId(null); }
  };

  const openEdit  = (tx) => { setEditingTx(tx); setTxModalOpen(true); };
  const closeModal = () => { setTxModalOpen(false); setEditingTx(null); };
  const getAccount = (id) => data.accounts.find(a => a.id === id);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Transações</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {filtered.length} lançamento{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <MonthFilter />
          <button onClick={() => { setEditingTx(null); setTxModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700
                       text-white rounded-2xl font-medium transition-colors shadow-lg
                       shadow-violet-200 dark:shadow-violet-900/40 text-sm">
            <Plus className="w-4 h-4" />
            <span>Novo</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-40 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-600
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm
                       placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-400 transition-shadow" />
        </div>
        <div className="flex p-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl gap-1">
          {[['all', 'Todos'], ['income', 'Receitas'], ['expense', 'Despesas'], ['investment', 'Invest.']].map(([val, label]) => (
            <button key={val} onClick={() => setFilterType(val)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all
                          ${filterType === val
                            ? 'bg-violet-600 text-white shadow-sm'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Transaction list */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Filter className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 dark:text-gray-500 text-sm">
              {search || filterType !== 'all' ? 'Nenhum resultado encontrado.' : 'Nenhum lançamento neste mês.'}
            </p>
            {!search && filterType === 'all' && (
              <button onClick={() => { setEditingTx(null); setTxModalOpen(true); }}
                className="mt-3 text-sm text-violet-600 dark:text-violet-400 font-medium hover:underline">
                Adicionar lançamento
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
            {filtered.map(tx => {
              const account = getAccount(tx.accountId);
              return (
                <div key={tx.id}
                  className="flex items-start gap-3 px-4 py-3.5
                             hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">

                  {/* Type badge — fixed width */}
                  <div className={`shrink-0 px-2.5 py-1 rounded-xl text-xs font-semibold mt-0.5 ${TYPE_STYLES[tx.type]}`}>
                    {TYPE_LABELS[tx.type]}
                  </div>

                  {/* Description + meta — grows */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-medium text-gray-900 dark:text-white text-sm">{tx.description}</p>
                      {tx.isRecurring && (
                        <span title="Recorrente">
                          <RefreshCw className="w-3 h-3 text-violet-400 shrink-0" />
                        </span>
                      )}
                      {tx.notes && (
                        <span title={tx.notes}>
                          <FileText className="w-3 h-3 text-gray-400 shrink-0" />
                        </span>
                      )}
                    </div>
                    {/* Meta line — category · account · method · date */}
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 leading-relaxed">
                      {[
                        tx.category || '—',
                        account?.name,
                        tx.paymentMethod,
                        formatDate(tx.date),
                      ].filter(Boolean).join(' · ')}
                    </p>
                    {tx.notes && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 italic line-clamp-1">
                        {tx.notes}
                      </p>
                    )}
                  </div>

                  {/* Right side: amount + actions */}
                  <div className="shrink-0 flex flex-col items-end gap-1.5">
                    <span className={`text-sm font-bold ${AMOUNT_STYLES[tx.type]}`}>
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </span>

                    <div className="flex items-center gap-1">
                      {tx.fileUrl && (
                        <a href={tx.fileUrl} target="_blank" rel="noopener noreferrer"
                          className="w-7 h-7 rounded-lg flex items-center justify-center
                                     text-gray-400 hover:text-violet-500 hover:bg-violet-50
                                     dark:hover:bg-violet-900/20 transition-colors"
                          title={tx.fileName || 'Comprovante'}>
                          <Paperclip className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <button onClick={() => openEdit(tx)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center
                                   text-gray-400 hover:text-blue-500 hover:bg-blue-50
                                   dark:hover:bg-blue-900/20 transition-colors"
                        title="Editar">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setConfirmId(tx.id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center
                                   text-gray-400 hover:text-red-500 hover:bg-red-50
                                   dark:hover:bg-red-900/20 transition-colors"
                        title="Excluir">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <TransactionModal isOpen={txModalOpen} onClose={closeModal} transaction={editingTx} />

      <ConfirmModal
        isOpen={!!confirmId}
        title="Excluir Lançamento"
        message="Tem certeza que deseja excluir este lançamento? O saldo da conta será revertido."
        onConfirm={handleDelete}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}
