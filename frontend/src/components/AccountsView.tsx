import React, { useState } from 'react';
import { AccountType, AccountTypeLabels } from '../types/ledger';
import type { Account, CreateAccountRequest } from '../types/ledger';

interface AccountsViewProps {
  accounts: Account[];
  loading: boolean;
  onRefresh: () => Promise<void>;
  onCreateAccount: (req: CreateAccountRequest) => Promise<void>;
}

export const AccountsView: React.FC<AccountsViewProps> = ({
  accounts,
  loading,
  onRefresh,
  onCreateAccount,
}) => {
  const [accountNumber, setAccountNumber] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>(AccountType.Asset);
  const [currency, setCurrency] = useState('BDT');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      await onCreateAccount({
        accountNumber: accountNumber.trim(),
        name: name.trim(),
        type: Number(type) as AccountType,
        currency: currency.trim().toUpperCase(),
      });
      setSuccess(`Account ${accountNumber.trim().toUpperCase()} created successfully.`);
      setAccountNumber('');
      setName('');
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Create Account Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <h2 className="text-sm font-bold text-slate-900">Create New Ledger Account</h2>
        <p className="text-xs text-slate-500 mt-0.5 mb-4">
          All accounts enforce normal-balance conventions and immutable double-entry constraints.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Account Code</label>
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

      {/* Accounts List Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Chart of Accounts</h3>
            <p className="text-xs text-slate-500">Live running balances across active ledger accounts</p>
          </div>
          <button
            onClick={onRefresh}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
          >
            Refresh
          </button>
        </div>

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
                  <th className="px-6 py-3">Code</th>
                  <th className="px-6 py-3">Account Name</th>
                  <th className="px-6 py-3">Classification</th>
                  <th className="px-6 py-3">Normal Balance</th>
                  <th className="px-6 py-3">Currency</th>
                  <th className="px-6 py-3 text-right">Current Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {accounts.map((acc) => {
                  const meta = AccountTypeLabels[acc.type];
                  return (
                    <tr key={acc.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-3.5 font-mono font-bold text-slate-800">{acc.accountNumber}</td>
                      <td className="px-6 py-3.5 text-slate-900 font-semibold">{acc.name}</td>
                      <td className="px-6 py-3.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${meta.badgeColor}`}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-slate-500">{meta.normalBalance}-Normal</td>
                      <td className="px-6 py-3.5 font-mono text-slate-600">{acc.currency}</td>
                      <td className="px-6 py-3.5 text-right font-mono font-bold text-slate-900 text-sm">
                        {acc.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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