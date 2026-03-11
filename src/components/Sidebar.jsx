import { useState } from 'react';
import { LayoutDashboard, ArrowLeftRight, Target, PiggyBank, X, TrendingUp, Wallet, Pencil, Check, CalendarDays } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/formatters';

const ACCOUNT_COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#84cc16',
];

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'transactions', label: 'Transações', icon: ArrowLeftRight },
  { id: 'budgets', label: 'Orçamentos', icon: PiggyBank },
  { id: 'goals', label: 'Metas', icon: Target },
  { id: 'annual', label: 'Resumo Anual', icon: CalendarDays },
];

function AccountEditRow({ account, onSave, onCancel }) {
  const [name, setName] = useState(account.name);
  const [color, setColor] = useState(account.color);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), color });
  };

  return (
    <div className="space-y-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-600">
      <input
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        autoFocus
        className="w-full px-3 py-1.5 text-sm rounded-xl border border-gray-200 dark:border-gray-600
                   bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                   focus:outline-none focus:ring-2 focus:ring-violet-400"
      />
      <div className="flex flex-wrap gap-1.5">
        {ACCOUNT_COLORS.map(c => (
          <button
            key={c}
            type="button"
            onClick={() => setColor(c)}
            className={`w-5 h-5 rounded-full transition-transform ${color === c ? 'scale-125 ring-2 ring-offset-1 ring-gray-400' : ''}`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          className="flex-1 py-1 text-xs bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-medium transition-colors"
        >
          Salvar
        </button>
        <button
          onClick={onCancel}
          className="flex-1 py-1 text-xs bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600
                     text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const { activePage, setActivePage, sidebarOpen, setSidebarOpen, totalBalance, totalInvested, data, updateAccount } = useApp();
  const { user } = useAuth();
  const [editingAccountId, setEditingAccountId] = useState(null);

  const navigate = (page) => {
    setActivePage(page);
    setSidebarOpen(false);
  };

  const handleSaveAccount = async (id, updates) => {
    await updateAccount(id, updates);
    setEditingAccountId(null);
  };

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-white dark:bg-gray-900 border-r border-gray-100
                    dark:border-gray-800 z-40 flex flex-col transition-transform duration-300 ease-in-out
                    ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between p-6 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-violet-600 flex items-center justify-center shadow-lg
                            shadow-violet-200 dark:shadow-violet-900/40">
              <span className="text-white font-bold text-sm">NC</span>
            </div>
            <div>
              <h1 className="font-bold text-gray-900 dark:text-white text-sm leading-tight">Nosso</h1>
              <h1 className="font-bold text-violet-600 text-sm leading-tight">Controle</h1>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden w-8 h-8 rounded-xl flex items-center justify-center
                       hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Financial summary cards */}
        <div className="px-4 space-y-3 mb-4">
          <div className="bg-gradient-to-br from-violet-600 to-violet-700 rounded-3xl p-4 text-white
                          shadow-lg shadow-violet-200 dark:shadow-violet-900/40">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="w-4 h-4 opacity-80" />
              <span className="text-xs font-medium opacity-80">Saldo Total</span>
            </div>
            <p className="text-xl font-bold">{formatCurrency(totalBalance)}</p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-3xl p-4 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Investido</span>
            </div>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(totalInvested)}</p>
          </div>
        </div>

        {/* Accounts section */}
        {data.accounts.length > 0 && (
          <div className="px-4 mb-4">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-1 mb-2">
              Contas
            </p>
            <div className="space-y-1">
              {data.accounts.map(account => (
                <div key={account.id}>
                  {editingAccountId === account.id ? (
                    <AccountEditRow
                      account={account}
                      onSave={(updates) => handleSaveAccount(account.id, updates)}
                      onCancel={() => setEditingAccountId(null)}
                    />
                  ) : (
                    <div className="flex items-center gap-2 px-2 py-1.5 rounded-xl group hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: account.color }} />
                      <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 truncate">{account.name}</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                        {formatCurrency(account.balance)}
                      </span>
                      <button
                        onClick={() => setEditingAccountId(account.id)}
                        className="w-6 h-6 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100
                                   hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600
                                   dark:hover:text-gray-200 transition-all"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-3 mb-3">
            Menu
          </p>
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
            const active = activePage === id;
            return (
              <button
                key={id}
                onClick={() => navigate(id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium
                            transition-all duration-150 group
                            ${active
                              ? 'bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
                              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                            }`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors
                                 ${active
                                   ? 'bg-violet-600 shadow-md shadow-violet-200 dark:shadow-violet-900/50'
                                   : 'bg-gray-100 dark:bg-gray-700/50 group-hover:bg-gray-200 dark:group-hover:bg-gray-700'
                                 }`}>
                  <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`} />
                </div>
                {label}
                {active && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-600 dark:bg-violet-400" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800">
          {user?.email && (
            <p className="text-xs text-center text-gray-400 dark:text-gray-500 truncate mb-1" title={user.email}>
              {user.email}
            </p>
          )}
          <p className="text-xs text-center text-gray-300 dark:text-gray-700">
            Nosso Controle © 2025
          </p>
        </div>
      </aside>
    </>
  );
}
