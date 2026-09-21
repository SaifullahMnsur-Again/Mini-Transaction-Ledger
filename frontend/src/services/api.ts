import type {
  Account,
  CreateAccountRequest,
  CreateTransactionRequest,
  TransactionResponse,
  AccountTypeMetadata,
  EntryTypeMetadata,
  AccountStatement,
} from '../types/ledger';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export async function fetchAccountTypesMetadata(): Promise<AccountTypeMetadata[]> {
  const response = await fetch(`${API_BASE}/metadata/account-types`);
  if (!response.ok) {
    throw new Error(`Failed to load account types metadata (${response.status})`);
  }
  return response.json();
}

export async function fetchEntryTypesMetadata(): Promise<EntryTypeMetadata[]> {
  const response = await fetch(`${API_BASE}/metadata/entry-types`);
  if (!response.ok) {
    throw new Error(`Failed to load entry types metadata (${response.status})`);
  }
  return response.json();
}

export async function fetchAccounts(): Promise<Account[]> {
  const response = await fetch(`${API_BASE}/accounts`);
  if (!response.ok) {
    throw new Error(`Failed to load accounts (${response.status})`);
  }
  return response.json();
}

export async function fetchAccountByNumber(accountNumber: string): Promise<Account> {
  const normalized = encodeURIComponent(accountNumber.trim().toUpperCase());
  const response = await fetch(`${API_BASE}/accounts/${normalized}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Account '${accountNumber}' not found`);
  }
  return response.json();
}

export async function createAccount(req: CreateAccountRequest): Promise<Account> {
  const response = await fetch(`${API_BASE}/accounts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(errorBody?.error || `Failed to create account (${response.status})`);
  }

  return response.json();
}

export async function fetchAllTransactions(): Promise<TransactionResponse[]> {
  const response = await fetch(`${API_BASE}/transactions`);
  if (!response.ok) {
    throw new Error(`Failed to load transactions (${response.status})`);
  }
  return response.json();
}

export async function fetchTransactionById(id: string): Promise<TransactionResponse> {
  const response = await fetch(`${API_BASE}/transactions/${id}`);
  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(errorBody?.error || `Failed to fetch transaction (${response.status})`);
  }
  return response.json();
}

export async function postTransaction(req: CreateTransactionRequest): Promise<TransactionResponse> {
  const response = await fetch(`${API_BASE}/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(errorBody?.error || `Failed to post transaction (${response.status})`);
  }

  return response.json();
}

export async function fetchAccountStatement(
  accountNumber: string,
  fromUtc?: string,
  toUtc?: string
): Promise<AccountStatement> {
  const normalized = encodeURIComponent(accountNumber.trim().toUpperCase());
  const params = new URLSearchParams();
  if (fromUtc) params.append('fromUtc', new Date(fromUtc).toISOString());
  if (toUtc) params.append('toUtc', new Date(toUtc).toISOString());

  const query = params.toString() ? `?${params.toString()}` : '';
  const response = await fetch(`${API_BASE}/accounts/${normalized}/statement${query}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to fetch statement for account '${accountNumber}'`);
  }
  return response.json();
}