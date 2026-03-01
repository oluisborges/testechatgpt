import { Moon, Sun } from 'lucide-react';

export default function ThemeToggle({ dark, onToggle }) {
  return (
    <button className="btn border border-slate-300 dark:border-slate-700" onClick={onToggle}>
      {dark ? <Sun size={16} className="inline" /> : <Moon size={16} className="inline" />} {dark ? 'Claro' : 'Escuro'}
    </button>
  );
}
