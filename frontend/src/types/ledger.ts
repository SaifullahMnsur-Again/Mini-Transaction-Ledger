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