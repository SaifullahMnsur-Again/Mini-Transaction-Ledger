export const AccountType = {
  Asset: 1,
  Liability: 2,
  Equity: 3,
  Revenue: 4,
  Expense: 5,
} as const;

export type AccountType = (typeof AccountType)[keyof typeof AccountType];

export const AccountTypeLabels: Record<
  AccountType,
  { label: string; normalBalance: 'Debit' | 'Credit'; badgeColor: string }
> = {
  [AccountType.Asset]: {
    label: 'Asset',
    normalBalance: 'Debit',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  [AccountType.Liability]: {
    label: 'Liability',
    normalBalance: 'Credit',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  [AccountType.Equity]: {
    label: 'Equity',
    normalBalance: 'Credit',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  [AccountType.Revenue]: {
    label: 'Revenue',
    normalBalance: 'Credit',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  [AccountType.Expense]: {
    label: 'Expense',
    normalBalance: 'Debit',
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
  },
};

export const EntryType = {
  Debit: 1,
  Credit: 2,
} as const;

export type EntryType = (typeof EntryType)[keyof typeof EntryType];

export interface Account {
  id: string;
  accountNumber: string;
  name: string;
  type: AccountType;
  currency: string;
  currentBalance: number;
  createdAtUtc: string;
}

export interface CreateAccountRequest {
  accountNumber: string;
  name: string;
  type: AccountType;
  currency: string;
}

export interface LedgerSplitRequest {
  accountId: string;
  type: EntryType;
  amount: number;
}

export interface CreateTransactionRequest {
  description: string;
  splits: LedgerSplitRequest[];
}

export interface LedgerSplitResponse {
  accountId: string;
  accountNumber: string;
  accountName: string;
  type: EntryType;
  amount: number;
  runningBalanceAfter: number;
}

export interface TransactionResponse {
  id?: string;
  transactionId: string;
  description: string;
  postedAtUtc: string;
  splits: LedgerSplitResponse[];
}

export interface AccountTypeMetadata {
  id: number;
  name: string;
  normalBalance: string;
}

export interface EntryTypeMetadata {
  id: number;
  name: string;
  description: string;
}

export interface StatementEntry {
  transactionId: string;
  postedAtUtc: string;
  description: string;
  entryType: number;
  amount: number;
  runningBalanceAfter: number;
}

export interface AccountStatement {
  accountId: string;
  accountNumber: string;
  accountName: string;
  accountType: number;
  currency: string;
  openingBalance: number;
  closingBalance: number;
  totalDebit: number;
  totalCredit: number;
  fromUtc?: string;
  toUtc?: string;
  entries: StatementEntry[];
}