import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Transaction, TransactionType, Category, Currency } from '../types.ts';
import { ICONS, formatCurrency } from '../constants.tsx';

interface DashboardProps {
  transactions: Transaction[];
  categories: Category[];
  currency: Currency;
  onAdd: (tx: any) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ transactions, categories, currency }) => {
  const navigate = useNavigate();

  const stats = useMemo(() => {
    const totalIncome = transactions
      .filter(t => t.type === TransactionType.INCOME)
      .reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = transactions
      .filter(t => t.type === TransactionType.EXPENSE)
      .reduce((sum, t) => sum + t.amount, 0);
    const balance = totalIncome - totalExpense;
    const efficiency = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;
    return { totalIncome, totalExpense, balance, efficiency };
  }, [transactions]);

  const recentTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
  }, [transactions]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 font-sans max-w-[1200px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 px-1">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Dashboard</h1>
          <p className="text-slate-400 dark:text-slate-500 text-sm font-medium mt-0.5">Financial health overview.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/transactions?action=smart')}
            className="group relative flex items-center gap-2.5 px-6 py-2.5 bg-indigo-600 text-white rounded-[16px] font-bold text-sm shadow-xl shadow-indigo-200/50 dark:shadow-none transition-all active:scale-95 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            <ICONS.AI className="w-5 h-5 transition-transform group-hover:scale-110" />
            Smart Entry
          </button>
          <button 
            onClick={() => navigate('/transactions?action=add')}
            className="group flex items-center gap-2.5 px-6 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-[16px] font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95 shadow-sm"
          >
            <ICONS.Plus className="w-5 h-5 text-indigo-600 transition-transform duration-500 group-hover:rotate-180" />
            Manual Entry
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5 lg:gap-6">
        <MetricCard 
          label="Net Balance" 
          value={stats.balance} 
          currency={currency} 
          colorClass="text-[#4338ca] dark:text-[#818cf8]" 
          bgDecoration="bg-indigo-600"
        />
        <MetricCard 
          label="Total Income" 
          value={stats.totalIncome} 
          currency={currency} 
          colorClass="text-[#10b981] dark:text-[#34d399]" 
          bgDecoration="bg-emerald-500"
        />
        <MetricCard 
          label="Total Expenses" 
          value={stats.totalExpense} 
          currency={currency} 
          colorClass="text-[#f43f5e] dark:text-[#fb7185]" 
          bgDecoration="bg-rose-500"
        />
        <MetricCard 
          label="Efficiency" 
          value={stats.efficiency} 
          isPercent 
          colorClass="text-[#6366f1] dark:text-[#a5b4fc]" 
          bgDecoration="bg-indigo-400"
        />
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[24px] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden mt-4">
        <div className="px-6 py-5 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Recent History</h2>
          <button onClick={() => navigate('/transactions')} className="text-[10px] font-black tracking-widest text-indigo-600 hover:text-indigo-700 transition-colors">Audit All</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
              {recentTransactions.map((t) => {
                const cat = categories.find(c => c.id === t.categoryId);
                const Icon = (ICONS as any)[cat?.icon || 'Other'] || ICONS.Other;
                return (
                  <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3.5">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105 ${t.type === TransactionType.INCOME ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/40' : 'bg-slate-100 text-slate-600 dark:bg-slate-800'}`}>
                          <Icon className="w-4.5 h-4.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-slate-900 dark:text-white truncate">{t.merchant || t.description}</div>
                          <div className="text-[9px] font-bold text-slate-400 tracking-wider">{cat?.name || 'Other'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className={`font-black text-sm ${t.type === TransactionType.INCOME ? 'text-emerald-500' : 'text-slate-900 dark:text-white'}`}>
                        {formatCurrency(t.amount, currency.code)}
                      </div>
                      <div className="text-[9px] font-bold text-slate-400 tracking-widest">{new Date(t.date).toLocaleDateString()}</div>
                    </td>
                  </tr>
                );
              })}
              {recentTransactions.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-6 py-12 text-center text-slate-400 font-bold italic text-sm">No recent activity detected.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ label, value, currency, isPercent, colorClass, bgDecoration }: any) => {
  const displayValue = isPercent ? `${value.toFixed(1)}%` : formatCurrency(value, currency?.code);

  return (
    <div className="p-6 md:p-7 bg-[#f8fafc]/50 dark:bg-slate-900/50 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-md hover:-translate-y-1 overflow-hidden relative group min-h-[130px] flex flex-col justify-center">
      <div className="relative z-10 flex flex-col gap-1">
        <p className="text-[11px] font-bold text-slate-400/80 tracking-tight">{label}</p>
        <h3 className={`text-lg md:text-xl font-black tracking-tight ${colorClass} truncate leading-tight`}>
          {displayValue}
        </h3>
      </div>
      
      <div className={`absolute -top-6 -right-6 w-24 h-24 ${bgDecoration} rounded-full blur-[35px] pointer-events-none opacity-[0.04] dark:opacity-[0.06]`}></div>
      <div className={`absolute -bottom-8 -right-4 w-18 h-18 ${bgDecoration} rounded-full blur-[25px] pointer-events-none opacity-[0.03] dark:opacity-[0.04]`}></div>
      <div className={`absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 w-12 h-12 ${bgDecoration} rounded-full blur-[20px] pointer-events-none opacity-[0.01] dark:opacity-[0.02]`}></div>
    </div>
  );
};

export default Dashboard;