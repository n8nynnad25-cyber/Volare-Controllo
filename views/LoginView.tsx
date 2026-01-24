
import React, { useState } from 'react';
import { supabase } from '../src/lib/supabase';
import { User, UserRole } from '../types';

interface LoginViewProps {
  onLogin: (user: User) => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        // Objeto User mapeado para a interface local
        const user: User = {
          id: data.user.id,
          name: data.user.user_metadata.name || email.split('@')[0], // Fallback para parte do email
          email: data.user.email || '',
          role: (data.user.user_metadata.role as UserRole) || 'manager', // Default safer
          avatar: data.user.user_metadata.avatar_url || 'https://ui-avatars.com/api/?name=' + (email.split('@')[0])
        };
        onLogin(user);
      }
    } catch (err: any) {
      setError(err.message === "Invalid login credentials" ? "E-mail ou senha incorretos." : err.message);
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="flex h-screen w-full bg-white overflow-hidden">
      {/* Coluna da Esquerda: Branding e Imagem */}
      <div className="hidden lg:flex w-1/2 relative bg-primary overflow-hidden">
        <div className="absolute inset-0 opacity-40 mix-blend-overlay">
          <img
            src="https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&q=80"
            alt="Brewery background"
            className="h-full w-full object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-tr from-primary via-primary/80 to-transparent"></div>

        <div className="relative z-10 flex flex-col justify-between p-16 text-white w-full">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[48px]">rocket_launch</span>
            <h1 className="text-4xl font-black tracking-tighter">VOLARE</h1>
          </div>

          <div>
            <h2 className="text-5xl font-bold leading-tight mb-6">
              Gestão inteligente para o seu negócio de bebidas.
            </h2>
            <p className="text-xl text-white/80 max-w-lg leading-relaxed">
              Controle de caixa, frotas e vendas de barris em uma única plataforma integrada e intuitiva.
            </p>
          </div>

          <div className="text-sm text-white/60 font-medium">
            © 2024 Volare Sistemas. Todos os direitos reservados.
          </div>
        </div>
      </div>

      {/* Coluna da Direita: Formulário */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-slate-50 overflow-y-auto">
        <div className="w-full max-w-md space-y-8 animate-in fade-in zoom-in-95 duration-500">
          <div className="bg-white rounded-2xl shadow-xl p-10 border border-slate-100">
            <div className="mb-8 text-center lg:text-left">
              <div className="lg:hidden flex items-center justify-center gap-2 mb-6 text-primary">
                <span className="material-symbols-outlined text-[40px]">rocket_launch</span>
                <span className="text-3xl font-black">VOLARE</span>
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-2">Bem-vindo de volta!</h3>
              <p className="text-slate-500">Por favor, insira suas credenciais.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 block">E-mail Corporativo</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-3 text-slate-400">mail</span>
                  <input
                    type="email"
                    required
                    className="w-full pl-12 pr-4 h-12 bg-slate-50 border-slate-200 rounded-xl focus:ring-primary focus:border-primary transition-all text-sm"
                    placeholder="exemplo@volare.com.br"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 block">Senha</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-3 text-slate-400">lock</span>
                  <input
                    type="password"
                    required
                    className="w-full pl-12 pr-4 h-12 bg-slate-50 border-slate-200 rounded-xl focus:ring-primary focus:border-primary transition-all text-sm"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-xs font-bold text-rose-600 flex items-center gap-2 animate-in shake">
                  <span className="material-symbols-outlined text-[16px]">error</span>
                  {error}
                </div>
              )}

              <div className="flex items-center gap-2">
                <input type="checkbox" id="remember" className="rounded text-primary focus:ring-primary border-slate-300" />
                <label htmlFor="remember" className="text-xs text-slate-600 font-medium cursor-pointer">Manter conectado</label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-14 bg-primary hover:bg-primary-hover text-white rounded-xl font-bold shadow-lg shadow-primary/30 transition-all flex items-center justify-center gap-2 group"
              >
                {isLoading ? (
                  <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>Entrar no Sistema</span>
                    <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
                  </>
                )}
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
};

export default LoginView;
