import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../types.ts';
import { ICONS } from '../constants.tsx';

interface ProfilesPageProps {
  currentUser: User;
  onSwitchProfile: (user: User) => void;
  onDeleteProfile: (userId: string) => void;
}

const ProfilesPage: React.FC<ProfilesPageProps> = ({ currentUser, onSwitchProfile, onDeleteProfile }) => {
  const navigate = useNavigate();
  
  const [allUsers, setAllUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('users');
    const users = saved ? JSON.parse(saved) : [];
    if (!users.find((u: User) => u.id === currentUser.id)) {
      users.push(currentUser);
      localStorage.setItem('users', JSON.stringify(users));
    }
    return users;
  });

  const handleSwitch = (user: User) => {
    if (user.id === currentUser.id) return;
    onSwitchProfile(user);
    navigate('/');
  };

  const handleDeleteProfile = (e: React.MouseEvent, userId: string) => {
    e.stopPropagation();
    
    if (userId === currentUser.id) {
      alert("The active profile cannot be removed. Switch to another profile first if you wish to delete this one.");
      return;
    }
    
    if (window.confirm("Permanently delete this profile and all its transaction history? This action is irreversible.")) {
      const updatedUsers = allUsers.filter(u => u.id !== userId);
      setAllUsers(updatedUsers);
      onDeleteProfile(userId);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in duration-500 pb-20 px-4 pt-8">
      <div className="text-center space-y-2">
        <h1 className="text-5xl font-black tracking-tight text-slate-900 dark:text-white">Profiles</h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium text-base">Manage and switch between your accounts.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch justify-items-center">
        {allUsers.map((user) => {
          const isActive = user.id === currentUser.id;
          return (
            <div
              key={user.id}
              onClick={() => handleSwitch(user)}
              className={`group relative w-full max-w-[280px] aspect-square p-8 rounded-[60px] border-2 transition-all cursor-pointer flex flex-col items-center justify-between text-center ${
                isActive
                  ? 'border-indigo-500 bg-white dark:bg-slate-900 shadow-[0_25px_50px_-12px_rgba(79,70,229,0.15)] ring-4 ring-indigo-500/5'
                  : 'border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/10 hover:border-slate-200 dark:hover:border-slate-700 hover:bg-white dark:hover:bg-slate-900'
              }`}
            >
              {!isActive && (
                <button
                  onClick={(e) => handleDeleteProfile(e, user.id)}
                  className="absolute top-8 right-8 p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-2xl transition-all z-20"
                  title="Delete Profile"
                >
                  <ICONS.Trash className="w-5 h-5" />
                </button>
              )}

              {isActive && (
                <div className="absolute top-8 right-8 text-indigo-500 bg-indigo-50 dark:bg-slate-800 p-1.5 rounded-full shadow-sm">
                  <ICONS.Check className="w-4 h-4 stroke-[4]" />
                </div>
              )}
              
              <div className="flex-1 flex flex-col items-center justify-center gap-6 w-full">
                <div className={`w-28 h-28 rounded-full border-2 flex items-center justify-center overflow-hidden transition-all shadow-sm ${
                  isActive ? 'border-indigo-400' : 'border-slate-100 dark:border-slate-800'
                }`}>
                  {user.profileImage ? (
                    <img src={user.profileImage} className="w-full h-full object-cover" alt={user.name} />
                  ) : (
                    <div className="w-full h-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-4xl font-black text-slate-200 dark:text-slate-600">
                      {user.name[0].toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="space-y-1 min-w-0 w-full">
                  <div className="text-2xl font-black text-slate-900 dark:text-white truncate px-2">
                    {user.name}
                  </div>
                  <div className="text-xs text-slate-400 font-bold tracking-wider truncate px-4">
                    {user.email}
                  </div>
                </div>
              </div>

              <div className="mt-4 shrink-0">
                {isActive ? (
                  <div className="px-8 py-3 bg-gradient-to-r from-indigo-500 to-indigo-700 text-white text-[11px] font-black tracking-[0.25em] rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-none animate-in zoom-in-95">
                    Active
                  </div>
                ) : (
                  <div className="px-8 py-3 text-slate-300 dark:text-slate-600 text-[11px] font-black tracking-[0.25em]">
                    Inactive
                  </div>
                )}
              </div>
            </div>
          );
        })}

        <button
          onClick={() => navigate('/profiles/new')}
          className="w-full max-w-[280px] aspect-square p-8 rounded-[60px] border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center gap-6 hover:border-indigo-400 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-all group"
        >
          <div className="w-20 h-20 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-300 group-hover:text-indigo-500 group-hover:bg-white dark:group-hover:bg-slate-700 transition-all shadow-sm">
            <ICONS.Plus className="w-10 h-10 stroke-[1.5]" />
          </div>
          <div className="space-y-1.5">
            <div className="text-lg font-black text-slate-400 group-hover:text-indigo-500 transition-colors">New Profile</div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold tracking-widest max-w-[150px] mx-auto leading-relaxed">Create a fresh workspace</p>
          </div>
        </button>
      </div>
    </div>
  );
};

export default ProfilesPage;