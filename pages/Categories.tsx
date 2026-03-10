
import React, { useState } from 'react';
import { Category, TransactionType } from '../types.ts';
import { ICONS, CATEGORY_ICON_OPTIONS } from '../constants.tsx';

interface CategoriesPageProps {
  categories: Category[];
  onManage: (category: Category, action: 'add' | 'update' | 'delete') => void;
}

const CategoriesPage: React.FC<CategoriesPageProps> = ({ categories, onManage }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    icon: 'Other',
    type: TransactionType.EXPENSE
  });

  const resetForm = () => {
    setFormData({ name: '', icon: 'Other', type: TransactionType.EXPENSE });
    setEditingCategory(null);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({ name: category.name, icon: category.icon, type: category.type });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    if (editingCategory) {
      onManage({ ...editingCategory, ...formData }, 'update');
    } else {
      onManage({ id: '', ...formData, isCustom: true } as Category, 'add');
    }
    
    setIsModalOpen(false);
    resetForm();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Category management</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Customize your income and expense labels with distinct icons.</p>
        </div>
        <button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="flex items-center px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 dark:shadow-none"
        >
          <ICONS.Plus className="w-4 h-4 mr-2" />
          Add category
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <CategorySection 
          title="Expense categories" 
          type={TransactionType.EXPENSE} 
          categories={categories} 
          onEdit={handleEdit} 
          onDelete={(c) => onManage(c, 'delete')}
        />
        <CategorySection 
          title="Income categories" 
          type={TransactionType.INCOME} 
          categories={categories} 
          onEdit={handleEdit} 
          onDelete={(c) => onManage(c, 'delete')}
        />
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <h2 className="text-xl font-bold">{editingCategory ? 'Edit category' : 'New category'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500"><ICONS.Other className="w-6 h-6 rotate-90" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                  <button type="button" onClick={() => setFormData({...formData, type: TransactionType.EXPENSE})} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${formData.type === TransactionType.EXPENSE ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}>Expense</button>
                  <button type="button" onClick={() => setFormData({...formData, type: TransactionType.INCOME})} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${formData.type === TransactionType.INCOME ? 'bg-white dark:bg-slate-700 shadow-sm text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>Income</button>
                </div>
                
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">Category name</label>
                  <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g., Subscriptions" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500">Select icon</label>
                  <div className="grid grid-cols-5 gap-3 max-h-48 overflow-y-auto p-2 border border-slate-100 dark:border-slate-800 rounded-xl">
                    {CATEGORY_ICON_OPTIONS.map(iconKey => {
                      const Icon = (ICONS as any)[iconKey];
                      return (
                        <button
                          key={iconKey}
                          type="button"
                          onClick={() => setFormData({...formData, icon: iconKey})}
                          className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${formData.icon === iconKey ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400' : 'bg-white dark:bg-slate-800 border-transparent text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                        >
                          <Icon className="w-5 h-5 mb-1" />
                          <span className="text-[10px] truncate w-full text-center">{iconKey}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <button type="submit" className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none transform active:scale-95 transition-all">
                {editingCategory ? 'Save changes' : 'Create category'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const CategorySection = ({ title, type, categories, onEdit, onDelete }: any) => {
  const filtered = categories.filter((c: any) => c.type === type);
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-100 dark:border-slate-800">
        <h3 className="font-semibold text-slate-800 dark:text-slate-200">{title}</h3>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {filtered.map((c: any) => {
          const Icon = (ICONS as any)[c.icon] || ICONS.Other;
          return (
            <div key={c.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <div className="flex items-center gap-4">
                <div className={`p-2.5 rounded-xl ${type === TransactionType.INCOME ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30' : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30'}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-medium">{c.name}</div>
                  {!c.isCustom && <div className="text-[10px] font-bold text-slate-400">Standard</div>}
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => onEdit(c)} className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors">
                  <ICONS.Edit className="w-4 h-4" />
                </button>
                {c.isCustom && (
                  <button onClick={() => onDelete(c)} className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors">
                    <ICONS.Trash className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CategoriesPage;
