import { LayoutDashboard, ArrowLeftRight, Target, PiggyBank, X, TrendingUp, Wallet, CalendarDays, CreditCard, Receipt } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/formatters';

function getDueDiff(dueDate) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((new Date(dueDate + 'T00:00:00') - today) / 86400000);
}

const NAV_ITEMS = [
  { id: 'dashboard',    label: 'Dashboard',       icon: LayoutDashboard },
  { id: 'transactions', label: 'Transações',       icon: ArrowLeftRight },
  { id: 'bills',        label: 'Contas a Pagar',   icon: Receipt },
  { id: 'accounts',     label: 'Contas Bancárias', icon: CreditCard },
  { id: 'budgets',      label: 'Orçamentos',       icon: PiggyBank },
  { id: 'goals',        label: 'Metas',            icon: Target },
  { id: 'annual',       label: 'Resumo Anual',     icon: CalendarDays },
];

export default function Sidebar() {
  const { activePage, setActivePage, sidebarOpen, setSidebarOpen, totalBalance, totalInvested, data } = useApp();
  const { user } = useAuth();

  const urgentBills = (data.bills || []).filter(b => b.status === 'pending' && getDueDiff(b.dueDate) < 0).length;

  const navigate = (page) => {
    setActivePage(page);
    setSidebarOpen(false);
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
        <div className="flex items-center justify-between px-5 py-4">
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
        <div className="px-4 space-y-2 mb-4">
          <div className="bg-gradient-to-br from-violet-600 to-violet-700 rounded-2xl px-4 py-3 text-white
                          shadow-lg shadow-violet-200 dark:shadow-violet-900/40">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="w-3.5 h-3.5 opacity-80" />
              <span className="text-xs font-medium opacity-80">Saldo Total</span>
            </div>
            <p className="text-lg font-bold leading-tight">{formatCurrency(totalBalance)}</p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl px-4 py-3 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Investido</span>
            </div>
            <p className="text-lg font-bold leading-tight text-emerald-600 dark:text-emerald-400">{formatCurrency(totalInvested)}</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-0.5 overflow-hidden">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-3 mb-2">
            Menu
          </p>
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
            const active = activePage === id;
            return (
              <button
                key={id}
                onClick={() => navigate(id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-2xl text-sm font-medium
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
                <span className="ml-auto flex items-center gap-1">
                  {id === 'bills' && urgentBills > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-xs font-bold bg-red-500 text-white min-w-5 text-center">
                      {urgentBills}
                    </span>
                  )}
                  {active && <div className="w-1.5 h-1.5 rounded-full bg-violet-600 dark:bg-violet-400" />}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800">
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
