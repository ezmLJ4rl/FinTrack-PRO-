import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User } from '../types';
import { ICONS } from '../constants.tsx';

interface LoginProps {
  onLogin: (user: User) => void;
}

const FloatingInput = ({ label, type, value, onChange, required, disabled, animationDelay }: any) => {
  const [focused, setFocused] = useState(false);
  const isFloating = focused || (value && value.length > 0);

  return (
    <div className="relative w-full group opacity-0 animate-fade-in-up" style={{ animationDelay }}>
      <input
        type={type}
        required={required}
        value={value}
        disabled={disabled}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={onChange}
        className={`
          w-full px-4 py-4 bg-transparent
          border-2 border-slate-200 dark:border-slate-800 rounded-xl
          focus:border-indigo-500 dark:focus:border-indigo-400
          outline-none transition-all duration-300 font-medium text-slate-900 dark:text-white
          disabled:opacity-50
        `}
      />
      <label
        className={`
          absolute left-3 transition-all duration-300 pointer-events-none px-1 font-medium
          bg-white dark:bg-slate-900
          ${isFloating 
            ? '-top-2.5 text-[12px] text-indigo-500 dark:text-indigo-400 font-bold z-10' 
            : 'top-4 text-sm text-slate-400'}
        `}
      >
        {label}
      </label>
    </div>
  );
};

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing) return;

    setIsProcessing(true);
    setError('');

    // Simulate professional identity verification sequence
    // Phase 1: Establish Connection
    await new Promise(resolve => setTimeout(resolve, 800));
    // Phase 2: Decrypting Handshake
    await new Promise(resolve => setTimeout(resolve, 1000));

    const usersStr = localStorage.getItem('users');
    const users: User[] = usersStr ? JSON.parse(usersStr) : [];
    const user = users.find(u => u.email === email && u.password === password);

    if (user) {
      setIsSuccess(true);
      // Brief pause on success state for high-end feel
      await new Promise(resolve => setTimeout(resolve, 900));
      onLogin(user);
      navigate('/');
    } else {
      setIsProcessing(false);
      setError('Invalid credentials. Access denied.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">
      {/* Dynamic Handshake Pulses (Professional Background Motion) */}
      <div className={`absolute inset-0 transition-opacity duration-1000 ${isProcessing ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[100px] animate-glow-pulse"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-indigo-600/5 rounded-full blur-[80px] animate-glow-pulse delay-700"></div>
      </div>

      <div className={`w-full max-w-md bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden transition-all duration-700 transform ${isSuccess ? 'scale-90 opacity-0 blur-2xl' : 'scale-100 opacity-100'} ${isProcessing ? 'scale-[0.98] shadow-indigo-500/10' : ''}`}>
        
        {/* High-fidelity Multi-stage Progress Bar */}
        <div className={`h-1.5 w-full bg-slate-100 dark:bg-slate-800 overflow-hidden relative`}>
          <div className={`absolute inset-y-0 left-0 bg-indigo-600 transition-all duration-[2000ms] ease-out ${isProcessing ? 'w-full' : 'w-0'}`}></div>
          {isProcessing && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent w-full h-full animate-shimmer" style={{ backgroundSize: '200% 100%' }}></div>
          )}
        </div>
        
        <div className="p-10 space-y-8">
          <div className="text-center opacity-0 animate-fade-in-up">
            <div className={`
              inline-flex w-16 h-16 rounded-2xl items-center justify-center text-white mb-6 shadow-xl transition-all duration-700 relative overflow-hidden 
              ${isSuccess ? 'bg-emerald-500 rotate-[360deg] scale-110' : 'bg-indigo-600 shadow-indigo-100 dark:shadow-none'} 
              ${isProcessing && !isSuccess ? 'ring-8 ring-indigo-500/10' : ''}
            `}>
              {/* Tactical Logo Scan Effect */}
              {isProcessing && !isSuccess && (
                <div className="absolute inset-0 z-10">
                  <div className="absolute top-0 left-0 w-full h-2 bg-white/60 animate-scan shadow-[0_0_15px_rgba(255,255,255,0.8)]"></div>
                  <div className="absolute inset-0 bg-indigo-400/20 animate-pulse-slow"></div>
                </div>
              )}
              
              <div className={`transition-all duration-500 ${isSuccess ? 'scale-0 opacity-0 blur-sm' : 'scale-100 opacity-100'}`}>
                <ICONS.Logo className="w-10 h-10" />
              </div>
              <div className={`absolute transition-all duration-700 ${isSuccess ? 'scale-110 opacity-100' : 'scale-0 opacity-0 blur-sm'}`}>
                <ICONS.Check className="w-8 h-8" />
              </div>
            </div>
            
            <div className={`transition-all duration-700 ${isProcessing ? 'opacity-30 blur-[4px] scale-95' : 'opacity-100'}`}>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">FinTrack Pro</h1>
              <p className="text-slate-500 dark:text-slate-400 font-medium text-sm leading-relaxed max-w-[280px] mx-auto">
                Master your money with AI-powered precision and absolute clarity.
              </p>
            </div>
          </div>

          <form onSubmit={handleLogin} className={`space-y-6 transition-all duration-500 ${isProcessing ? 'opacity-30 blur-[4px]' : 'opacity-100'}`}>
            {error && (
              <div className="p-4 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-2xl text-xs font-bold border border-rose-100 dark:border-rose-900/30 text-center animate-in shake duration-300">
                {error}
              </div>
            )}
            <FloatingInput 
              label="Email Address" 
              type="email" 
              required 
              value={email} 
              onChange={(e: any) => setEmail(e.target.value)} 
              disabled={isProcessing}
              animationDelay="0.1s"
            />
            <FloatingInput 
              label="Password" 
              type="password" 
              required 
              value={password} 
              onChange={(e: any) => setPassword(e.target.value)} 
              disabled={isProcessing}
              animationDelay="0.2s"
            />
            
            <div className="pt-2 relative group opacity-0 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              <div className={`absolute -inset-1 bg-indigo-500 rounded-2xl blur-lg transition duration-500 ${isProcessing ? 'opacity-10' : 'opacity-20 group-hover:opacity-40'}`}></div>
              <button 
                type="submit" 
                disabled={isProcessing}
                className={`relative w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-sm transition-all duration-500 transform active:scale-[0.98] flex items-center justify-center gap-3 overflow-hidden ${isProcessing ? 'cursor-not-allowed bg-indigo-700 shadow-inner' : 'hover:bg-indigo-700 shadow-xl shadow-indigo-200 dark:shadow-none'}`}
              >
                {isProcessing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-indigo-700/80 backdrop-blur-sm z-20 animate-in fade-in duration-500">
                    <div className="flex gap-1.5">
                      <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce"></div>
                    </div>
                  </div>
                )}
                <span className={`transition-all duration-500 ${isProcessing ? 'opacity-0 scale-90 blur-sm' : 'opacity-100'}`}>Sign in</span>
              </button>
            </div>
          </form>

          <div className={`text-center pt-2 transition-all duration-700 delay-300 transform opacity-0 animate-fade-in-up ${isProcessing ? 'opacity-0 -translate-y-2' : 'opacity-100 translate-y-0'}`} style={{ animationDelay: '0.4s' }}>
            <p className="text-slate-400 text-xs font-medium">
              Don't have an account? <Link to="/register" className={`text-indigo-600 dark:text-indigo-400 font-bold hover:underline transition-colors duration-300 ${isProcessing ? 'pointer-events-none' : ''}`}>Create account</Link>
            </p>
          </div>
        </div>
      </div>
      
      {/* High-end Success Iris Transition Overlay */}
      <div className={`fixed inset-0 bg-indigo-600 pointer-events-none z-[60] ${isSuccess ? 'animate-iris-in' : 'opacity-0'}`}>
        <div className="absolute inset-0 flex items-center justify-center">
          <ICONS.Logo className="w-24 h-24 text-white opacity-20 animate-pulse scale-[2.5]" />
        </div>
      </div>
    </div>
  );
};

export default Login;