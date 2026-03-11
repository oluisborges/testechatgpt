import { Menu, Sun, Moon, LogOut, Loader2 } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider, useApp } from './context/AppContext';
import AuthPage from './components/AuthPage';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Transactions from './components/Transactions';
import Budgets from './components/Budgets';
import Goals from './components/Goals';
import AnnualSummary from './components/AnnualSummary';
import Accounts from './components/Accounts';

const PAGE_TITLES = {
  dashboard: 'Dashboard',
  transactions: 'Transações',
  accounts: 'Contas',
  budgets: 'Orçamentos',
  goals: 'Metas',
  annual: 'Resumo Anual',
};

function AppInner() {
  const { theme, toggleTheme, activePage, setSidebarOpen, loading } = useApp();
  const { signOut, user } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Carregando seus dados...</p>
        </div>
      </div>
    );
  }

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':    return <Dashboard />;
      case 'transactions': return <Transactions />;
      case 'accounts':     return <Accounts />;
      case 'budgets':      return <Budgets />;
      case 'goals':        return <Goals />;
      case 'annual':       return <AnnualSummary />;
      default:             return <Dashboard />;
    }
  };

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-950 ${theme}`}>
      <Sidebar />

      <div className="lg:pl-72 min-h-screen flex flex-col">
        <header className="sticky top-0 z-20 bg-gray-50/80 dark:bg-gray-950/80 backdrop-blur-md
                           border-b border-gray-100 dark:border-gray-800 px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center
                         hover:bg-white dark:hover:bg-gray-800 border border-gray-200
                         dark:border-gray-700 transition-colors"
            >
              <Menu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>

            <h1 className="text-lg font-semibold text-gray-900 dark:text-white flex-1">
              {PAGE_TITLES[activePage]}
            </h1>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="w-9 h-9 rounded-xl flex items-center justify-center
                         hover:bg-white dark:hover:bg-gray-800 border border-gray-200
                         dark:border-gray-700 transition-colors"
              title={theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
            >
              {theme === 'dark'
                ? <Sun className="w-4 h-4 text-amber-400" />
                : <Moon className="w-4 h-4 text-gray-600" />}
            </button>

            {/* Logout */}
            <button
              onClick={signOut}
              className="w-9 h-9 rounded-xl flex items-center justify-center
                         hover:bg-red-50 dark:hover:bg-red-900/20 border border-gray-200
                         dark:border-gray-700 transition-colors group"
              title={`Sair (${user?.email})`}
            >
              <LogOut className="w-4 h-4 text-gray-500 group-hover:text-red-500 transition-colors" />
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}

function AuthGate() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
      </div>
    );
  }

  if (!user) return <AuthPage />;

  return (
    <AppProvider user={user}>
      <AppInner />
    </AppProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}
