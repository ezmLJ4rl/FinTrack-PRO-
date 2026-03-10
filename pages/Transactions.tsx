import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Transaction, TransactionType, Category, Currency } from '../types.ts';
import { ICONS, formatCurrency, guessIconForCategory, CATEGORY_ICON_OPTIONS } from '../constants.tsx';
import { parseReceipt, parseNaturalLanguageTransaction } from '../services/openaiService.ts';

interface TransactionsPageProps {
  transactions: Transaction[];
  categories: Category[];
  currency: Currency;
  onAdd: (tx: Omit<Transaction, 'id' | 'userId' | 'categoryId'> & { categoryName: string, categoryIcon?: string }) => boolean;
  onEdit: (id: string, tx: Omit<Transaction, 'id' | 'userId' | 'categoryId'> & { categoryName: string, categoryIcon?: string }) => boolean;
  onDelete: (id: string) => void;
}

const suggestCategoryFromHistory = (
  text: string,
  type: TransactionType,
  transactions: Transaction[],
  categories: Category[]
): { name: string, icon: string } | null => {
  if (!text || !text.trim()) return null;
  const normalizedInput = text.toLowerCase().trim();
  
  const matchingTx = transactions.filter(t => {
    if (t.type !== type) return false;
    const m = t.merchant?.toLowerCase() || '';
    const d = t.description?.toLowerCase() || '';
    return m === normalizedInput || 
           d === normalizedInput ||
           (m && (normalizedInput.includes(m) || m.includes(normalizedInput))) ||
           (d && (normalizedInput.includes(d) || d.includes(normalizedInput)));
  });

  if (matchingTx.length === 0) return null;

  const counts: Record<string, number> = {};
  matchingTx.forEach(t => {
    counts[t.categoryId] = (counts[t.categoryId] || 0) + 1;
  });

  const sortedCatIds = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const bestCatId = sortedCatIds[0][0];
  const cat = categories.find(c => c.id === bestCatId);
  return cat ? { name: cat.name, icon: cat.icon } : null;
};

const TransactionsPage: React.FC<TransactionsPageProps> = ({ transactions, categories, currency, onAdd, onEdit, onDelete }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSmartModalOpen, setIsSmartModalOpen] = useState(false);
  const [smartStep, setSmartStep] = useState<'input' | 'processing' | 'review'>('input');
  const [isProcessing, setIsProcessing] = useState(false);
  const [smartInput, setSmartInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [groundingSources, setGroundingSources] = useState<any[]>([]);
  
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'All' | TransactionType>('All');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    type: TransactionType.EXPENSE,
    amount: '',
    categoryName: '',
    categoryIcon: 'Other',
    description: '',
    date: new Date().toISOString().split('T')[0],
    merchant: '',
    receiptImage: '',
  });

  const [reviewData, setReviewData] = useState({
    type: TransactionType.EXPENSE,
    amount: '',
    categoryName: '',
    categoryIcon: 'Other',
    description: '',
    date: new Date().toISOString().split('T')[0],
    merchant: '',
    receiptImage: '',
    exchangeRateUsed: '',
    originalAmount: '',
    originalCurrency: '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const manualReceiptInputRef = useRef<HTMLInputElement>(null);
  
  const totalBalance = useMemo(() => {
    return transactions.reduce((acc, t) => 
      t.type === TransactionType.INCOME ? acc + t.amount : acc - t.amount, 0);
  }, [transactions]);

  useEffect(() => {
    const cleanName = formData.categoryName.trim();
    if (!cleanName) return;
    const existing = categories.find(c => c.name.toLowerCase() === cleanName.toLowerCase() && c.type === formData.type);
    if (existing) {
      setFormData(prev => ({ ...prev, categoryIcon: existing.icon }));
    } else {
      setFormData(prev => ({ ...prev, categoryIcon: guessIconForCategory(cleanName) }));
    }
  }, [formData.categoryName, formData.type, categories]);

  useEffect(() => {
    const cleanName = reviewData.categoryName.trim();
    if (!cleanName) return;
    const existing = categories.find(c => c.name.toLowerCase() === cleanName.toLowerCase() && c.type === reviewData.type);
    if (existing) {
      setReviewData(prev => ({ ...prev, categoryIcon: existing.icon }));
    } else {
      setReviewData(prev => ({ ...prev, categoryIcon: guessIconForCategory(cleanName) }));
    }
  }, [reviewData.categoryName, reviewData.type, categories]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const action = params.get('action');
    if (action === 'smart') {
      setIsSmartModalOpen(true);
      setSmartStep('input');
      setFormError(null);
      setGroundingSources([]);
      navigate('/transactions', { replace: true });
    } else if (action === 'add') {
      setEditingId(null);
      setIsModalOpen(true);
      setFormError(null);
      navigate('/transactions', { replace: true });
    }
  }, [location, navigate]);

  const categorySuggestions = useMemo(() => 
    categories.filter(c => c.type === (smartStep === 'review' ? reviewData.type : formData.type)).map(c => c.name),
    [categories, formData.type, reviewData.type, smartStep]
  );

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const cat = categories.find(c => c.id === t.categoryId);
      const matchesSearch = 
        searchQuery === '' || 
        t.merchant?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cat?.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === 'All' || t.type === filterType;
      const matchesCategory = filterCategory === 'All' || t.categoryId === filterCategory;
      const matchesStartDate = !startDate || t.date >= startDate;
      const matchesEndDate = !endDate || t.date <= endDate;
      return matchesSearch && matchesType && matchesCategory && matchesStartDate && matchesEndDate;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, searchQuery, filterType, filterCategory, startDate, endDate, categories]);

  const handleManualMerchantBlur = () => {
    if (!formData.categoryName || formData.categoryName === 'Other Expenses') {
      const suggested = suggestCategoryFromHistory(formData.merchant, formData.type, transactions, categories);
      if (suggested) {
        setFormData(prev => ({ ...prev, categoryName: suggested.name, categoryIcon: suggested.icon }));
      }
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formData.amount || !formData.categoryName || !formData.date) return;
    const amountNum = parseFloat(formData.amount);
    if (formData.type === TransactionType.EXPENSE) {
      let availableBalance = totalBalance;
      if (editingId) {
        const oldTx = transactions.find(t => t.id === editingId);
        if (oldTx) availableBalance += (oldTx.type === TransactionType.EXPENSE ? oldTx.amount : -oldTx.amount);
      }
      if (amountNum > availableBalance) {
        setFormError(`Insufficient Balance! Your available balance is ${formatCurrency(availableBalance, currency.code)}.`);
        return;
      }
    }
    const payload = {
      type: formData.type,
      amount: amountNum,
      categoryName: formData.categoryName,
      categoryIcon: formData.categoryIcon,
      description: formData.description || formData.merchant,
      date: formData.date,
      merchant: formData.merchant,
      receiptImage: formData.receiptImage,
    };
    const success = editingId ? onEdit(editingId, payload) : onAdd(payload);
    if (success) {
      setIsModalOpen(false);
      setEditingId(null);
      setFormError(null);
      setFormData({
        type: TransactionType.EXPENSE,
        amount: '',
        categoryName: '',
        categoryIcon: 'Other',
        description: '',
        date: new Date().toISOString().split('T')[0],
        merchant: '',
        receiptImage: '',
      });
    } else {
      setFormError("Operation failed. Please check your inputs.");
    }
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!reviewData.amount) return;
    const amountNum = parseFloat(reviewData.amount);
    if (reviewData.type === TransactionType.EXPENSE && amountNum > totalBalance) {
      setFormError(`Insufficient Balance! Your total balance is ${formatCurrency(totalBalance, currency.code)}.`);
      return;
    }
    const success = onAdd({
      type: reviewData.type,
      amount: amountNum,
      categoryName: reviewData.categoryName,
      categoryIcon: reviewData.categoryIcon,
      description: reviewData.description,
      date: reviewData.date,
      merchant: reviewData.merchant,
      receiptImage: reviewData.receiptImage,
    });
    if (success) {
      setIsSmartModalOpen(false);
      setSmartStep('input');
      setSmartInput('');
      setFormError(null);
      setGroundingSources([]);
    } else {
      setFormError("Operation failed. Insufficient funds or invalid data.");
    }
  };

  const handleEditClick = (t: Transaction) => {
    const cat = categories.find(c => c.id === t.categoryId);
    setEditingId(t.id);
    setFormError(null);
    setFormData({
      type: t.type,
      amount: t.amount.toString(),
      categoryName: cat?.name || '',
      categoryIcon: cat?.icon || 'Other',
      description: t.description,
      date: t.date,
      merchant: t.merchant || '',
      receiptImage: t.receiptImage || '',
    });
    setIsModalOpen(true);
  };

  const startVoiceCapture = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.start();
    setIsRecording(true);
    recognition.onresult = (event: any) => {
      setSmartInput(event.results[0][0].transcript);
      setIsRecording(false);
    };
    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);
  };

  const handleSmartSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smartInput.trim() || isProcessing) return;
    setIsProcessing(true);
    setSmartStep('processing');
    setFormError(null);
    setGroundingSources([]);
    try {
      const { data: result, grounding } = await parseNaturalLanguageTransaction(smartInput, categories.map(c => c.name), currency.code);
      
      const type = result.type?.toUpperCase() === 'INCOME' ? TransactionType.INCOME : TransactionType.EXPENSE;
      
      const historyMatch = suggestCategoryFromHistory(result.merchant || result.description, type, transactions, categories);
      const catName = historyMatch?.name || result.category || 'Other Expenses';
      const catIcon = historyMatch?.icon || result.categoryIcon || guessIconForCategory(catName);
      
      if (grounding) setGroundingSources(grounding);

      setReviewData({
        type: type,
        amount: result.amount?.toString() || '0',
        categoryName: catName,
        categoryIcon: catIcon,
        description: result.description || smartInput,
        date: result.date || new Date().toISOString().split('T')[0],
        merchant: result.merchant || '',
        receiptImage: '',
        exchangeRateUsed: result.exchangeRateUsed || '',
        originalAmount: result.originalAmount?.toString() || '',
        originalCurrency: result.originalCurrency || '',
      });
      setSmartStep('review');
    } catch (err) {
      console.error("Smart Entry Error Details:", err);
      setSmartStep('input');
      setFormError("AI analysis failed. Please ensure your prompt is clear or try manual entry.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    setSmartStep('processing');
    setFormError(null);
    setGroundingSources([]);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        try {
          const { data: result, grounding } = await parseReceipt(base64, categories.map(c => c.name), currency.code);
          const type = TransactionType.EXPENSE;
          const historyMatch = suggestCategoryFromHistory(result.merchant || result.description, type, transactions, categories);
          const catName = historyMatch?.name || result.category || 'Other Expenses';
          const catIcon = historyMatch?.icon || result.categoryIcon || guessIconForCategory(catName);

          if (grounding) setGroundingSources(grounding);

          setReviewData({
            type: type,
            amount: result.amount?.toString() || '0',
            categoryName: catName,
            categoryIcon: catIcon,
            description: result.description || 'Receipt Scan',
            date: result.date || new Date().toISOString().split('T')[0],
            merchant: result.merchant || '',
            receiptImage: base64,
            exchangeRateUsed: result.exchangeRateUsed || '',
            originalAmount: result.originalAmount?.toString() || '',
            originalCurrency: result.originalCurrency || '',
          });
          setSmartStep('review');
        } catch (innerErr) {
          console.error("Receipt Analysis Inner Error:", innerErr);
          setSmartStep('input');
          setFormError("Receipt analysis failed. Please try again with a clearer photo.");
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("File Upload Error:", error);
      setSmartStep('input');
      setFormError("File upload failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({ ...prev, receiptImage: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const onReviewMerchantBlur = useCallback(() => {
    const suggested = suggestCategoryFromHistory(reviewData.merchant, reviewData.type, transactions, categories);
    if (suggested && (!reviewData.categoryName || reviewData.categoryName === 'Other Expenses')) {
      setReviewData(prev => ({ ...prev, categoryName: suggested.name, categoryIcon: suggested.icon }));
    }
  }, [reviewData.merchant, reviewData.type, transactions, categories, reviewData.categoryName]);

  const SelectedFormDataIcon = (ICONS as any)[formData.categoryIcon] || ICONS.Other;
  const SelectedReviewDataIcon = (ICONS as any)[reviewData.categoryIcon] || ICONS.Other;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 font-sans text-slate-900 dark:text-slate-100 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">Transactions</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">Audit and manage your data stream.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => { setIsSmartModalOpen(true); setSmartStep('input'); setFormError(null); setGroundingSources([]); }} 
            className="flex items-center px-6 py-4 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg hover:bg-indigo-700 transition-all active:scale-95 group leading-tight"
          >
            <ICONS.AI className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" />
            <div className="text-left">Smart<br/>Entry</div>
          </button>
          <button 
            onClick={() => { setEditingId(null); setIsModalOpen(true); setFormError(null); }} 
            className="flex items-center px-6 py-4 bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95 group leading-tight shadow-sm"
          >
            <ICONS.Plus className="w-5 h-5 mr-3 group-hover:rotate-90 transition-transform" />
            <div className="text-left">Add<br/>Manual</div>
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-6 flex items-center gap-4 border-b border-slate-100 dark:border-slate-800">
          <div className="relative flex-1">
            <ICONS.Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by merchant, category, or amount..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-slate-400"
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`p-3 rounded-2xl border transition-all ${showFilters ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50'}`}
          >
            <ICONS.Filter className="w-5 h-5" />
          </button>
        </div>

        {showFilters && (
          <div className="px-6 py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 border-b border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-2">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 ml-1 tracking-widest">Type</label>
              <select value={filterType} onChange={(e) => setFilterType(e.target.value as any)} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-bold">
                <option value="All">All Types</option>
                <option value={TransactionType.EXPENSE}>Expenses</option>
                <option value={TransactionType.INCOME}>Income</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 ml-1 tracking-widest">Category</label>
              <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-bold">
                <option value="All">All Categories</option>
                {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 ml-1 tracking-widest">Start</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-bold" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 ml-1 tracking-widest">End</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-bold" />
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/30 text-[11px] font-bold text-slate-400 border-b border-slate-100 dark:border-slate-800">
                <th className="px-8 py-4">Date</th>
                <th className="px-8 py-4">Description</th>
                <th className="px-8 py-4">Category</th>
                <th className="px-8 py-4 text-center">Receipt</th>
                <th className="px-8 py-4 text-right">Amount</th>
                <th className="px-8 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredTransactions.length > 0 ? filteredTransactions.map((t) => {
                const category = categories.find(c => c.id === t.categoryId);
                const Icon = category ? (ICONS as any)[category.icon] || ICONS.Other : ICONS.Other;
                return (
                  <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="px-8 py-6 text-xs font-bold text-slate-400">{new Date(t.date).toLocaleDateString()}</td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-slate-900 dark:text-slate-100">{t.merchant || t.description}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${t.type === TransactionType.INCOME ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}><Icon className="w-4 h-4" /></div>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{category?.name || 'Other'}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <div className="flex justify-center items-center h-full">
                        {t.receiptImage ? (
                          <button 
                            onClick={() => setViewingReceipt(t.receiptImage || null)}
                            className="relative w-10 h-10 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm transition-all hover:scale-105 active:scale-95 group/receipt"
                            aria-label="View Receipt"
                          >
                            <img src={t.receiptImage} className="w-full h-full object-cover" alt="Receipt Preview" />
                            <div className="absolute inset-0 bg-indigo-600/20 opacity-0 group-hover/receipt:opacity-100 transition-opacity flex items-center justify-center">
                              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            </div>
                          </button>
                        ) : (
                          <span className="text-lg font-bold text-slate-300 dark:text-slate-700 tracking-widest select-none">—</span>
                        )}
                      </div>
                    </td>
                    <td className={`px-8 py-6 text-right font-black ${t.type === TransactionType.INCOME ? 'text-emerald-500' : 'text-rose-500'}`}>
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] tracking-widest opacity-80 leading-tight">
                          {t.type === TransactionType.INCOME ? '+' : '-'}{currency.symbol}
                        </span>
                        <span className="text-base leading-tight">
                          {Math.abs(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleEditClick(t)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg"><ICONS.Edit className="w-5 h-5" /></button>
                        <button onClick={() => onDelete(t.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg"><ICONS.Trash className="w-5 h-5" /></button>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr><td colSpan={6} className="px-8 py-20 text-center text-slate-400 font-bold italic">No Data Streams Found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/20 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm sm:max-w-md rounded-[20px] sm:rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in duration-200">
            <div className="px-4 sm:px-8 pt-4 sm:pt-8">
              <div className="flex p-1 bg-slate-50 dark:bg-slate-950 rounded-[16px] sm:rounded-[20px] shadow-inner">
                <button 
                  type="button" 
                  onClick={() => { setFormData({...formData, type: TransactionType.EXPENSE}); setFormError(null); }} 
                  className={`flex-1 py-2 sm:py-3 text-xs sm:text-sm font-semibold rounded-[12px] sm:rounded-[16px] transition-all duration-300 ${formData.type === TransactionType.EXPENSE ? 'bg-white dark:bg-slate-800 text-rose-500 shadow-[0_4px_12px_rgba(0,0,0,0.05)]' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Expense
                </button>
                <button 
                  type="button" 
                  onClick={() => { setFormData({...formData, type: TransactionType.INCOME}); setFormError(null); }} 
                  className={`flex-1 py-2 sm:py-3 text-xs sm:text-sm font-semibold rounded-[12px] sm:rounded-[16px] transition-all duration-300 ${formData.type === TransactionType.INCOME ? 'bg-white dark:bg-slate-800 text-emerald-500 shadow-[0_4px_12px_rgba(0,0,0,0.05)]' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Income
                </button>
              </div>
            </div>

            <form onSubmit={handleManualSubmit} className="p-4 sm:p-8 space-y-6 sm:space-y-8 max-h-[85vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-2">
                <label className="text-[12px] font-medium text-slate-400 ml-1">Amount</label>
                <div className="relative group">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base font-bold text-slate-300 group-focus-within:text-indigo-400 transition-colors">{currency.symbol}</span>
                  <input 
                    type="number" 
                    step="0.01" 
                    required 
                    autoFocus
                    value={formData.amount} 
                    onChange={e => { setFormData({...formData, amount: e.target.value}); setFormError(null); }} 
                    placeholder="0.00"
                    className="w-full pl-10 pr-6 py-3 bg-slate-50/50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 rounded-2xl text-lg font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all placeholder:text-slate-200 dark:placeholder:text-slate-800" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[12px] font-medium text-slate-400 ml-1">Date</label>
                <div className="relative">
                  <ICONS.Dashboard className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 pointer-events-none" />
                  <input 
                    type="date" 
                    required 
                    value={formData.date} 
                    onChange={e => setFormData({...formData, date: e.target.value})} 
                    className="w-full pl-14 pr-6 py-4 bg-slate-50/50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[12px] font-medium text-slate-400 ml-1">Category</label>
                <div className="flex items-center gap-4 bg-slate-50/50 dark:bg-slate-950/50 p-2 border border-slate-100 dark:border-slate-800 rounded-2xl focus-within:ring-2 focus-within:ring-indigo-500 transition-all">
                  <div className="w-11 h-11 bg-white dark:bg-slate-900 rounded-[14px] flex items-center justify-center text-indigo-500 shadow-sm border border-slate-100 dark:border-slate-800 flex-shrink-0">
                    <SelectedFormDataIcon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <input 
                      list="cat-list" 
                      required 
                      value={formData.categoryName} 
                      onChange={e => setFormData({...formData, categoryName: e.target.value})} 
                      placeholder="Select category..."
                      className="w-full bg-transparent border-none py-2 text-sm font-medium outline-none" 
                    />
                    <datalist id="cat-list">{categorySuggestions.map(n => <option key={n} value={n} />)}</datalist>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[12px] font-medium text-slate-400 ml-1">Description</label>
                <input 
                  type="text" 
                  value={formData.merchant} 
                  onBlur={handleManualMerchantBlur} 
                  onChange={e => setFormData({...formData, merchant: e.target.value})} 
                  placeholder="e.g. Weekly groceries"
                  className="w-full px-6 py-4 bg-slate-50/50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                />
              </div>

              <div className="space-y-2">
                <label className="text-[12px] font-medium text-slate-400 ml-1">Receipt Image</label>
                <div className="flex items-center gap-4">
                  {formData.receiptImage ? (
                    <div className="relative group">
                      <img src={formData.receiptImage} className="w-20 h-20 object-cover rounded-xl border border-slate-200" />
                      <button 
                        type="button" 
                        onClick={() => setFormData(prev => ({ ...prev, receiptImage: '' }))}
                        className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1 shadow-lg hover:bg-rose-600 transition-all"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ) : (
                    <button 
                      type="button" 
                      onClick={() => manualReceiptInputRef.current?.click()}
                      className="flex-1 px-6 py-4 bg-slate-50/50 dark:bg-slate-950/50 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-400 hover:text-indigo-600 transition-all flex items-center justify-center gap-2"
                    >
                      <ICONS.Camera className="w-4 h-4" /> Capture Receipt
                    </button>
                  )}
                  <input 
                    type="file" 
                    ref={manualReceiptInputRef} 
                    onChange={handleManualReceiptUpload} 
                    className="hidden" 
                    accept="image/*" 
                    capture="environment"
                  />
                </div>
              </div>

              {formError && <div className="p-4 bg-rose-50 dark:bg-rose-900/10 text-rose-600 dark:text-rose-400 rounded-2xl text-[12px] font-semibold border border-rose-100 dark:border-rose-900/30">{formError}</div>}

              <div className="flex gap-4 pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-4 text-slate-500 font-semibold text-sm hover:text-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className={`flex-[2] py-4 ${formData.type === TransactionType.INCOME ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-indigo-600 hover:bg-indigo-700'} text-white rounded-2xl font-semibold text-sm shadow-xl transition-all active:scale-[0.98]`}
                >
                  {editingId ? 'Update Record' : 'Commit Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isSmartModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/20 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[20px] sm:rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in duration-300">
            <div className="px-4 sm:px-8 py-4 sm:py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/30 dark:bg-slate-950/30">
              <h2 className="text-[11px] sm:text-[12px] font-semibold text-slate-500 tracking-widest">{smartStep === 'input' ? 'Intelligence Analysis' : smartStep === 'processing' ? 'Processing...' : 'Review Suggestion'}</h2>
              <button onClick={() => setIsSmartModalOpen(false)} className="w-7 sm:w-8 h-7 sm:h-8 flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all text-lg sm:text-xl font-light">&times;</button>
            </div>
            
            {smartStep === 'input' && (
              <form onSubmit={handleSmartSubmit} className="p-4 sm:p-8 space-y-4 sm:space-y-6">
                <div className="relative">
                  <textarea 
                    rows={4} 
                    value={smartInput} 
                    onChange={(e) => setSmartInput(e.target.value)} 
                    placeholder="Describe your transaction... e.g. 'Coffee at Starbucks $5 today'" 
                    className="w-full bg-slate-50/50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 rounded-lg sm:rounded-2xl p-3 sm:p-6 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none resize-none transition-all" 
                  />
                  <div className="absolute bottom-3 sm:bottom-4 right-3 sm:right-4 flex gap-2">
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 sm:p-3 bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl text-slate-400 hover:text-indigo-600 transition-all shadow-sm active:scale-90"><ICONS.Camera className="w-4 sm:w-5 h-4 sm:h-5" /></button>
                    <button type="button" onClick={startVoiceCapture} className={`p-2 sm:p-3 rounded-lg sm:rounded-xl transition-all shadow-sm active:scale-90 ${isRecording ? 'bg-rose-100 text-rose-600' : 'bg-white dark:bg-slate-800 text-slate-400 hover:text-indigo-600'}`}><ICONS.Mic className="w-4 sm:w-5 h-4 sm:h-5" /></button>
                  </div>
                </div>
                {formError && <div className="p-3 sm:p-4 bg-rose-50 dark:bg-rose-900/10 text-rose-600 dark:text-rose-400 rounded-lg sm:rounded-xl text-xs font-semibold border border-rose-100">{formError}</div>}
                <button type="submit" disabled={isProcessing} className="w-full py-3 sm:py-4 bg-indigo-600 text-white rounded-lg sm:rounded-2xl font-semibold text-xs sm:text-sm shadow-xl hover:bg-indigo-700 transition-all disabled:opacity-50">Launch Intelligence</button>
              </form>
            )}

            {smartStep === 'processing' && (
              <div className="p-12 sm:p-20 flex flex-col items-center justify-center space-y-6">
                <div className="w-14 sm:w-16 h-14 sm:h-16 border-4 border-slate-100 dark:border-slate-800 border-t-indigo-600 rounded-full animate-spin"></div>
                <p className="font-semibold text-slate-900 dark:text-white tracking-widest text-[9px] sm:text-[10px]">AI Pattern Matching...</p>
              </div>
            )}

            {smartStep === 'review' && (
              <form onSubmit={handleReviewSubmit} className="p-4 sm:p-8 space-y-4 sm:space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
                {reviewData.receiptImage && (
                  <div className="flex justify-center">
                    <img src={reviewData.receiptImage} className="w-32 h-32 object-cover rounded-2xl shadow-lg border-2 border-slate-100" alt="Scanned Receipt" />
                  </div>
                )}

                {reviewData.exchangeRateUsed && (
                  <div className="p-4 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-800/30 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">Exchange Conversion</div>
                      <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {reviewData.originalAmount} {reviewData.originalCurrency} &rarr; {currency.code}
                      </div>
                    </div>
                    <div className="text-[10px] font-black bg-emerald-600 text-white px-3 py-1.5 rounded-full shadow-sm">
                      {reviewData.exchangeRateUsed}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[12px] font-medium text-slate-400 ml-1">Amount ({currency.code})</label>
                    <input type="number" step="0.01" required value={reviewData.amount} onChange={e => { setReviewData({...reviewData, amount: e.target.value}); setFormError(null); }} className="w-full px-5 py-3 bg-slate-50/50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 rounded-2xl text-lg font-medium outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[12px] font-medium text-slate-400 ml-1">Date</label>
                    <input type="date" required value={reviewData.date} onChange={e => setReviewData({...reviewData, date: e.target.value})} className="w-full px-5 py-3 bg-slate-50/50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 rounded-2xl text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[12px] font-medium text-slate-400 ml-1">Entity Source</label>
                  <input type="text" value={reviewData.merchant} onBlur={onReviewMerchantBlur} onChange={e => setReviewData({...reviewData, merchant: e.target.value})} className="w-full px-5 py-4 bg-slate-50/50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="space-y-1">
                  <label className="text-[12px] font-medium text-slate-400 ml-1">Predicted Allocation</label>
                  <div className="flex items-center gap-4 bg-slate-50/50 dark:bg-slate-950/50 p-2 border border-slate-100 dark:border-slate-800 rounded-2xl focus-within:ring-2 focus-within:ring-indigo-500 transition-all">
                    <div className="w-11 h-11 bg-white dark:bg-slate-900 rounded-[14px] flex items-center justify-center text-indigo-500 shadow-sm border border-slate-100 dark:border-slate-800 flex-shrink-0">
                      <SelectedReviewDataIcon className="w-5 h-5" />
                    </div>
                    <input 
                      list="rev-cat-list" 
                      required 
                      value={reviewData.categoryName} 
                      onChange={e => setReviewData({...reviewData, categoryName: e.target.value})} 
                      className="flex-1 bg-transparent border-none py-2 text-sm font-medium outline-none" 
                    />
                    <datalist id="rev-cat-list">{categorySuggestions.map(n => <option key={n} value={n} />)}</datalist>
                  </div>
                </div>

                {groundingSources.length > 0 && (
                  <div className="p-4 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100 dark:border-indigo-800/30 space-y-3">
                    <div className="flex items-center gap-2">
                      <ICONS.Search className="w-3.5 h-3.5 text-indigo-500" />
                      <span className="text-[10px] font-black tracking-widest text-indigo-600 dark:text-indigo-400 uppercase">Verification Sources</span>
                    </div>
                    <div className="space-y-2">
                      {groundingSources.map((chunk, idx) => chunk.web && (
                        <a 
                          key={idx} 
                          href={chunk.web.uri} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors underline decoration-indigo-200"
                        >
                          Source: {chunk.web.title || chunk.web.uri}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {formError && <div className="p-4 bg-rose-50 dark:bg-rose-900/10 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-semibold border border-rose-100">{formError}</div>}
                <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-semibold text-sm shadow-xl hover:bg-indigo-700 transition-all">Confirm Intelligence</button>
              </form>
            )}
          </div>
        </div>
      )}

      {viewingReceipt && (
        <div 
          className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex flex-col items-center justify-center p-4 md:p-10 animate-in fade-in duration-300"
          onClick={() => setViewingReceipt(null)}
        >
          <button 
            className="absolute top-8 right-8 w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-all z-[110]"
            onClick={() => setViewingReceipt(null)}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          
          <div 
            className="relative max-w-4xl w-full h-full flex items-center justify-center animate-in zoom-in-95 duration-500"
            onClick={e => e.stopPropagation()}
          >
            <img 
              src={viewingReceipt} 
              className="max-w-full max-h-full object-contain rounded-2xl shadow-[0_0_100px_rgba(0,0,0,0.5)] border border-white/10" 
              alt="Receipt Lightbox"
            />
          </div>
          
          <div className="absolute bottom-10 px-8 py-3 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl text-white/50 text-[10px] font-black tracking-[0.2em] pointer-events-none">
            Tactical Receipt Audit
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionsPage;