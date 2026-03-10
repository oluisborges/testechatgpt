import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Wallet, Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [tab, setTab] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    if (tab === 'login') {
      const { error } = await signIn(email, password);
      if (error) setError(translateError(error.message));
    } else {
      const { error } = await signUp(email, password);
      if (error) {
        setError(translateError(error.message));
      } else {
        setSuccessMsg('Conta criada! Verifique seu e-mail para confirmar o cadastro.');
        setTab('login');
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-indigo-100 dark:from-gray-950 dark:to-gray-900
                    flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 rounded-3xl bg-violet-600 items-center justify-center
                          shadow-xl shadow-violet-200 dark:shadow-violet-900/40 mb-4">
            <Wallet className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Nosso Controle</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Suas finanças, organizadas</p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl shadow-gray-200/50
                        dark:shadow-black/30 p-6">
          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-700/50 rounded-2xl mb-6">
            {['login', 'cadastro'].map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(''); setSuccessMsg(''); }}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all capitalize ${
                  tab === t
                    ? 'bg-white dark:bg-gray-700 text-violet-700 dark:text-violet-300 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {t === 'login' ? 'Entrar' : 'Criar conta'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* E-mail */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                E-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-600
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                             placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-400
                             dark:focus:ring-violet-500 transition-shadow"
                />
              </div>
            </div>

            {/* Senha */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={tab === 'cadastro' ? 'Mínimo 6 caracteres' : '••••••••'}
                  className="w-full pl-10 pr-10 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-600
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                             placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-400
                             dark:focus:ring-violet-500 transition-shadow"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600
                             dark:hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Erro */}
            {error && (
              <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20
                            rounded-xl px-3 py-2">
                {error}
              </p>
            )}

            {/* Sucesso */}
            {successMsg && (
              <p className="text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20
                            rounded-xl px-3 py-2">
                {successMsg}
              </p>
            )}

            {/* Botão */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-2xl bg-violet-600 hover:bg-violet-700 disabled:opacity-60
                         text-white font-semibold transition-colors shadow-lg shadow-violet-200
                         dark:shadow-violet-900/30 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {tab === 'login' ? 'Entrar' : 'Criar conta'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function translateError(msg) {
  if (msg.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (msg.includes('Email not confirmed')) return 'Confirme seu e-mail antes de entrar.';
  if (msg.includes('User already registered')) return 'Este e-mail já está cadastrado.';
  if (msg.includes('Password should be at least')) return 'A senha deve ter pelo menos 6 caracteres.';
  return msg;
}
