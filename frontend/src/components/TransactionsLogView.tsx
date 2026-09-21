import React, { useState, useEffect, useCallback } from 'react';
import { EntryType } from '../types/ledger';
import type { TransactionResponse } from '../types/ledger';
import { fetchAllTransactions } from '../services/api';

export const TransactionsLogView: React.FC = () => {
  const [transactions, setTransactions] = useState<TransactionResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAllTransactions();
      setTransactions(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load transaction logs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

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
              Comprehensive chronological log of all atomic double-entry transactions posted to the ledger.
            </p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Search reference, description, account..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-64"
            />
            <button
              onClick={loadTransactions}
              disabled={loading}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition cursor-pointer"
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

      {/* Transactions List */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200">
          Loading general journal logs...
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200">
          No transactions found matching your criteria.
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((tx) => {
            const totalDebit = tx.splits
              .filter((s) => s.type === EntryType.Debit)
              .reduce((sum, s) => sum + s.amount, 0);

            const totalCredit = tx.splits
              .filter((s) => s.type === EntryType.Credit)
              .reduce((sum, s) => sum + s.amount, 0);

            const isBalanced = Math.abs(totalDebit - totalCredit) < 0.0001;

            return (
              <div
                key={tx.id}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs hover:border-slate-300 transition"
              >
                {/* Entry Header */}
                <div className="px-5 py-3.5 bg-slate-50/70 border-b border-slate-200 flex flex-wrap justify-between items-center gap-2">
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 rounded-md bg-slate-900 text-white font-mono text-xs font-bold">
                      {tx.referenceId}
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{tx.description}</h4>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {new Date(tx.postedAtUtc).toLocaleString()} • ID: {tx.id.slice(0, 8)}...
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        isBalanced
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      {isBalanced ? 'Balanced Equilibrium' : 'Out of Balance'}
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-800 bg-white px-2.5 py-1 rounded border border-slate-200">
                      Total: {totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Ledger Splits Table */}
                <div className="p-4 overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
                    <thead>
                      <tr className="text-slate-500 font-semibold text-[11px] uppercase">
                        <th className="py-2 px-3">Account Code & Name</th>
                        <th className="py-2 px-3">Entry Type</th>
                        <th className="py-2 px-3 text-right">Debit</th>
                        <th className="py-2 px-3 text-right">Credit</th>
                        <th className="py-2 px-3 text-right">Post Running Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {tx.splits.map((s, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3">
                            <span className="font-mono font-bold text-slate-800">{s.accountNumber}</span> -{' '}
                            <span className="text-slate-600">{s.accountName}</span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                s.type === EntryType.Debit
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {s.type === EntryType.Debit ? 'DEBIT' : 'CREDIT'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                            {s.type === EntryType.Debit
                              ? s.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })
                              : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                            {s.type === EntryType.Credit
                              ? s.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })
                              : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-700">
                            {s.runningBalanceAfter.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};