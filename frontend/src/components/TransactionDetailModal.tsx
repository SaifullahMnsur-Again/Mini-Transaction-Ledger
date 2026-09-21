import React, { useEffect, useState } from 'react';
import type { TransactionResponse, EntryTypeMetadata } from '../types/ledger';
import { fetchTransactionById } from '../services/api';

interface TransactionDetailModalProps {
  identifier: string | null;
  entryTypes: EntryTypeMetadata[];
  onClose: () => void;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  identifier,
  entryTypes,
  onClose,
}) => {
  const [transaction, setTransaction] = useState<TransactionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!identifier) {
      setTransaction(null);
      return;
    }

    setLoading(true);
    setError(null);
    fetchTransactionById(identifier)
      .then((data) => setTransaction(data))
      .catch((err) => setError(err.message || 'Failed to fetch transaction details'))
      .finally(() => setLoading(false));
  }, [identifier]);

  if (!identifier) return null;

  const debitMeta = entryTypes.find((e) => e.name.toLowerCase() === 'debit') || { id: 1, name: 'Debit' };
  const creditMeta = entryTypes.find((e) => e.name.toLowerCase() === 'credit') || { id: 2, name: 'Credit' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Immutable Journal Entry Audit</h3>
            <p className="text-[11px] text-slate-500 font-mono mt-0.5">
              Record GUID: {transaction?.id ? transaction.id : identifier}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-lg font-bold px-2 py-0.5 rounded-lg hover:bg-slate-200 transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {loading ? (
            <div className="py-8 text-center text-xs text-slate-500">Loading audit log from ledger...</div>
          ) : error ? (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">{error}</div>
          ) : transaction ? (
            <>
              {/* Metadata Overview Card */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50/80 p-3 rounded-lg border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 text-[11px] block">Transaction ID</span>
                  <span className="font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded inline-block mt-0.5">
                    {transaction.transactionId}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Posted At (UTC)</span>
                  <span className="font-mono text-slate-700">
                    {new Date(transaction.postedAtUtc).toLocaleString()}
                  </span>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <span className="text-slate-400 text-[11px] block">Description / Memo</span>
                  <span className="text-slate-800 font-medium truncate block">
                    {transaction.description || 'N/A'}
                  </span>
                </div>
              </div>

              {/* Legs / Splits Breakdown Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold text-[11px] uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Account</th>
                      <th className="py-2.5 px-3">Leg</th>
                      <th className="py-2.5 px-3 text-right">Debit</th>
                      <th className="py-2.5 px-3 text-right">Credit</th>
                      <th className="py-2.5 px-3 text-right">Balance After</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {transaction.splits.map((s, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3">
                          <span className="font-mono font-bold text-slate-900">{s.accountNumber}</span>{' '}
                          <span className="text-slate-600">- {s.accountName}</span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              s.type === debitMeta.id
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {s.type === debitMeta.id ? 'DEBIT' : 'CREDIT'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                          {s.type === debitMeta.id ? s.amount.toFixed(2) : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                          {s.type === creditMeta.id ? s.amount.toFixed(2) : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-700">
                          {s.runningBalanceAfter.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 text-white hover:bg-slate-900 transition cursor-pointer"
          >
            Close Audit View
          </button>
        </div>
      </div>
    </div>
  );
};