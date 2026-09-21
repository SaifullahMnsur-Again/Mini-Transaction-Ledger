import React, { useState, useEffect, useCallback } from 'react';
import type { TransactionResponse, EntryTypeMetadata } from '../types/ledger';
import { fetchAllTransactions, fetchEntryTypesMetadata } from '../services/api';
import { TransactionDetailModal } from './TransactionDetailModal';

export const TransactionsLogView: React.FC = () => {
  const [transactions, setTransactions] = useState<TransactionResponse[]>([]);
  const [entryTypes, setEntryTypes] = useState<EntryTypeMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [inspectedReferenceId, setInspectedReferenceId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [txData, typesData] = await Promise.all([
        fetchAllTransactions(),
        fetchEntryTypesMetadata(),
      ]);
      setTransactions(txData);
      setEntryTypes(typesData);
    } catch (err: any) {
      setError(err.message || 'Failed to load transaction logs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const debitMeta = entryTypes.find((e) => e.name.toLowerCase() === 'debit') || { id: 1, name: 'Debit' };
  const creditMeta = entryTypes.find((e) => e.name.toLowerCase() === 'credit') || { id: 2, name: 'Credit' };

  const filtered = transactions.filter(
    (tx) =>
      tx.referenceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.splits.some((s) => s.accountNumber.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Search & Actions Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">General Journal Log Book</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              High-level chronological journal. Click any transaction or reference ID to view the full audit breakdown.
            </p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Search reference, memo, account..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-64 bg-slate-50/50 focus:bg-white"
            />
            <button
              onClick={loadData}
              disabled={loading}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition cursor-pointer"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
          {error}
        </div>
      )}

      {/* Compact Master Journal Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">
            Loading general journal logs...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            No transactions found matching your criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-5 py-3.5">Reference ID</th>
                  <th className="px-5 py-3.5">Date (UTC)</th>
                  <th className="px-5 py-3.5">Description</th>
                  <th className="px-5 py-3.5">Accounts Involved</th>
                  <th className="px-5 py-3.5 text-right">Amount</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5 text-right">Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filtered.map((tx) => {
                  const debits = tx.splits.filter((s) => s.type === debitMeta.id);
                  const credits = tx.splits.filter((s) => s.type === creditMeta.id);

                  const totalDebit = debits.reduce((sum, s) => sum + s.amount, 0);
                  const totalCredit = credits.reduce((sum, s) => sum + s.amount, 0);
                  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.0001;

                  return (
                    <tr
                      key={tx.id}
                      onClick={() => setInspectedReferenceId(tx.referenceId)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                    >
                      {/* Reference Badge */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 font-mono font-bold text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-md group-hover:bg-indigo-600 group-hover:text-white transition">
                          {tx.referenceId}
                        </span>
                      </td>

                      {/* Timestamp */}
                      <td className="px-5 py-3.5 whitespace-nowrap font-mono text-slate-600 text-[11px]">
                        {new Date(tx.postedAtUtc).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      {/* Description */}
                      <td className="px-5 py-3.5 text-slate-900 font-semibold max-w-xs truncate">
                        {tx.description}
                      </td>

                      {/* Summary Route: Debit -> Credit */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-mono">
                          {/* Debit Accounts */}
                          <span className="text-emerald-700 font-bold">
                            {debits.map((d) => d.accountNumber).join(', ') || 'None'}
                          </span>
                          <span className="text-slate-400">→</span>
                          {/* Credit Accounts */}
                          <span className="text-amber-700 font-bold">
                            {credits.map((c) => c.accountNumber).join(', ') || 'None'}
                          </span>
                        </div>
                      </td>

                      {/* Total Amount */}
                      <td className="px-5 py-3.5 text-right font-mono font-bold text-slate-900 text-xs">
                        {totalDebit.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>

                      {/* Equilibrium Indicator */}
                      <td className="px-5 py-3.5 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            isBalanced
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {isBalanced ? 'Balanced' : 'Out of Balance'}
                        </span>
                      </td>

                      {/* Action Icon */}
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setInspectedReferenceId(tx.referenceId);
                          }}
                          className="text-xs font-semibold text-slate-500 hover:text-indigo-600 inline-flex items-center gap-1 cursor-pointer"
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

      {/* Audit Detail Modal */}
      <TransactionDetailModal
        identifier={inspectedReferenceId}
        entryTypes={entryTypes}
        onClose={() => setInspectedReferenceId(null)}
      />
    </div>
  );
};