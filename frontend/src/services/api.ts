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
    throw new Error(`Failed to load accounts (status ${response.status})`);
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
  accountId: string,
  fromUtc?: string,
  toUtc?: string
): Promise<AccountStatement> {
  const params = new URLSearchParams();
  if (fromUtc) {
    params.append('fromUtc', new Date(fromUtc).toISOString());
  }
  if (toUtc) {
    // Set to end of selected day if only date is passed
    const toDateObj = new Date(toUtc);
    toDateObj.setUTCHours(23, 59, 59, 999);
    params.append('toUtc', toDateObj.toISOString());
  }

  const queryString = params.toString() ? `?${params.toString()}` : '';
  const response = await fetch(`${API_BASE}/accounts/${accountId}/statement${queryString}`);

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(errorBody?.error || `Failed to fetch account statement (${response.status})`);
  }

  return response.json();
}