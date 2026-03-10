import { Menu, Sun, Moon, Bell } from 'lucide-react';
import { AppProvider, useApp } from './context/AppContext';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Transactions from './components/Transactions';
import Budgets from './components/Budgets';
import Goals from './components/Goals';

const PAGE_TITLES = {
  dashboard: 'Dashboard',
  transactions: 'Transações',
  budgets: 'Orçamentos',
  goals: 'Metas',
};

function AppInner() {
  const { theme, toggleTheme, activePage, setSidebarOpen } = useApp();

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':    return <Dashboard />;
      case 'transactions': return <Transactions />;
      case 'budgets':      return <Budgets />;
      case 'goals':        return <Goals />;
      default:             return <Dashboard />;
    }
  };

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-950 ${theme}`}>
      <Sidebar />

      {/* Main content area */}
      <div className="lg:pl-72 min-h-screen flex flex-col">
        {/* Top header */}
        <header className="sticky top-0 z-20 bg-gray-50/80 dark:bg-gray-950/80 backdrop-blur-md
                           border-b border-gray-100 dark:border-gray-800 px-4 sm:px-6 py-4">
          <div className="flex items-center gap-4">
            {/* Mobile menu toggle */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center
                         hover:bg-white dark:hover:bg-gray-800 border border-gray-200
                         dark:border-gray-700 transition-colors"
            >
              <Menu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>

            {/* Page title */}
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
              {theme === 'dark' ? (
                <Sun className="w-4.5 h-4.5 text-amber-400" />
              ) : (
                <Moon className="w-4.5 h-4.5 text-gray-600" />
              )}
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  );
}
