
export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE'
}

export interface Currency {
  code: string;
  symbol: string;
  name: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string; // Key in ICONS object
  type: TransactionType;
  isCustom: boolean;
}

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  categoryId: string;
  description: string;
  date: string;
  amount: number;
  merchant?: string;
  receiptImage?: string; // Base64 encoded image
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  currencyCode?: string; // Preferred currency code
  createdAt: string;
  profileImage?: string; // Base64 encoded image
  bio?: string;
}

export interface AppState {
  user: User | null;
  transactions: Transaction[];
  categories: Category[];
  theme: 'light' | 'dark';
}