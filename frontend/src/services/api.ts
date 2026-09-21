import type {
  Account,
  CreateAccountRequest,
  CreateTransactionRequest,
  TransactionResponse,
} from '../types/ledger';

const API_BASE = '/api/v1';

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

export async function fetchAllTransactions(): Promise<TransactionResponse[]> {
  const response = await fetch(`${API_BASE}/transactions`);
  if (!response.ok) {
    throw new Error(`Failed to load transactions (status ${response.status})`);
  }
  return response.json();
}