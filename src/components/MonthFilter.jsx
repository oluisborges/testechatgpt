import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getMonthLabel, getPrevMonth, getNextMonth, getCurrentMonth } from '../utils/formatters';

export default function MonthFilter() {
  const { selectedMonth, setSelectedMonth } = useApp();
  const currentMonth = getCurrentMonth();
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-2 py-1.5">
        <button
          onClick={() => setSelectedMonth(getPrevMonth(selectedMonth))}
          className="w-7 h-7 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-gray-500" />
        </button>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize min-w-32 text-center select-none">
          {getMonthLabel(selectedMonth)}
        </span>
        <button
          onClick={() => setSelectedMonth(getNextMonth(selectedMonth))}
          className="w-7 h-7 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-gray-500" />
        </button>
      </div>
      {selectedMonth !== currentMonth && (
        <button
          onClick={() => setSelectedMonth(currentMonth)}
          title="Voltar ao mês atual"
          className="w-7 h-7 flex items-center justify-center rounded-xl border border-violet-200 dark:border-violet-700
                     bg-violet-50 dark:bg-violet-900/20 text-violet-500 dark:text-violet-400
                     hover:bg-violet-100 dark:hover:bg-violet-900/40 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
