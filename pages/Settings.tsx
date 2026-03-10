import React, { useState, useRef } from 'react';
import { User } from '../types.ts';
import { SUPPORTED_CURRENCIES, ICONS } from '../constants.tsx';

interface SettingsPageProps {
  currentUser: User;
  onUpdateUser: (user: User) => void;
  onUpdateCurrency: (code: string) => void;
  onResetData: () => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ currentUser, onUpdateUser, onUpdateCurrency, onResetData }) => {
  const [formData, setFormData] = useState({
    name: currentUser.name,
    email: currentUser.email,
    bio: currentUser.bio || '',
    profileImage: currentUser.profileImage || ''
  });
  const [successMsg, setSuccessMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setFormData({ ...formData, profileImage: result });
        onUpdateUser({ ...currentUser, profileImage: result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedUser: User = {
      ...currentUser,
      name: formData.name,
      email: formData.email,
      bio: formData.bio,
      profileImage: formData.profileImage
    };
    onUpdateUser(updatedUser);
    setSuccessMsg('Profile settings updated successfully!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in duration-500 pb-20 px-4">
      <div>
        <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">Settings</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1.5 font-medium">Manage your identity and app configuration.</p>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-2xl text-xs font-bold border border-emerald-100 dark:border-emerald-800/50 flex items-center gap-3">
          <ICONS.Check className="w-5 h-5" />
          {successMsg}
        </div>
      )}

      <section className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-8">
          <div className="flex items-center gap-6 mb-8 pb-8 border-b border-slate-100 dark:border-slate-800">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-800 border-4 border-slate-50 dark:border-slate-950 shadow-inner flex items-center justify-center overflow-hidden">
                {formData.profileImage ? (
                  <img src={formData.profileImage} className="w-full h-full object-cover" />
                ) : (
                  <ICONS.User className="w-10 h-10 text-slate-300" />
                )}
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 p-2 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-all"
              >
                <ICONS.Camera className="w-4 h-4" />
              </button>
              <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Profile Identity</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Update how you appear in the terminal.</p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 ml-1 tracking-widest">Display Name</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 ml-1 tracking-widest">Email Address</label>
                <input 
                  type="email" 
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 ml-1 tracking-widest">Personal Bio</label>
              <textarea 
                rows={3}
                value={formData.bio}
                onChange={(e) => setFormData({...formData, bio: e.target.value})}
                placeholder="Write a short summary of your goals..."
                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm resize-none"
              />
            </div>
            <div className="flex justify-end">
              <button type="submit" className="px-8 py-3.5 bg-indigo-600 text-white rounded-2xl font-bold text-sm shadow-xl shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition-all active:scale-95">
                Save Profile Updates
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="space-y-6">
        <div className="px-1">
          <h2 className="text-2xl font-bold text-[#1e293b] dark:text-white">Currency Preference</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">Choose the primary currency for all your financial tracking.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {SUPPORTED_CURRENCIES.map((currency) => {
            const isSelected = (currentUser.currencyCode || 'USD') === currency.code;
            return (
              <button
                key={currency.code}
                onClick={() => onUpdateCurrency(currency.code)}
                className={`flex items-center justify-between p-7 rounded-[22px] border-2 transition-all relative overflow-hidden group active:scale-[0.98] ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/30 dark:bg-indigo-900/10 ring-1 ring-indigo-600/10'
                    : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-200 dark:hover:border-slate-700'
                }`}
              >
                <div className="relative z-10 text-left">
                  <div className={`text-[1.1rem] font-bold tracking-tight ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-[#1e293b] dark:text-white'}`}>
                    {currency.code}
                  </div>
                  <div className="text-[0.8rem] font-medium text-slate-400 dark:text-slate-500 mt-0.5">
                    {currency.name}
                  </div>
                </div>
                
                <div className={`relative z-10 text-3xl font-bold transition-all ${
                  isSelected 
                    ? 'text-indigo-600 dark:text-indigo-400' 
                    : 'text-slate-200 dark:text-slate-800'
                }`}>
                  {currency.symbol}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-6">
        <div className="px-1">
          <h2 className="text-2xl font-bold text-[#1e293b] dark:text-white">AI Chat Persona</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">Customize how the AI advisor responds. You can provide instructions, style preferences, or a personality description.</p>
        </div>
        <div className="space-y-1.5">
          <textarea
            rows={4}
            defaultValue={localStorage.getItem('ai_persona') || ''}
            onChange={(e) => localStorage.setItem('ai_persona', e.target.value)}
            placeholder="E.g. 'You are a friendly financial coach who speaks like a human, provides step-by-step advice, and always references user's past transactions.'"
            className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm resize-none"
          />
        </div>
      </section>

      <section className="bg-rose-50/50 dark:bg-rose-950/10 rounded-[32px] border border-dashed border-rose-200 dark:border-rose-900/30 p-8 mt-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h3 className="text-xl font-bold text-rose-600 dark:text-rose-400">Danger Zone</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Erase your footprint and start fresh.</p>
          </div>
          <button 
            onClick={onResetData}
            className="px-6 py-4 bg-white dark:bg-slate-950 text-rose-600 dark:text-rose-400 border-2 border-rose-100 dark:border-rose-900/50 rounded-2xl font-black text-xs tracking-widest hover:bg-rose-600 hover:text-white dark:hover:bg-rose-900 transition-all active:scale-95 shadow-sm"
          >
            Delete All Data
          </button>
        </div>
      </section>
    </div>
  );
};

export default SettingsPage;