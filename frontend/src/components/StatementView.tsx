import React, { useState, useEffect, useCallback } from 'react';
import type { Account, AccountStatement, EntryTypeMetadata, AccountTypeMetadata } from '../types/ledger';
import { fetchAccountStatement, fetchEntryTypesMetadata, fetchAccountTypesMetadata } from '../services/api';

interface StatementViewProps {
  accounts: Account[];
}

export const StatementView: React.FC<StatementViewProps> = ({ accounts }) => {
  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id || '');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [statement, setStatement] = useState<AccountStatement | null>(null);
  const [entryTypes, setEntryTypes] = useState<EntryTypeMetadata[]>([]);
  const [accountTypes, setAccountTypes] = useState<AccountTypeMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load dynamic metadata on mount
  useEffect(() => {
    Promise.all([fetchEntryTypesMetadata(), fetchAccountTypesMetadata()])
      .then(([entries, accs]) => {
        setEntryTypes(entries);
        setAccountTypes(accs);
      })
      .catch((err) => console.error('Failed to load metadata in statement view:', err));
  }, []);

  // Update selected account if accounts array updates and nothing is selected
  useEffect(() => {
    if (!selectedAccountId && accounts.length > 0) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, selectedAccountId]);

  const loadStatement = useCallback(async () => {
    if (!selectedAccountId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAccountStatement(
        selectedAccountId,
        fromDate ? fromDate : undefined,
        toDate ? toDate : undefined
      );
      setStatement(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load statement');
    } finally {
      setLoading(false);
    }
  }, [selectedAccountId, fromDate, toDate]);

  useEffect(() => {
    if (selectedAccountId) {
      loadStatement();
    }
  }, [selectedAccountId, loadStatement]);

  const debitMeta = entryTypes.find((e) => e.name.toLowerCase() === 'debit') || { id: 1, name: 'Debit' };
  const currentAccType = accountTypes.find((a) => a.id === statement?.accountType);

  return (
    <div className="space-y-6">
      {/* Account Selector & Date Range Filter */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Chronological Account Statement</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Audit trail extraction with historical opening balance, debit/credit turnover, and closing balance.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Target Account</label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.accountNumber} - {acc.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">From Date (Optional)</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">To Date (Optional)</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            />
          </div>

          <div>
            <button
              onClick={loadStatement}
              disabled={loading || !selectedAccountId}
              className="w-full h-9 inline-flex items-center justify-center px-4 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
            >
              {loading ? 'Querying...' : 'Filter Statement'}
            </button>
          </div>
        </div>
      </div>

      {/* Statement Results */}
      {statement && (
        <div className="space-y-6">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Opening Balance
              </span>
              <p className="text-lg font-bold font-mono text-slate-900 mt-1">
                {statement.openingBalance.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                <span className="text-xs font-normal text-slate-500">{statement.currency}</span>
              </p>
              <span className="text-[10px] text-slate-400">Prior to window start</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">
                Total Debits
              </span>
              <p className="text-lg font-bold font-mono text-emerald-600 mt-1">
                +{statement.totalDebit.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
              <span className="text-[10px] text-slate-400">Period debit turnover</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">
                Total Credits
              </span>
              <p className="text-lg font-bold font-mono text-amber-600 mt-1">
                -{statement.totalCredit.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
              <span className="text-[10px] text-slate-400">Period credit turnover</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wider">
                Closing Balance
              </span>
              <p className="text-lg font-bold font-mono text-indigo-900 mt-1">
                {statement.closingBalance.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                <span className="text-xs font-normal text-indigo-600">{statement.currency}</span>
              </p>
              <span className="text-[10px] text-slate-400">
                {currentAccType ? `${currentAccType.normalBalance}-Normal` : ''}
              </span>
            </div>
          </div>

          {/* Chronological Movements Table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Audit Trail: {statement.accountNumber} ({statement.accountName})
                </h3>
                <p className="text-xs text-slate-500">
                  Chronological split movements with post-transaction running balances
                </p>
              </div>
              <span className="text-xs font-mono text-slate-500">
                {statement.entries.length} {statement.entries.length === 1 ? 'record' : 'records'}
              </span>
            </div>

            {statement.entries.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No ledger activity recorded for this account within the selected time window.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-6 py-3">Timestamp (UTC)</th>
                      <th className="px-6 py-3">Reference ID</th>
                      <th className="px-6 py-3">Description</th>
                      <th className="px-6 py-3">Leg Type</th>
                      <th className="px-6 py-3 text-right">Amount</th>
                      <th className="px-6 py-3 text-right">Running Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {statement.entries.map((entry, idx) => {
                      const isDebit = entry.entryType === debitMeta.id;
                      return (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-3.5 text-slate-600 font-mono text-[11px]">
                            {new Date(entry.postedAtUtc).toLocaleString()}
                          </td>
                          <td className="px-6 py-3.5 font-mono font-bold text-slate-800">
                            {entry.referenceId}
                          </td>
                          <td className="px-6 py-3.5 text-slate-700">{entry.description}</td>
                          <td className="px-6 py-3.5">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isDebit
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {isDebit ? 'DEBIT' : 'CREDIT'}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 text-right font-mono font-bold text-slate-900">
                            {entry.amount.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                          <td className="px-6 py-3.5 text-right font-mono font-bold text-indigo-700 text-sm">
                            {entry.runningBalanceAfter.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};