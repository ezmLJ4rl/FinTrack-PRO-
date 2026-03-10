
import React, { useMemo, useState } from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend 
} from 'recharts';
import { Transaction, TransactionType, Category, Currency } from '../types.ts';
import { formatCurrency } from '../constants.tsx';

interface StatisticsPageProps {
  transactions: Transaction[];
  categories: Category[];
  currency: Currency;
}

const COLORS = ['#6366f1', '#10b981', '#f43f5e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#475569'];

const StatisticsPage: React.FC<StatisticsPageProps> = ({ transactions, categories, currency }) => {
  const [pieType, setPieType] = useState<TransactionType>(TransactionType.EXPENSE);

  const pieData = useMemo(() => {
    const filtered = transactions.filter(t => t.type === pieType);
    const categoryTotals: Record<string, number> = {};
    
    filtered.forEach(t => {
      const category = categories.find(c => c.id === t.categoryId);
      const categoryName = category?.name || 'Unknown';
      categoryTotals[categoryName] = (categoryTotals[categoryName] || 0) + t.amount;
    });

    return Object.entries(categoryTotals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [transactions, categories, pieType]);

  const totalValue = useMemo(() => pieData.reduce((sum, item) => sum + item.value, 0), [pieData]);

  const monthlyData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();
    const data = months.map(month => ({ name: month, income: 0, expense: 0 }));

    transactions.forEach(t => {
      const date = new Date(t.date);
      if (date.getFullYear() === currentYear) {
        const monthIndex = date.getMonth();
        if (t.type === TransactionType.INCOME) {
          data[monthIndex].income += t.amount;
        } else {
          data[monthIndex].expense += t.amount;
        }
      }
    });

    return data;
  }, [transactions]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">Statistics</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1.5 font-medium">Deep dive into your spending and earning habits.</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-full">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Distribution</h3>
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
              <button 
                onClick={() => setPieType(TransactionType.EXPENSE)}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${pieType === TransactionType.EXPENSE ? 'bg-white dark:bg-slate-700 shadow-sm text-rose-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Expenses
              </button>
              <button 
                onClick={() => setPieType(TransactionType.INCOME)}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${pieType === TransactionType.INCOME ? 'bg-white dark:bg-slate-700 shadow-sm text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Income
              </button>
            </div>
          </div>
          
          {pieData.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center flex-1">
              <div className="h-64 md:h-80 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      data={pieData} 
                      cx="50%" 
                      cy="50%" 
                      innerRadius={70} 
                      outerRadius={100} 
                      paddingAngle={4} 
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value, currency.code)}
                      contentStyle={{ 
                        borderRadius: '16px', 
                        border: 'none', 
                        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', 
                        backgroundColor: '#1e293b', 
                        color: '#fff',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }} 
                      itemStyle={{ color: '#fff' }} 
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total</span>
                  <span className="text-lg font-black text-slate-900 dark:text-white">{formatCurrency(totalValue, currency.code)}</span>
                </div>
              </div>

              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {pieData.map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-3 h-3 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      ></div>
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate max-w-[120px]">
                        {item.name}
                      </span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-xs font-black text-slate-900 dark:text-white">
                        {((item.value / totalValue) * 100).toFixed(1)}%
                      </span>
                      <span className="text-[10px] font-medium text-slate-400">
                        {formatCurrency(item.value, currency.code)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center space-y-4 py-20">
              <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800/50 rounded-2xl flex items-center justify-center text-slate-300">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 022 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              </div>
              <p className="text-slate-400 font-bold italic text-sm">No data stream available for this segment.</p>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-8">Annual Performance</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 'bold' }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 'bold' }} 
                  tickFormatter={(val) => `${currency.symbol}${val >= 1000 ? (val/1000).toFixed(0) + 'k' : val}`} 
                />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value, currency.code)}
                  cursor={{ fill: 'rgba(99, 102, 241, 0.05)', radius: 8 }} 
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: 'none', 
                    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }} 
                />
                <Legend 
                  iconType="circle" 
                  verticalAlign="top" 
                  align="right" 
                  wrapperStyle={{ paddingBottom: '20px', fontSize: '12px', fontWeight: 'bold' }} 
                />
                <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="expense" name="Expense" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatisticsPage;
