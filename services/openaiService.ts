import OpenAI from "openai";
import { CATEGORY_ICON_OPTIONS } from "../constants.tsx";

// Use OPENAI_API_KEY environment variable
const getAIInstance = () => new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY,
  dangerouslyAllowBrowser: true 
});

// Common exchange rates (approximately as of March 2026)
const EXCHANGE_RATES: Record<string, number> = {
  'USD': 1.0,
  'EUR': 0.92,
  'GBP': 0.79,
  'JPY': 149.50,
  'CHF': 0.88,
  'CAD': 1.36,
  'AUD': 1.53,
  'NZD': 1.68,
  'INR': 83.12,
  'CNY': 7.24,
  'ZAR': 18.50,
  'TZS': 2530.00,
  'KES': 155.00,
  'NGN': 1545.00,
  'GHS': 12.85,
  'EGP': 49.50
};

const getExchangeRate = (fromCurrency: string, toCurrency: string): string => {
  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();
  
  if (from === to) return "1.0";
  
  const fromRate = EXCHANGE_RATES[from] || 1.0;
  const toRate = EXCHANGE_RATES[to] || 1.0;
  
  const rate = toRate / fromRate;
  return rate.toFixed(2);
};
export const parseReceipt = async (base64Image: string, availableCategories: string[], targetCurrencyCode: string) => {
  const openai = getAIInstance();
  const today = new Date().toISOString().split('T')[0];
  
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a professional financial auditor. Analyze the provided receipt image and extract the requested data in JSON format. All amounts must be converted to the target currency with accurate exchange rates."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Reference date (Today) is ${today}. 
              Extract all data from receipt:
              1. merchant name
              2. total amount
              3. transaction date (YYYY-MM-DD format)
              4. best matching category from [${availableCategories.join(", ")}]
              5. category icon
              6. brief description
              
              Exchange Rate Conversion:
              1. Identify receipt currency (USD, EUR, GBP, TZS, etc.)
              2. Use accurate exchange rates: USD=1.0, EUR≈0.92, GBP≈0.79, TZS≈2530, etc.
              3. If currency != ${targetCurrencyCode}, convert: convertedAmount = amount × (targetRate / sourceRate)
              4. Always provide originalAmount (before conversion) and exchangeRateUsed
              
              Return JSON with EXACT structure:
              {
                "merchant": "company/store name",
                "amount": number (in ${targetCurrencyCode}),
                "date": "YYYY-MM-DD",
                "category": "string",
                "categoryIcon": "string",
                "description": "brief description",
                "originalCurrency": "ISO code (USD, EUR, etc)",
                "originalAmount": number,
                "exchangeRateUsed": "number as string (e.g. 2530.00)"
              }`
            },
            {
              type: "image_url",
              image_url: {
                url: base64Image.startsWith("data:") ? base64Image : `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content || "{}";
    let data = JSON.parse(content);
    
    // Post-processing: Ensure accurate currency conversion
    if (data.originalCurrency && data.originalCurrency !== targetCurrencyCode && data.originalAmount) {
      const rate = parseFloat(getExchangeRate(data.originalCurrency, targetCurrencyCode));
      data.amount = parseFloat((data.originalAmount * rate).toFixed(2));
      data.exchangeRateUsed = rate.toFixed(2);
    }

    return {
      data,
      grounding: null
    };
  } catch (error) {
    console.error("Receipt Parsing Error:", error);
    throw error;
  }
};

export const parseNaturalLanguageTransaction = async (prompt: string, availableCategories: string[], targetCurrencyCode: string) => {
  const openai = getAIInstance();
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const dayOfWeek = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(now);

  try {
    // Prepare exchange rate information
    const exchangeRateInfo = Object.entries(EXCHANGE_RATES)
      .slice(0, 10)
      .map(([code, rate]) => `${code}: ${(rate / EXCHANGE_RATES['USD']).toFixed(4)}`)
      .join(", ");

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a financial transaction parser. Extract transaction data from natural language and return valid JSON.

CRITICAL RULES:
1. type: Always "INCOME" or "EXPENSE"
2. amount: Must be positive number in ${targetCurrencyCode}
3. date: Exactly YYYY-MM-DD format. If only day/month given, assume current year ${now.getFullYear()}
4. category: Must be from provided list only
5. merchant: Company/person name or empty string
6. originalCurrency: Currency code like USD, EUR, TZS, etc.
7. exchangeRateUsed: The numeric rate used to convert originalAmount to amount
8. description: Brief summary of transaction

DATE PARSING:
- "today" or "now" = ${today}
- "1/3" = ${today.substring(0, 5)}-01 interpreted as Jan 3
- "01/03/2026" = 2026-03-01
- "3 Mar" = ${today.substring(0, 4)}-03-${now.getDate()}

AMOUNT PARSING:
- "500 USD to TZS" = originalAmount: 500, originalCurrency: USD, amount: calculated
- "5M" = 5,000,000
- "100k" = 100,000`
        },
        {
          role: "user",
          content: `Today is ${today} (${dayOfWeek}).
          
User Input: "${prompt}"

Available Categories: [${availableCategories.join(", ")}]
Target Currency Code: ${targetCurrencyCode}

Approximate Exchange Rates (per USD): ${exchangeRateInfo}

Return ONLY valid JSON (no markdown, no explanation):
{
  "type": "INCOME" or "EXPENSE",
  "merchant": "string or empty",
  "amount": number (in ${targetCurrencyCode}),
  "date": "YYYY-MM-DD",
  "category": "from provided list only",
  "categoryIcon": "string",
  "description": "string",
  "originalCurrency": "currency code like USD, TZS, etc",
  "originalAmount": number,
  "exchangeRateUsed": "number as string"
}`
        }
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content || "{}";
    let data = JSON.parse(content);
    
    // Post-processing: Ensure accurate currency conversion
    if (data.originalCurrency && data.originalCurrency !== targetCurrencyCode && data.originalAmount) {
      const rate = parseFloat(getExchangeRate(data.originalCurrency, targetCurrencyCode));
      data.amount = parseFloat((data.originalAmount * rate).toFixed(2));
      data.exchangeRateUsed = rate.toFixed(2);
    }
    
    // Validate and fix common issues
    if (!data.type) data.type = "EXPENSE";
    if (!data.amount || typeof data.amount !== 'number' || data.amount <= 0) data.amount = 0;
    if (!data.date || !isValidDate(data.date)) data.date = today;
    if (!data.category) data.category = "Other";
    if (!data.description) data.description = "Transaction";
    if (!data.merchant) data.merchant = "";
    if (!data.categoryIcon) data.categoryIcon = "Other";
    if (!data.originalCurrency) data.originalCurrency = targetCurrencyCode;
    if (!data.originalAmount) data.originalAmount = data.amount;
    if (!data.exchangeRateUsed) data.exchangeRateUsed = "1.0";

    return {
      data,
      grounding: null
    };
  } catch (error) {
    console.error("Natural Language Error:", error);
    // Return default structure on error to prevent crashes
    return {
      data: {
        type: "EXPENSE",
        merchant: "",
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        category: "Other",
        categoryIcon: "Other",
        description: "Could not parse: " + prompt.substring(0, 50),
        originalCurrency: targetCurrencyCode,
        originalAmount: 0,
        exchangeRateUsed: "1.0"
      },
      grounding: null
    };
  }
};

const isValidDate = (dateString: string): boolean => {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
};

export const getFinancialAdvice = async (transactions: any[], categories: any[]) => {
  const openai = getAIInstance();
  try {
    const dataSummary = transactions.map(t => ({
      amount: t.amount,
      type: t.type,
      category: categories.find(c => c.id === t.categoryId)?.name || 'Other'
    }));
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a professional auditor. Provide 3 specific audit findings and 3 action steps. No markdown."
        },
        {
          role: "user",
          content: `Audit this data: ${JSON.stringify(dataSummary.slice(0, 20))}`
        }
      ]
    });
    
    return response.choices[0].message.content || "System ready for audit.";
  } catch (error) {
    return "Audit system offline.";
  }
};

export const getDetailedFinancialInsight = async (userQuery: string, transactions: any[], categories: any[], currency: { code: string; symbol: string }, persona: string = ""): Promise<string> => {
  const openai = getAIInstance();
  try {
    // Build comprehensive transaction summary
    const transactionDetails = transactions.slice(0, 50).map(t => ({
      date: t.date,
      merchant: t.merchant,
      description: t.description,
      amount: t.amount,
      type: t.type,
      category: categories.find(c => c.id === t.categoryId)?.name || 'Other'
    }));

    const totalIncome = transactions
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalExpense = transactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0);

    const net = totalIncome - totalExpense;
    
    const expenseByCategory: Record<string, number> = {};
    transactions
      .filter(t => t.type === 'EXPENSE')
      .forEach(t => {
        const cat = categories.find(c => c.id === t.categoryId)?.name || 'Other';
        expenseByCategory[cat] = (expenseByCategory[cat] || 0) + t.amount;
      });

    const sortedExpenses = Object.entries(expenseByCategory)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    const topCategoriesStr = sortedExpenses.map(([cat, amt]) => `${cat} (${currency.symbol}${amt.toFixed(2)})`).join(", ") || "None";
    
    const basePrompt = `You are FinTrack AI, an expert financial analyst and auditor specializing in personal finance optimization.

User Financial Profile:
- Total Income: ${currency.symbol}${totalIncome.toFixed(2)}
- Total Expenses: ${currency.symbol}${totalExpense.toFixed(2)}
- Net Balance: ${currency.symbol}${net.toFixed(2)}
- Currency: ${currency.code}
- Top Expense Categories: ${topCategoriesStr}

Respond with:
1. OBSERVATION: Analyze the user's financial situation based on actual data
2. INSIGHT: Provide specific, actionable findings directly relevant to their transactions
3. RECOMMENDATION: Suggest concrete actions based on their spending patterns

Be specific with numbers and percentages. Reference actual merchant names and categories from their transaction history.`;
    const systemPrompt = persona ? `${persona}\n\n${basePrompt}` : basePrompt;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: `Based on my transaction history, ${userQuery}\n\nTransaction Details: ${JSON.stringify(transactionDetails)}`
        }
      ]
    });

    return response.choices[0].message.content || "Unable to analyze your financial data.";
  } catch (error) {
    console.error("Financial Insight Error:", error);
    throw error;
  }
};
