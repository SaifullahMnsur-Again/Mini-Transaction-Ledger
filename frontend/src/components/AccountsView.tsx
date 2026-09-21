import React, { useState } from 'react';
import { AccountType, AccountTypeLabels } from '../types/ledger';
import type { Account, CreateAccountRequest } from '../types/ledger';
import { fetchAccountByNumber } from '../services/api';

interface AccountsViewProps {
  accounts: Account[];
  loading: boolean;
  onRefresh: () => Promise<void>;
  onCreateAccount: (req: CreateAccountRequest) => Promise<void>;
  onViewStatement: (accountNumber: string) => void;
}

export const AccountsView: React.FC<AccountsViewProps> = ({
  accounts,
  loading,
  onRefresh,
  onCreateAccount,
  onViewStatement,
}) => {
  // Create Account Form State
  const [accountNumber, setAccountNumber] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>(AccountType.Asset);
  const [currency, setCurrency] = useState('BDT');
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  // Pure Backend Account Number Search State
  const [searchNumber, setSearchNumber] = useState('');
  const [searchedAccount, setSearchedAccount] = useState<Account | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreateSuccess(null);
    setSubmitting(true);

    try {
      await onCreateAccount({
        accountNumber: accountNumber.trim().toUpperCase(),
        name: name.trim(),
        type: Number(type) as AccountType,
        currency: currency.trim().toUpperCase(),
      });
      setCreateSuccess(`Account ${accountNumber.trim().toUpperCase()} created successfully.`);
      setAccountNumber('');
      setName('');
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create account');
    } finally {
      setSubmitting(false);
    }
  };

  // Pure backend search: hits GET /api/v1/accounts/{accountNumber} directly
  const handleBackendSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchNumber.trim();
    if (!query) return;

    setSearchLoading(true);
    setSearchError(null);
    setSearchedAccount(null);

    try {
      const data = await fetchAccountByNumber(query);
      setSearchedAccount(data);
    } catch (err: any) {
      setSearchError(err.message || `Account '${query}' was not found in the ledger database.`);
    } finally {
      setSearchLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Create Account Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <h2 className="text-sm font-bold text-slate-900">Create New Ledger Account</h2>
        <p className="text-xs text-slate-500 mt-0.5 mb-4">
          All accounts enforce normal-balance conventions and immutable double-entry constraints.
        </p>

        {createError && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            {createError}
          </div>
        )}
        {createSuccess && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
            {createSuccess}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Account Number</label>
            <input
              type="text"
              required
              placeholder="e.g. 1010-CASH"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono uppercase bg-slate-50/50 focus:bg-white"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Account Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Cash On Hand / Capital"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Classification</label>
            <select
              value={type}
              onChange={(e) => setType(Number(e.target.value) as AccountType)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value={AccountType.Asset}>1 - Asset (Dr Normal)</option>
              <option value={AccountType.Liability}>2 - Liability (Cr Normal)</option>
              <option value={AccountType.Equity}>3 - Equity (Cr Normal)</option>
              <option value={AccountType.Revenue}>4 - Revenue (Cr Normal)</option>
              <option value={AccountType.Expense}>5 - Expense (Dr Normal)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Currency</label>
            <input
              type="text"
              required
              placeholder="BDT"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono uppercase bg-slate-50/50 focus:bg-white"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={submitting}
              className="w-full h-9 inline-flex items-center justify-center px-4 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
            >
              {submitting ? 'Creating...' : '+ Create Account'}
            </button>
          </div>
        </form>
      </div>

      {/* 2. Chart of Accounts & Backend Lookup */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {/* Header with Server Query Form */}
        <div className="p-6 border-b border-slate-200 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Chart of Accounts</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Master general ledger view. Query backend directly by Account Number.
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <form onSubmit={handleBackendSearch} className="flex gap-2 w-full sm:w-auto">
                <input
                  type="text"
                  value={searchNumber}
                  onChange={(e) => setSearchNumber(e.target.value)}
                  placeholder="Query Account No (e.g. 1010-CASH)..."
                  className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono uppercase w-full sm:w-64 bg-white"
                />
                <button
                  type="submit"
                  disabled={searchLoading || !searchNumber.trim()}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition cursor-pointer shrink-0"
                >
                  {searchLoading ? 'Searching...' : 'Search'}
                </button>
              </form>

              <button
                type="button"
                onClick={onRefresh}
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

          {/* Server Query Result Banner */}
          {searchedAccount && (
            <div className="mt-4 p-3.5 rounded-lg bg-white border border-indigo-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                    Query Result
                  </span>
                  <span className="font-mono font-bold text-xs text-slate-900">
                    {searchedAccount.accountNumber}
                  </span>
                  <span className="text-xs font-semibold text-slate-700">
                    {searchedAccount.name}
                  </span>
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      AccountTypeLabels[searchedAccount.type]?.badgeColor || ''
                    }`}
                  >
                    {AccountTypeLabels[searchedAccount.type]?.label || 'Account'}
                  </span>
                </div>
                <p className="text-[11px] font-mono text-slate-500 mt-1">
                  Live Balance:{' '}
                  <span className="font-bold text-slate-900">
                    {searchedAccount.currentBalance.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{' '}
                    {searchedAccount.currency}
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => onViewStatement(searchedAccount.accountNumber)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition cursor-pointer flex items-center gap-1"
                >
                  <span>View Statement</span>
                  <span>↗</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSearchedAccount(null);
                    setSearchNumber('');
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

        {/* Master Accounts Table */}
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading accounts from backend...</div>
        ) : accounts.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No accounts in ledger yet. Create an account above to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-6 py-3">Account Number</th>
                  <th className="px-6 py-3">Account Name</th>
                  <th className="px-6 py-3">Classification</th>
                  <th className="px-6 py-3">Normal Balance</th>
                  <th className="px-6 py-3">Currency</th>
                  <th className="px-6 py-3 text-right">Current Balance</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {accounts.map((acc) => {
                  const meta = AccountTypeLabels[acc.type];
                  return (
                    <tr key={acc.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-3.5 font-mono font-bold text-slate-800 whitespace-nowrap">
                        {acc.accountNumber}
                      </td>
                      <td className="px-6 py-3.5 text-slate-900 font-semibold">{acc.name}</td>
                      <td className="px-6 py-3.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${meta.badgeColor}`}
                        >
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-slate-500">{meta.normalBalance}-Normal</td>
                      <td className="px-6 py-3.5 font-mono text-slate-600">{acc.currency}</td>
                      <td className="px-6 py-3.5 text-right font-mono font-bold text-slate-900 text-sm">
                        {acc.currentBalance.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-6 py-3.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onViewStatement(acc.accountNumber)}
                          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer inline-flex items-center gap-1"
                        >
                          Statement ↗
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
    </div>
  );
};