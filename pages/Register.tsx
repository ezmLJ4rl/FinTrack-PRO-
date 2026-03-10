import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User } from '../types';
import { ICONS } from '../constants.tsx';

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch (e) {}
  }
  return 'id-' + Math.random().toString(36).substring(2, 15) + '-' + Date.now().toString(36);
};

const FloatingInput = ({ label, type, value, onChange, required }: any) => {
  const [focused, setFocused] = useState(false);
  const isFloating = focused || (value && value.length > 0);

  return (
    <div className="relative w-full group">
      <input
        type={type}
        required={required}
        value={value}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={onChange}
        className={`
          w-full px-4 py-4 bg-transparent
          border-2 border-slate-200 dark:border-slate-800 rounded-xl
          focus:border-indigo-500 dark:focus:border-indigo-400
          outline-none transition-all duration-200 font-medium text-slate-900 dark:text-white
        `}
      />
      <label
        className={`
          absolute left-3 transition-all duration-200 pointer-events-none px-1 font-medium
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

const Register: React.FC = () => {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) { setError("Passwords do not match."); return; }
    const usersStr = localStorage.getItem('users');
    const users: User[] = usersStr ? JSON.parse(usersStr) : [];
    if (users.find(u => u.email === formData.email)) { setError('Email already registered.'); return; }
    const newUser: User = { id: generateId(), name: formData.name, email: formData.email, password: formData.password, createdAt: new Date().toISOString() };
    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="h-1.5 w-full bg-indigo-600"></div>
        <div className="p-10 space-y-8">
          <div className="text-center">
            <div className="inline-flex w-16 h-16 bg-indigo-600 rounded-2xl items-center justify-center text-white mb-6 shadow-xl shadow-indigo-100 dark:shadow-none">
              <ICONS.Logo className="w-10 h-10" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">Join FinTrack Pro</h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm leading-relaxed max-w-[280px] mx-auto">
              Start your journey towards absolute financial intelligence today.
            </p>
          </div>
          <form onSubmit={handleRegister} className="space-y-6">
            {error && <div className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-2xl text-xs font-bold border border-rose-100 text-center">{error}</div>}
            <FloatingInput label="Full Name" type="text" required value={formData.name} onChange={(e: any) => setFormData({...formData, name: e.target.value})} />
            <FloatingInput label="Email Address" type="email" required value={formData.email} onChange={(e: any) => setFormData({...formData, email: e.target.value})} />
            <div className="grid grid-cols-2 gap-4">
              <FloatingInput label="Password" type="password" required value={formData.password} onChange={(e: any) => setFormData({...formData, password: e.target.value})} />
              <FloatingInput label="Confirm" type="password" required value={formData.confirmPassword} onChange={(e: any) => setFormData({...formData, confirmPassword: e.target.value})} />
            </div>
            <div className="pt-2 relative group">
              <div className="absolute -inset-1 bg-indigo-500 rounded-2xl blur-md opacity-25 group-hover:opacity-40 transition duration-300"></div>
              <button type="submit" className="relative w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-sm hover:bg-indigo-700 transition-all transform active:scale-[0.98]">
                Sign up
              </button>
            </div>
          </form>
          <div className="text-center pt-2">
            <p className="text-slate-400 text-xs font-medium">
              Already have an account? <Link to="/login" className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline">Log in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;