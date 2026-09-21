import React, { useState, useEffect, useCallback } from 'react';
import { EntryType } from '../types/ledger';
import type {
  Account,
  CreateTransactionRequest,
  TransactionResponse,
  EntryTypeMetadata,
} from '../types/ledger';
import {
  fetchAllTransactions,
  fetchTransactionById,
  fetchEntryTypesMetadata,
  postTransaction,
} from '../services/api';
import { TransactionDetailModal } from './TransactionDetailModal';

interface JournalViewProps {
  accounts: Account[];
  onTransactionPosted: () => Promise<void>;
}

export const JournalView: React.FC<JournalViewProps> = ({ accounts, onTransactionPosted }) => {
  // Post Transaction Form State
  const [description, setDescription] = useState('');
  const [debitAccountId, setDebitAccountId] = useState(accounts[0]?.id || '');
  const [creditAccountId, setCreditAccountId] = useState(accounts[1]?.id || '');
  const [amount, setAmount] = useState<number | ''>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<TransactionResponse | null>(null);

  // Journal Log States
  const [transactions, setTransactions] = useState<TransactionResponse[]>([]);
  const [entryTypes, setEntryTypes] = useState<EntryTypeMetadata[]>([]);
  const [logLoading, setLogLoading] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);

  // Search State
  const [searchTxId, setSearchTxId] = useState('');
  const [searchedTransaction, setSearchedTransaction] = useState<TransactionResponse | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Modal State
  const [inspectedTxId, setInspectedTxId] = useState<string | null>(null);

  const numAmount = typeof amount === 'number' ? amount : 0;
  const isBalanced = numAmount > 0 && debitAccountId && creditAccountId && debitAccountId !== creditAccountId;

  // Reactively populate default accounts when accounts list loads
  useEffect(() => {
    if (accounts.length >= 2) {
      if (!debitAccountId) setDebitAccountId(accounts[0].id);
      if (!creditAccountId) setCreditAccountId(accounts[1].id);
    }
  }, [accounts, debitAccountId, creditAccountId]);

  const loadJournal = useCallback(async () => {
    setLogLoading(true);
    setLogError(null);
    try {
      const [txList, metaTypes] = await Promise.all([
        fetchAllTransactions(),
        fetchEntryTypesMetadata(),
      ]);
      setTransactions(Array.isArray(txList) ? txList : []);
      setEntryTypes(Array.isArray(metaTypes) ? metaTypes : []);
    } catch (err: any) {
      setLogError(err.message || 'Failed to load journal logs');
    } finally {
      setLogLoading(false);
    }
  }, []);

  useEffect(() => {
    loadJournal();
  }, [loadJournal]);

  const debitMeta = entryTypes?.find((e) => e.name?.toLowerCase() === 'debit') || { id: 1, name: 'Debit' };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessResult(null);

    if (!debitAccountId || !creditAccountId) {
      setError('Please select both a Debit account and a Credit account.');
      return;
    }

    if (debitAccountId === creditAccountId) {
      setError('Debit and Credit accounts must be distinct to prevent circular self-transfers.');
      return;
    }

    if (numAmount <= 0) {
      setError('Transfer amount must be strictly greater than zero.');
      return;
    }

    const payload: CreateTransactionRequest = {
      description: description.trim() || 'General Ledger Transfer',
      splits: [
        {
          accountId: debitAccountId,
          type: EntryType.Debit,
          amount: numAmount,
        },
        {
          accountId: creditAccountId,
          type: EntryType.Credit,
          amount: numAmount,
        },
      ],
    };

    setSubmitting(true);
    try {
      const response = await postTransaction(payload);
      setSuccessResult(response);
      setDescription('');
      setAmount('');
      await Promise.all([loadJournal(), onTransactionPosted()]);
    } catch (err: any) {
      setError(err.message || 'Transaction submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackendSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchTxId.trim();
    if (!query) return;

    setSearchLoading(true);
    setSearchError(null);
    setSearchedTransaction(null);

    try {
      const result = await fetchTransactionById(query);
      setSearchedTransaction(result);
    } catch (err: any) {
      setSearchError(err.message || `Transaction '${query}' was not found in the ledger database.`);
    } finally {
      setSearchLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Side-by-Side Post Double-Entry Journal Entry */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="mb-4">
          <h2 className="text-sm font-bold text-slate-900">Post Double-Entry Journal Entry</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Atomic transaction execution: ensures Total Debits equal Total Credits. A unique transaction ID is assigned upon commit.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Memo</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Cash Investment / Office Supplies Purchase"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-slate-50/80 p-4 rounded-xl border border-slate-200/80">
            {/* Debit Leg */}
            <div className="md:col-span-5">
              <label className="text-xs font-bold text-emerald-800 mb-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Debit Leg (Receiving Account)
              </label>
              <select
                value={debitAccountId}
                onChange={(e) => setDebitAccountId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-medium"
              >
                <option value="">Select Account</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.accountNumber} - {acc.name} (Bal: {acc.currentBalance.toFixed(2)} {acc.currency})
                  </option>
                ))}
              </select>
            </div>

            {/* Transfer Visual Indicator */}
            <div className="md:col-span-2 text-center flex flex-col items-center justify-center">
              <span className="text-xs font-mono font-bold text-slate-400">⇄</span>
              <span className="text-[10px] uppercase font-semibold text-slate-400">Equilibrium</span>
            </div>

            {/* Credit Leg */}
            <div className="md:col-span-5">
              <label className="text-xs font-bold text-amber-800 mb-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                Credit Leg (Giving Account)
              </label>
              <select
                value={creditAccountId}
                onChange={(e) => setCreditAccountId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white font-medium"
              >
                <option value="">Select Account</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.accountNumber} - {acc.name} (Bal: {acc.currentBalance.toFixed(2)} {acc.currency})
                  </option>
                ))}
              </select>
            </div>

            {/* Amount Input */}
            <div className="md:col-span-6">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Transfer Amount</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-bold"
              />
            </div>

            {/* Invariant Status Box */}
            <div className="md:col-span-6 flex items-end">
              <div
                className={`w-full px-3 py-2 rounded-lg text-xs font-medium border flex items-center justify-between ${
                  isBalanced
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-slate-100 border-slate-200 text-slate-500'
                }`}
              >
                <span>Validation Rule:</span>
                <span className="font-semibold">
                  {isBalanced ? 'Balanced: Dr == Cr (Δ 0.00)' : 'Select distinct accounts & positive amount'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={submitting || !isBalanced}
              className="h-9 px-5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-xs cursor-pointer"
            >
              {submitting ? 'Executing Ledger Write...' : 'Commit Transaction'}
            </button>
          </div>
        </form>
      </div>

      {/* Success Receipt Card */}
      {successResult && (
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-6 shadow-xs space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-emerald-900">Transaction Committed Successfully</h3>
            <span className="font-mono text-xs font-bold text-emerald-900 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-md">
              {successResult.transactionId}
            </span>
          </div>
          <p className="text-xs text-emerald-700">
            {successResult.description} • Posted at {new Date(successResult.postedAtUtc).toLocaleTimeString()}
          </p>

          <div className="overflow-x-auto bg-white rounded-lg border border-emerald-100 mt-2">
            <table className="min-w-full divide-y divide-emerald-100 text-left text-xs">
              <thead className="bg-emerald-50/50 text-emerald-900 font-semibold">
                <tr>
                  <th className="px-4 py-2">Account</th>
                  <th className="px-4 py-2">Leg Type</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                  <th className="px-4 py-2 text-right">Running Balance After</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-50 font-medium">
                {successResult.splits.map((s, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-2.5">
                      <span className="font-mono font-bold text-slate-800">{s.accountNumber}</span> - {s.accountName}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          s.type === EntryType.Debit
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {s.type === EntryType.Debit ? 'DEBIT' : 'CREDIT'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-800">
                      {s.amount.toFixed(2)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold text-indigo-700">
                      {s.runningBalanceAfter.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. General Ledger Journal Log Feed */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-200 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">General Ledger Journal Log</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Master audit trail. Query backend directly by Transaction ID (e.g. TX-XXXXXX).
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <form onSubmit={handleBackendSearch} className="flex gap-2 w-full sm:w-auto">
                <input
                  type="text"
                  value={searchTxId}
                  onChange={(e) => setSearchTxId(e.target.value)}
                  placeholder="Enter Transaction ID..."
                  className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono uppercase w-full sm:w-64 bg-white"
                />
                <button
                  type="submit"
                  disabled={searchLoading || !searchTxId.trim()}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition cursor-pointer shrink-0"
                >
                  {searchLoading ? 'Querying...' : 'Search'}
                </button>
              </form>

              <button
                type="button"
                onClick={loadJournal}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer shrink-0"
              >
                Refresh
              </button>
            </div>
          </div>

          {searchError && (
            <div className="mt-3 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {searchError}
            </div>
          )}

          {searchedTransaction && (
            <div className="mt-4 p-3.5 rounded-lg bg-white border border-indigo-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                    Query Result
                  </span>
                  <span className="font-mono font-bold text-xs text-slate-900">
                    {searchedTransaction.transactionId}
                  </span>
                  <span className="text-xs text-slate-600">
                    • {searchedTransaction.postedAtUtc ? new Date(searchedTransaction.postedAtUtc).toLocaleString() : ''}
                  </span>
                </div>
                <p className="text-xs text-slate-700 mt-1 font-medium">{searchedTransaction.description}</p>
                <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                  Record GUID: {searchedTransaction.id} • Splits: {searchedTransaction.splits?.length ?? 0}
                </p>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setInspectedTxId(searchedTransaction.transactionId)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition cursor-pointer flex items-center gap-1"
                >
                  <span>Inspect Audit Modal</span>
                  <span>↗</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSearchedTransaction(null);
                    setSearchTxId('');
                  }}
                  className="px-2 py-1.5 text-xs text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                  title="Clear result"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
        </div>

        {logLoading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading journal logs from backend...</div>
        ) : logError ? (
          <div className="p-8 text-center text-xs text-rose-600">{logError}</div>
        ) : transactions.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">No journal entries recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-6 py-3">Transaction ID</th>
                  <th className="px-6 py-3">Posted At (UTC)</th>
                  <th className="px-6 py-3">Description</th>
                  <th className="px-6 py-3">Debited Leg</th>
                  <th className="px-6 py-3">Credited Leg</th>
                  <th className="px-6 py-3 text-right">Amount</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {transactions.map((tx) => {
                  const splitsList = tx?.splits || [];
                  const debits = splitsList.filter((s) => s.type === debitMeta.id);
                  const credits = splitsList.filter((s) => s.type !== debitMeta.id);
                  const totalDebit = debits.reduce((acc, curr) => acc + (curr.amount || 0), 0);

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-3.5 font-mono font-bold text-indigo-600 whitespace-nowrap">
                        {tx.transactionId}
                      </td>
                      <td className="px-6 py-3.5 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                        {tx.postedAtUtc ? new Date(tx.postedAtUtc).toLocaleString() : '-'}
                      </td>
                      <td className="px-6 py-3.5 text-slate-800 font-semibold">{tx.description}</td>
                      <td className="px-6 py-3.5 text-slate-600 font-mono text-[11px]">
                        {debits.map((d) => d.accountNumber || d.accountId).join(', ') || '-'}
                      </td>
                      <td className="px-6 py-3.5 text-slate-600 font-mono text-[11px]">
                        {credits.map((c) => c.accountNumber || c.accountId).join(', ') || '-'}
                      </td>
                      <td className="px-6 py-3.5 text-right font-mono font-bold text-slate-900">
                        {totalDebit.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-6 py-3.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setInspectedTxId(tx.transactionId)}
                          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer inline-flex items-center gap-1"
                        >
                          Inspect ↗
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <TransactionDetailModal
        identifier={inspectedTxId}
        entryTypes={entryTypes}
        onClose={() => setInspectedTxId(null)}
      />
    </div>
  );
};