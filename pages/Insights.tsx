
import OpenAI from 'openai';
import React, { useMemo, useRef, useState, useEffect } from 'react';
import { ICONS, formatCurrency } from '../constants.tsx';
import { Category, Transaction, TransactionType } from '../types.ts';
import { getDetailedFinancialInsight } from '../services/openaiService.ts';

interface Message {
  role: 'user' | 'assistant';
  text: string;
  timestamp: string; 
}

interface InsightsPageProps {
  transactions: Transaction[];
  categories: Category[];
  currency: Currency; // include currency info for chat
}

interface Currency {
  code: string;
  symbol: string;
}

const InsightsPage: React.FC<InsightsPageProps> = ({ transactions, categories, currency }) => {
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('fintrack_ai_chat_history');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  useEffect(() => {
    localStorage.setItem('fintrack_ai_chat_history', JSON.stringify(messages));
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    chatEndRef.current?.scrollIntoView({ behavior });
  };

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollButton(!isAtBottom);
  };

  const financialSummary = useMemo(() => {
    const totalIncome = transactions
      .filter(t => t.type === TransactionType.INCOME)
      .reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = transactions
      .filter(t => t.type === TransactionType.EXPENSE)
      .reduce((sum, t) => sum + t.amount, 0);
    
    const catBreakdown: Record<string, number> = {};
    transactions.filter(t => t.type === TransactionType.EXPENSE).forEach(t => {
      const cat = categories.find(c => c.id === t.categoryId);
      const name = cat?.name || 'Other';
      catBreakdown[name] = (catBreakdown[name] || 0) + t.amount;
    });

    const topCategoriesEntries = Object.entries(catBreakdown)
      .sort(([, a], [, b]) => b - a);

    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      primaryCategory: topCategoriesEntries[0]?.[0] || 'N/A',
      transactionCount: transactions.length
    };
  }, [transactions, categories]);

  const handleSendMessage = async (text: string) => {
    const msg = text || inputText;
    if (!msg.trim() || isTyping) return;
    
    const userMsg: Message = { role: 'user', text: msg, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    try {
      // load user-defined persona from localStorage (set in Settings)
      const persona = localStorage.getItem('ai_persona') || '';

      const modelText = await getDetailedFinancialInsight(
        msg,
        transactions,
        categories,
        currency,
        persona
      );
      
      const cleanText = (modelText || "Unable to process request.").replace(/\*\*?/g, '').replace(/#/g, '').trim();
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        text: cleanText, 
        timestamp: new Date().toISOString() 
      }]);
    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, { role: 'assistant', text: "Audit stream interrupted. Check your connection and try again.", timestamp: new Date().toISOString() }]);
    } finally {
      setIsTyping(false);
    }
  };

  const suggestions = [
    "Verify spending efficiency", 
    "Audit top expense categories", 
    "Savings optimization plan", 
    "Identify balance leaks",
    "Where is my money going?"
  ];

  return (
    <div className="flex flex-col h-full min-h-screen max-w-full mx-auto font-sans relative overflow-hidden bg-white dark:bg-slate-950">
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md z-30 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
            <ICONS.AI className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white leading-none">AI Strategy Hub</h1>
            <p className="text-[10px] font-bold text-slate-400 tracking-widest mt-1 uppercase">Skeptical Expert Auditor</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => { if(window.confirm("Purge audit history?")) setMessages([]); }}
            className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
          >
            <ICONS.Trash className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setShowPanel(!showPanel)}
            className={`p-2 rounded-xl transition-all ${showPanel ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30'}`}
          >
            <ICONS.Info className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-row overflow-hidden relative">
        <div 
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-4 md:px-0 py-8 custom-scrollbar relative flex flex-col items-center h-full"
        >
          <div className="w-full max-w-6xl space-y-10">
            {messages.length === 0 && (
              <div className="py-20 text-center animate-in fade-in duration-1000">
                <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                  <ICONS.Chat className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-400">Ready for audit.</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto mt-2">Analyze spending patterns or suggest a budget optimization plan.</p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div 
                key={i} 
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-4 duration-500`}
              >
                <div className={`
                  max-w-[90%] px-5 py-4 rounded-[26px] text-sm font-semibold leading-relaxed shadow-sm whitespace-pre-wrap
                  ${msg.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-tr-none' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none'}
                `}>
                  {msg.text}
                </div>
                <span className="mt-2 text-[9px] font-black text-slate-400 uppercase tracking-widest px-2 opacity-50">
                  {msg.role === 'user' ? 'Client' : 'Auditor'}
                </span>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex flex-col items-start animate-pulse">
                <div className="bg-slate-100 dark:bg-slate-800 px-5 py-4 rounded-[26px] rounded-tl-none flex gap-1.5 items-center">
                  <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} className="h-12" />
          </div>

          {showScrollButton && (
            <button 
              onClick={() => scrollToBottom()}
              className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 rounded-full shadow-xl animate-in zoom-in duration-300 z-20 text-indigo-600"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 14l-7 7-7-7" /></svg>
            </button>
          )}
        </div>

        <aside className={`
          absolute top-0 right-0 h-full w-full md:w-[320px] bg-white dark:bg-slate-900 border-l border-slate-100 dark:border-slate-800 z-40 transition-transform duration-[300ms] ease-in-out shadow-2xl md:shadow-none
          ${showPanel ? 'translate-x-0' : 'translate-x-full'}
        `}>
          <div className="flex flex-col h-full">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
              <h2 className="text-xs font-black tracking-widest text-slate-500 uppercase">Audit Intelligence</h2>
              <button onClick={() => setShowPanel(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
              <section>
                <h3 className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 tracking-[0.2em] uppercase mb-4 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div> Rapid Audit Triggers
                </h3>
                <div className="grid grid-cols-1 gap-2.5">
                  {suggestions.map((s, i) => (
                    <button 
                      key={i}
                      onClick={() => { handleSendMessage(s); setShowPanel(false); }}
                      className="text-left px-5 py-3.5 bg-slate-50 dark:bg-slate-800/50 hover:bg-indigo-600 hover:text-white border border-transparent rounded-2xl text-[10px] font-bold transition-all shadow-sm active:scale-95"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </section>

              <section className="p-5 bg-indigo-50 dark:bg-indigo-900/10 rounded-3xl border border-indigo-100 dark:border-indigo-800/50">
                <h4 className="text-[10px] font-black text-indigo-600 dark:text-indigo-300 uppercase mb-2">Expert Context</h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
                  AI is analyzing {financialSummary.transactionCount} data streams. Accuracy set to maximum verification mode.
                </p>
              </section>
            </div>
          </div>
        </aside>
      </div>

      <footer className="shrink-0 px-4 md:px-6 pb-4 pt-1 bg-white dark:bg-slate-950 z-30">
        <div className="max-w-6xl mx-auto flex gap-2.5 items-center relative group">
          <div className="relative flex-1">
            <textarea 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(inputText);
                }
              }}
              rows={1}
              placeholder="Submit audit query..."
              className="w-full px-5 py-2.5 bg-slate-100 dark:bg-slate-900 border-2 border-transparent focus:border-indigo-500 dark:focus:border-indigo-600 rounded-[22px] text-[13px] font-bold shadow-sm outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600 resize-none overflow-hidden"
              style={{ height: 'auto', minHeight: '44px' }}
            />
          </div>
          
          <button 
            onClick={() => handleSendMessage(inputText)}
            disabled={isTyping || !inputText.trim()}
            className="w-11 h-11 bg-indigo-600 text-white rounded-full flex items-center justify-center hover:bg-indigo-700 transition-all active:scale-90 disabled:opacity-50 shadow-xl shrink-0"
            aria-label="Send Message"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </footer>

      {showPanel && (
        <div 
          onClick={() => setShowPanel(false)}
          className="fixed inset-0 bg-slate-950/20 backdrop-blur-sm z-30 md:hidden animate-in fade-in duration-300"
        />
      )}
    </div>
  );
};

export default InsightsPage;
