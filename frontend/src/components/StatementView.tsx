import React, { useState, useEffect, useCallback } from 'react';
import type { Account, AccountStatement, EntryTypeMetadata } from '../types/ledger';
import { AccountTypeLabels } from '../types/ledger';
import {
  fetchAccountStatement,
  fetchAccountByNumber,
  fetchEntryTypesMetadata,
} from '../services/api';
import { TransactionDetailModal } from './TransactionDetailModal';

interface StatementViewProps {
  accounts: Account[];
  initialAccountNumber?: string;
}

export const StatementView: React.FC<StatementViewProps> = ({
  accounts,
  initialAccountNumber,
}) => {
  const [selectedAccountNumber, setSelectedAccountNumber] = useState<string>(
    initialAccountNumber || accounts[0]?.accountNumber || ''
  );
  const [liveAccount, setLiveAccount] = useState<Account | null>(null);
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [statement, setStatement] = useState<AccountStatement | null>(null);
  const [entryTypes, setEntryTypes] = useState<EntryTypeMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inspectedTransactionId, setInspectedTransactionId] = useState<string | null>(null);
  const [copiedUuid, setCopiedUuid] = useState(false);

  useEffect(() => {
    fetchEntryTypesMetadata()
      .then(setEntryTypes)
      .catch((err) => console.error('Failed to load entry types:', err));
  }, []);

  useEffect(() => {
    if (initialAccountNumber) {
      setSelectedAccountNumber(initialAccountNumber);
    } else if (!selectedAccountNumber && accounts.length > 0) {
      setSelectedAccountNumber(accounts[0].accountNumber);
    }
  }, [initialAccountNumber, accounts, selectedAccountNumber]);

  useEffect(() => {
    if (!selectedAccountNumber) {
      setLiveAccount(null);
      return;
    }
    fetchAccountByNumber(selectedAccountNumber)
      .then(setLiveAccount)
      .catch((err) => console.error('Failed to fetch live account info:', err));
  }, [selectedAccountNumber]);

  const loadStatement = useCallback(async () => {
    if (!selectedAccountNumber) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAccountStatement(
        selectedAccountNumber,
        fromDate || undefined,
        toDate || undefined
      );
      setStatement(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load statement');
    } finally {
      setLoading(false);
    }
  }, [selectedAccountNumber, fromDate, toDate]);

  useEffect(() => {
    if (selectedAccountNumber) {
      loadStatement();
    }
  }, [selectedAccountNumber, loadStatement]);

  const handleCopyUuid = async (uuid: string) => {
    try {
      await navigator.clipboard.writeText(uuid);
      setCopiedUuid(true);
      setTimeout(() => setCopiedUuid(false), 2000);
    } catch {
      setCopiedUuid(false);
    }
  };

  const debitMeta = entryTypes.find((e) => e.name.toLowerCase() === 'debit') || { id: 1, name: 'Debit' };

  const handleExportCsv = () => {
    if (!statement || statement.entries.length === 0) return;

    const headers = [
      'Timestamp (UTC)',
      'Transaction ID',
      'Description',
      'Leg Type',
      'Amount',
      'Running Balance After',
    ];

    const rows = statement.entries.map((e) => [
      new Date(e.postedAtUtc).toISOString(),
      `"${e.transactionId}"`,
      `"${e.description.replace(/"/g, '""')}"`,
      e.entryType === debitMeta.id ? 'DEBIT' : 'CREDIT',
      e.amount.toFixed(2),
      e.runningBalanceAfter.toFixed(2),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [
        `# Account Statement: ${statement.accountNumber} - ${statement.accountName}`,
        `# Account UUID: ${statement.accountId}`,
        `# Currency: ${statement.currency}`,
        `# Opening Balance: ${statement.openingBalance.toFixed(2)}`,
        `# Closing Balance: ${statement.closingBalance.toFixed(2)}`,
        headers.join(','),
        ...rows.map((r) => r.join(',')),
      ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Statement_${statement.accountNumber}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* 1. Account Filter & Controls Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Chronological Account Statement</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Historical ledger movements and running balances.
            </p>
          </div>

          {liveAccount && (
            <span className="text-[11px] font-mono px-2.5 py-1 bg-slate-100 rounded-md text-slate-700 border border-slate-200">
              Live Balance: <strong>{liveAccount.currentBalance.toFixed(2)} {liveAccount.currency}</strong>
            </span>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5 items-end">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Target Account</label>
            <select
              value={selectedAccountNumber}
              onChange={(e) => setSelectedAccountNumber(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-medium"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.accountNumber}>
                  {acc.accountNumber} — {acc.name}
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

          <div className="flex gap-2">
            <button
              onClick={loadStatement}
              disabled={loading || !selectedAccountNumber}
              className="flex-1 h-9 inline-flex items-center justify-center px-3 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition shadow-xs cursor-pointer"
            >
              {loading ? 'Querying...' : 'Filter'}
            </button>
            <button
              onClick={handleExportCsv}
              disabled={!statement || statement.entries.length === 0}
              className="h-9 inline-flex items-center justify-center px-3 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
              title="Download statement as CSV"
            >
              📥 CSV
            </button>
          </div>
        </div>
      </div>

      {statement && (
        <div className="space-y-6">
          {/* 2. High-Visibility Account Header Banner (Large Text) */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono font-extrabold text-2xl sm:text-3xl text-indigo-700 tracking-tight">
                  {statement.accountNumber}
                </span>
                <span className="text-slate-300 text-xl font-light hidden sm:inline">|</span>
                <span className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  {statement.accountName}
                </span>
                <span
                  className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                    AccountTypeLabels[statement.accountType]?.badgeColor || ''
                  }`}
                >
                  {AccountTypeLabels[statement.accountType]?.label || 'Account'}
                </span>
              </div>

              {/* Underlying Database Surrogate UUID & Quick Copy */}
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs font-mono text-slate-500">
                  Record UUID: <span className="font-semibold text-slate-800">{statement.accountId}</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyUuid(statement.accountId)}
                  className="px-2.5 py-0.5 text-xs font-semibold rounded-md bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 transition cursor-pointer"
                >
                  {copiedUuid ? '✓ Copied' : 'Copy UUID'}
                </button>
              </div>
            </div>

            <div className="text-left md:text-right border-t md:border-t-0 pt-3 md:pt-0 w-full md:w-auto border-slate-100">
              <span className="text-xs text-slate-400 uppercase font-semibold tracking-wider block">
                Currency
              </span>
              <span className="font-mono font-bold text-lg text-slate-800">
                {statement.currency}
              </span>
            </div>
          </div>

          {/* 3. Balances Summary Cards */}
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
            </div>
          </div>

          {/* 4. Statement Entries Audit Table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Audit Trail: {statement.accountNumber} ({statement.accountName})
                </h3>
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
                      <th className="px-6 py-3">Transaction ID</th>
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
                          <td className="px-6 py-3.5">
                            <button
                              type="button"
                              onClick={() => setInspectedTransactionId(entry.transactionId)}
                              className="font-mono font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer flex items-center gap-1"
                              title="Inspect full transaction"
                            >
                              <span>{entry.transactionId}</span>
                              <span className="text-[10px] text-slate-400">↗</span>
                            </button>
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

      <TransactionDetailModal
        identifier={inspectedTransactionId}
        entryTypes={entryTypes}
        onClose={() => setInspectedTransactionId(null)}
      />
    </div>
  );
};