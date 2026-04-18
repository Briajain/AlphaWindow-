import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, User, Terminal, ChevronRight, Loader2, ShieldCheck, Zap } from 'lucide-react';

interface AuthProps {
  onLogin: (token: string, user: { id: number; username: string }) => void;
}

export default function Auth({ onLogin }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (data.success) {
        if (isLogin) {
          onLogin(data.token, data.user);
        } else {
          setIsLogin(true);
          setError('Registration successful. Please login.');
        }
      } else {
        setError(data.error || 'Authentication failed');
      }
    } catch (err) {
      setError('Network error. Check connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-terminal flex items-center justify-center p-6 relative overflow-hidden">
      <div className="scanline" />
      
      {/* Background Ambience */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gold/5 blur-[120px] pointer-events-none rounded-full" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[420px] relative z-10"
      >
        <div className="card-quant border-gold/10 p-8">
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-bg-3 border border-gold/20 flex items-center justify-center shadow-[0_0_20px_rgba(197,160,89,0.1)]">
              <Zap className="w-8 h-8 text-gold drop-shadow-[0_0_8px_rgba(197,160,89,0.5)]" />
            </div>
          </div>

          <div className="text-center mb-10">
            <h1 className="text-3xl font-serif text-white mb-2 tracking-tight">
              AlphaWindow <span className="text-gold font-mono text-sm align-top leading-none">v2.0</span>
            </h1>
            <p className="text-neu font-mono text-[10px] uppercase tracking-[0.2em]">
              {isLogin ? 'Command Authentication Required' : 'Establish New Identity'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-bear/10 border border-bear/20 p-3 rounded-lg flex items-start gap-3"
                >
                  <ShieldCheck className="w-4 h-4 text-bear mt-0.5" />
                  <p className="text-bear text-xs font-mono">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <label className="block text-[10px] font-mono text-neu uppercase tracking-wider ml-1">Identity Tag</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-neu group-focus-within:text-gold transition-colors" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-bg-3 border border-white/5 rounded-lg py-3 pl-11 pr-4 text-white font-mono text-sm focus:border-gold/30 focus:bg-bg-4 transition-all outline-none"
                  placeholder="USERNAME"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-mono text-neu uppercase tracking-wider ml-1">Access Cipher</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-neu group-focus-within:text-gold transition-colors" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-bg-3 border border-white/5 rounded-lg py-3 pl-11 pr-4 text-white font-mono text-sm focus:border-gold/30 focus:bg-bg-4 transition-all outline-none"
                  placeholder="PASSWORD"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full relative group"
            >
              <div className="absolute inset-0 bg-gold blur-md opacity-20 group-hover:opacity-40 transition-opacity rounded-lg" />
              <div className="relative flex items-center justify-center gap-3 bg-gold hover:bg-gold-bright text-bg-terminal py-3 rounded-lg font-mono font-bold text-sm tracking-widest transition-all">
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    {isLogin ? 'INITIATE COMMAND' : 'CREATE ACCOUNT'}
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </div>
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-neu hover:text-gold font-mono text-[10px] uppercase tracking-widest transition-colors flex items-center justify-center gap-2 mx-auto"
            >
              <Terminal className="w-3 h-3" />
              {isLogin ? 'Switch to Registration Mode' : 'Already Have an Identity? Login'}
            </button>
          </div>
        </div>

        <p className="mt-8 text-center text-neu/30 font-mono text-[9px] uppercase tracking-[0.3em]">
          Alpha Intelligence Platform · Quant Command Suite 2024
        </p>
      </motion.div>
    </div>
  );
}
