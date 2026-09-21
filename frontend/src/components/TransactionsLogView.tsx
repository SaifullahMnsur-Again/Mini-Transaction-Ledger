import React, { useState, useEffect, useCallback } from 'react';
import type { TransactionResponse, EntryTypeMetadata } from '../types/ledger';
import {
  fetchAllTransactions,
  fetchTransactionById,
  fetchEntryTypesMetadata,
} from '../services/api';
import { TransactionDetailModal } from './TransactionDetailModal';

export const TransactionsLogView: React.FC = () => {
  const [transactions, setTransactions] = useState<TransactionResponse[]>([]);
  const [entryTypes, setEntryTypes] = useState<EntryTypeMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dedicated Backend Search States
  const [searchTxId, setSearchTxId] = useState('');
  const [searchedTransaction, setSearchedTransaction] = useState<TransactionResponse | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Inspection Modal State
  const [inspectedTxId, setInspectedTxId] = useState<string | null>(null);

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [txList, metaTypes] = await Promise.all([
        fetchAllTransactions(),
        fetchEntryTypesMetadata(),
      ]);
      setTransactions(Array.isArray(txList) ? txList : []);
      setEntryTypes(Array.isArray(metaTypes) ? metaTypes : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load journal logs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Pure Backend Search: queries GET /api/v1/transactions/{transactionId} directly
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

  const handleClearSearch = () => {
    setSearchedTransaction(null);
    setSearchTxId('');
    setSearchError(null);
  };

  const debitMeta = entryTypes?.find((e) => e.name?.toLowerCase() === 'debit') || { id: 1, name: 'Debit' };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {/* Header with Server Query Form */}
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
                onClick={loadInitialData}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer shrink-0"
              >
                Refresh
              </button>
            </div>
          </div>

          {/* Search Error Message */}
          {searchError && (
            <div className="mt-3 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {searchError}
            </div>
          )}

          {/* Backend Search Result Banner */}
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
                <p className="text-xs text-slate-700 mt-1 font-medium">
                  {searchedTransaction.description}
                </p>
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
                  onClick={handleClearSearch}
                  className="px-2 py-1.5 text-xs text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                  title="Clear result"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Master Journal Entries Feed */}
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading journal logs from backend...</div>
        ) : error ? (
          <div className="p-8 text-center text-xs text-rose-600">{error}</div>
        ) : transactions.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No journal entries recorded yet.
          </div>
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
                  const splits = tx?.splits || [];
                  const debits = splits.filter((s) => s.type === debitMeta.id);
                  const credits = splits.filter((s) => s.type !== debitMeta.id);
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

      {/* Detail Inspection Modal */}
      <TransactionDetailModal
        identifier={inspectedTxId}
        entryTypes={entryTypes}
        onClose={() => setInspectedTxId(null)}
      />
    </div>
  );
};