import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../types.ts';
import { ICONS, SUPPORTED_CURRENCIES } from '../constants.tsx';

interface CreateProfilePageProps {
  onProfileCreated: (user: User) => void;
}

const CreateProfilePage: React.FC<CreateProfilePageProps> = ({ onProfileCreated }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    currencyCode: 'USD',
    profileImage: ''
  });
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, profileImage: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.email || !formData.password) {
      setError('Please fill in all required credentials.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    const usersStr = localStorage.getItem('users');
    const users: User[] = usersStr ? JSON.parse(usersStr) : [];
    
    if (users.find(u => u.email.toLowerCase() === formData.email.toLowerCase())) {
      setError("This email address is already associated with another profile.");
      return;
    }

    const newProfile: User = {
      id: crypto.randomUUID(),
      name: formData.name,
      email: formData.email,
      password: formData.password,
      currencyCode: formData.currencyCode,
      profileImage: formData.profileImage,
      createdAt: new Date().toISOString()
    };

    users.push(newProfile);
    localStorage.setItem('users', JSON.stringify(users));
    onProfileCreated(newProfile);
    navigate('/');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 px-4 pb-20">
      <div className="flex items-center gap-5">
        <button 
          onClick={() => navigate(-1)} 
          className="p-3.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl text-slate-400 hover:text-indigo-600 transition-all shadow-sm active:scale-90"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Establish New Profile</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">Configure credentials and preferences for your new workspace.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-200 dark:border-slate-800 shadow-xl p-8 md:p-12 space-y-10">
        <div className="flex flex-col items-center gap-4">
          <div className="relative group">
            <div className="w-32 h-32 rounded-full bg-slate-50 dark:bg-slate-950 border-4 border-white dark:border-slate-800 shadow-2xl flex items-center justify-center overflow-hidden transition-transform group-hover:scale-105 duration-500">
              {formData.profileImage ? (
                <img src={formData.profileImage} className="w-full h-full object-cover" alt="Preview" />
              ) : (
                <ICONS.User className="w-14 h-14 text-slate-200 dark:text-slate-800" />
              )}
            </div>
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-1 right-1 p-2.5 bg-indigo-600 text-white rounded-2xl shadow-xl hover:bg-indigo-700 transition-all border-4 border-white dark:border-slate-900"
            >
              <ICONS.Camera className="w-4 h-4" />
            </button>
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
          </div>
          <div className="text-center">
            <span className="text-[10px] font-black tracking-[0.2em] text-slate-400">Identity Visual</span>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-2xl text-xs font-bold border border-rose-100 dark:border-rose-900/30 text-center animate-in shake duration-500">
            {error}
          </div>
        )}

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 ml-1 tracking-widest">Full Name</label>
              <input 
                type="text" 
                required
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm transition-all"
                placeholder="e.g. Personal Account"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 ml-1 tracking-widest">Email Address</label>
              <input 
                type="email" 
                required
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm transition-all"
                placeholder="new@fintrack.pro"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 ml-1 tracking-widest">Password</label>
              <input 
                type="password" 
                required
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm transition-all"
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 ml-1 tracking-widest">Confirm Password</label>
              <input 
                type="password" 
                required
                value={formData.confirmPassword}
                onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 ml-1 tracking-widest">Primary Currency</label>
          <div className="relative group">
            <select 
              value={formData.currencyCode}
              onChange={(e) => setFormData({...formData, currencyCode: e.target.value})}
              className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm appearance-none transition-all"
            >
              {SUPPORTED_CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
              ))}
            </select>
            <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
            </div>
          </div>
        </div>

        <div className="pt-4 space-y-4">
          <button 
            type="submit" 
            className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black text-xs tracking-widest shadow-2xl shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 hover:scale-[1.02] active:scale-95 transition-all"
          >
            Confirm & Establish Profile
          </button>
          <p className="text-center text-[10px] font-medium text-slate-400">
            By creating a profile, you agree to the local data storage policy.
          </p>
        </div>
      </form>
    </div>
  );
};

export default CreateProfilePage;