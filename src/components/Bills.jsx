import { useState, useCallback } from 'react';
import {
  Plus, Trash2, Pencil, CheckCircle2, Copy, ExternalLink,
  Paperclip, AlertCircle, Clock, CheckCheck, Receipt, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate, getCurrentMonth, getPrevMonth, getNextMonth, getMonthLabel } from '../utils/formatters';
import BillModal from './BillModal';
import ConfirmModal from './ConfirmModal';

// ── Helpers ──────────────────────────────────────────────────────────────────

function getDueDiff(dueDate) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + 'T00:00:00');
  return Math.round((due - today) / 86400000);
}

function StatusBadge({ bill }) {
  if (bill.status === 'paid') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold
                       bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
        <CheckCheck className="w-3 h-3" /> Paga
      </span>
    );
  }
  const diff = getDueDiff(bill.dueDate);
  if (diff < 0) return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold
                     bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
      <AlertCircle className="w-3 h-3" />
      Vencida há {Math.abs(diff)} dia{Math.abs(diff) !== 1 ? 's' : ''}
    </span>
  );
  if (diff === 0) return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold
                     bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
      <AlertCircle className="w-3 h-3" /> Vence hoje
    </span>
  );
  if (diff <= 7) return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold
                     bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400">
      <Clock className="w-3 h-3" /> Vence em {diff} dia{diff !== 1 ? 's' : ''}
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold
                     bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
      <Clock className="w-3 h-3" /> Vence em {diff} dias
    </span>
  );
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button onClick={handleCopy}
      className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs
                 bg-gray-100 dark:bg-gray-700 hover:bg-violet-100 dark:hover:bg-violet-900/30
                 text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400
                 transition-colors">
      <Copy className="w-3 h-3" />
      {copied ? 'Copiado!' : 'Copiar'}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Bills() {
  const { data, deleteBill, payBill, billsTableExists } = useApp();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingBill, setEditingBill] = useState(null);
  const [confirmPay, setConfirmPay] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [filter, setFilter] = useState('pending'); // all | pending | overdue | paid
  const [billsMonth, setBillsMonth] = useState(getCurrentMonth());

  const currentMonth = getCurrentMonth();
  const getAccount = useCallback((id) => data.accounts.find(a => a.id === id), [data.accounts]);

  // Filter by month first, then by status
  const monthBills = data.bills.filter(b => b.dueDate.substring(0, 7) === billsMonth);

  const filtered = monthBills.filter(b => {
    if (filter === 'pending') return b.status === 'pending' && getDueDiff(b.dueDate) >= 0;
    if (filter === 'overdue') return b.status === 'pending' && getDueDiff(b.dueDate) < 0;
    if (filter === 'paid')    return b.status === 'paid';
    return true;
  });

  // Summary counts (for selected month)
  const pending  = monthBills.filter(b => b.status === 'pending' && getDueDiff(b.dueDate) >= 0);
  const overdue  = monthBills.filter(b => b.status === 'pending' && getDueDiff(b.dueDate) < 0);
  const paid     = monthBills.filter(b => b.status === 'paid');
  const totalPending = pending.reduce((s, b) => s + b.amount, 0);
  const totalOverdue = overdue.reduce((s, b) => s + b.amount, 0);

  const openEdit = (bill) => { setEditingBill(bill); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditingBill(null); };

  const handlePay = async () => {
    if (!confirmPay) return;
    await payBill(confirmPay);
    setConfirmPay(null);
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    await deleteBill(confirmDelete);
    setConfirmDelete(null);
  };

  const FILTERS = [
    { id: 'pending', label: 'A Vencer', count: pending.length },
    { id: 'overdue', label: 'Vencidas', count: overdue.length },
    { id: 'paid',    label: 'Pagas',    count: paid.length },
    { id: 'all',     label: 'Todas',    count: data.bills.length },
  ];

  return (
    <div className="space-y-5">
      {/* Migration banner */}
      {!billsTableExists && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40
                        rounded-3xl p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Configuração necessária</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              A tabela de contas a pagar ainda não foi criada. Execute o arquivo
              <code className="mx-1 px-1 bg-amber-100 dark:bg-amber-900/40 rounded font-mono">supabase/migrations/002_bills_table.sql</code>
              no SQL Editor do Supabase para ativar esta funcionalidade.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Contas a Pagar</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {overdue.length > 0
              ? `${overdue.length} vencida${overdue.length !== 1 ? 's' : ''} · ${pending.length} a vencer`
              : `${pending.length} conta${pending.length !== 1 ? 's' : ''} a vencer`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Month navigator */}
          <div className="flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200
                          dark:border-gray-700 rounded-2xl px-2 py-1.5">
            <button onClick={() => setBillsMonth(getPrevMonth(billsMonth))}
              className="w-7 h-7 rounded-xl flex items-center justify-center
                         hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <ChevronLeft className="w-4 h-4 text-gray-500" />
            </button>
            <span className="text-sm font-medium text-gray-900 dark:text-white w-24 sm:w-28 text-center capitalize truncate">
              {getMonthLabel(billsMonth)}
            </span>
            <button onClick={() => setBillsMonth(getNextMonth(billsMonth))}
              disabled={billsMonth >= currentMonth}
              className="w-7 h-7 rounded-xl flex items-center justify-center
                         hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors
                         disabled:opacity-30 disabled:cursor-not-allowed">
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </button>
          </div>
          <button onClick={() => { setEditingBill(null); setModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700
                       text-white rounded-2xl font-medium transition-colors shadow-lg
                       shadow-violet-200 dark:shadow-violet-900/40 text-sm">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nova Conta</span>
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {(pending.length > 0 || overdue.length > 0) && (
        <div className="grid sm:grid-cols-2 gap-4">
          {overdue.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-3xl p-5 border border-red-100 dark:border-red-800/30">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span className="text-xs font-semibold text-red-500 uppercase tracking-wider">
                  Vencidas ({overdue.length})
                </span>
              </div>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(totalOverdue)}</p>
            </div>
          )}
          {pending.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-3xl p-5 border border-amber-100 dark:border-amber-800/30">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">
                  A vencer ({pending.length})
                </span>
              </div>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{formatCurrency(totalPending)}</p>
            </div>
          )}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex p-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl gap-1 overflow-x-auto">
        {FILTERS.map(({ id, label, count }) => (
          <button key={id} onClick={() => setFilter(id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5
                        ${filter === id
                          ? 'bg-violet-600 text-white shadow-sm'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
            {label}
            {count > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold
                               ${filter === id ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-700'}`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Bills list */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700
                        py-16 text-center">
          <Receipt className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 dark:text-gray-500 text-sm">
            {filter === 'all' ? 'Nenhuma conta cadastrada.' : 'Nenhuma conta nesta categoria.'}
          </p>
          {filter === 'all' && (
            <button onClick={() => setModalOpen(true)}
              className="mt-3 text-sm text-violet-600 dark:text-violet-400 font-medium hover:underline">
              Adicionar conta
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(bill => {
            const account = getAccount(bill.accountId);
            const isPaid = bill.status === 'paid';
            return (
              <div key={bill.id}
                className={`bg-white dark:bg-gray-800 rounded-3xl shadow-sm border overflow-hidden
                            transition-all group
                            ${isPaid
                              ? 'border-gray-100 dark:border-gray-700 opacity-75'
                              : getDueDiff(bill.dueDate) < 0
                                ? 'border-red-100 dark:border-red-800/40'
                                : 'border-gray-100 dark:border-gray-700 hover:border-violet-100 dark:hover:border-violet-800/30'}`}
              >
                {/* Colored top bar */}
                <div className={`h-1 w-full ${
                  isPaid ? 'bg-emerald-400' :
                  getDueDiff(bill.dueDate) < 0 ? 'bg-red-400' :
                  getDueDiff(bill.dueDate) === 0 ? 'bg-amber-400' :
                  getDueDiff(bill.dueDate) <= 7 ? 'bg-amber-300' : 'bg-blue-300'
                }`} />

                <div className="p-5">
                  {/* Row 1: status badge + name + amount */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <StatusBadge bill={bill} />
                      </div>
                      <h3 className={`font-semibold text-base leading-tight ${
                        isPaid ? 'text-gray-500 dark:text-gray-400 line-through' : 'text-gray-900 dark:text-white'
                      }`}>
                        {bill.name}
                      </h3>
                      {bill.description && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 line-clamp-2">
                          {bill.description}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-xl font-bold ${
                        isPaid ? 'text-emerald-500' :
                        getDueDiff(bill.dueDate) < 0 ? 'text-red-500' : 'text-gray-900 dark:text-white'
                      }`}>
                        {formatCurrency(bill.amount)}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        Venc. {formatDate(bill.dueDate)}
                      </p>
                    </div>
                  </div>

                  {/* Row 2: payment info */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400 mb-3">
                    {account && (
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: account.color }} />
                        {account.name}
                      </span>
                    )}
                    <span>{bill.paymentMethod}</span>
                    {bill.category && <span className="text-gray-300 dark:text-gray-600">·</span>}
                    {bill.category && <span>{bill.category}</span>}
                    {isPaid && bill.paidAt && (
                      <>
                        <span className="text-gray-300 dark:text-gray-600">·</span>
                        <span className="text-emerald-500">Pago em {formatDate(bill.paidAt.split('T')[0])}</span>
                      </>
                    )}
                  </div>

                  {/* Row 3: pix key + file */}
                  {(bill.pixKey || bill.fileUrl) && (
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      {bill.pixKey && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-700/50
                                        rounded-xl border border-gray-100 dark:border-gray-600">
                          <span className="text-xs text-gray-500 dark:text-gray-400 font-mono max-w-48 truncate">
                            {bill.pixKey}
                          </span>
                          <CopyButton text={bill.pixKey} />
                        </div>
                      )}
                      {bill.fileUrl && (
                        <a href={bill.fileUrl} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-gray-700/50
                                     rounded-xl border border-gray-100 dark:border-gray-600
                                     text-xs text-gray-500 dark:text-gray-400 hover:text-violet-600
                                     dark:hover:text-violet-400 transition-colors">
                          <Paperclip className="w-3 h-3 shrink-0" />
                          <span className="max-w-32 truncate">{bill.fileName || 'Anexo'}</span>
                          <ExternalLink className="w-3 h-3 shrink-0 opacity-50" />
                        </a>
                      )}
                    </div>
                  )}

                  {/* Row 4: actions */}
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => openEdit(bill)}
                      className="w-8 h-8 rounded-xl flex items-center justify-center
                                 hover:bg-blue-50 dark:hover:bg-blue-900/20
                                 text-gray-400 hover:text-blue-500 transition-colors"
                      title="Editar">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setConfirmDelete(bill.id)}
                      className="w-8 h-8 rounded-xl flex items-center justify-center
                                 hover:bg-red-50 dark:hover:bg-red-900/20
                                 text-gray-400 hover:text-red-500 transition-colors"
                      title="Excluir">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    {!isPaid && (
                      <button onClick={() => setConfirmPay(bill.id)}
                        className="flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-semibold
                                   bg-emerald-500 hover:bg-emerald-600 text-white transition-colors
                                   shadow-sm shadow-emerald-200 dark:shadow-emerald-900/30">
                        <CheckCircle2 className="w-4 h-4" />
                        Pagar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <BillModal isOpen={modalOpen} onClose={closeModal} bill={editingBill} />

      <ConfirmModal
        isOpen={!!confirmPay}
        title="Confirmar Pagamento"
        message={(() => {
          const b = data.bills.find(x => x.id === confirmPay);
          return b ? `Confirmar pagamento de ${formatCurrency(b.amount)} para "${b.name}"? Uma transação de despesa será criada automaticamente.` : '';
        })()}
        onConfirm={handlePay}
        onCancel={() => setConfirmPay(null)}
      />

      <ConfirmModal
        isOpen={!!confirmDelete}
        title="Excluir Conta"
        message="Tem certeza que deseja excluir esta conta a pagar? Esta ação não pode ser desfeita."
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
