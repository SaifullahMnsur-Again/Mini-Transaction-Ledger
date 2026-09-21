import React, { useState } from 'react';
import { EntryType } from '../types/ledger';
import type { Account, CreateTransactionRequest, TransactionResponse } from '../types/ledger';
import { postTransaction } from '../services/api';

interface TransactionViewProps {
  accounts: Account[];
  onTransactionPosted: () => Promise<void>;
}

export const TransactionView: React.FC<TransactionViewProps> = ({ accounts, onTransactionPosted }) => {
  const generateReference = () => `TX-${Date.now().toString().slice(-6)}`;

  const [referenceId, setReferenceId] = useState(generateReference());
  const [description, setDescription] = useState('');
  const [debitAccountId, setDebitAccountId] = useState(accounts[0]?.id || '');
  const [creditAccountId, setCreditAccountId] = useState(accounts[1]?.id || '');
  const [amount, setAmount] = useState<number | ''>('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<TransactionResponse | null>(null);

  const numAmount = typeof amount === 'number' ? amount : 0;
  const isBalanced = numAmount > 0 && debitAccountId && creditAccountId && debitAccountId !== creditAccountId;

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
      referenceId: referenceId.trim(),
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
      setReferenceId(generateReference());
      setDescription('');
      setAmount('');
      await onTransactionPosted();
    } catch (err: any) {
      setError(err.message || 'Transaction submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Post Double-Entry Journal Entry</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Atomic transaction execution: ensures Sum(Debits) == Sum(Credits) across accounts.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setReferenceId(generateReference())}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
          >
            Regenerate Ref ID
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Reference ID (Unique)</label>
              <input
                type="text"
                required
                value={referenceId}
                onChange={(e) => setReferenceId(e.target.value)}
                placeholder="e.g. TX-1002"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono bg-slate-50/50 focus:bg-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Memo</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Cash Investment / Office Supplies Purchase"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-slate-50/80 p-4 rounded-xl border border-slate-200/80">
            {/* Debit Leg */}
            <div className="md:col-span-5">
              <label className="block text-xs font-bold text-emerald-800 mb-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Debit Leg (Receiving Account)
              </label>
              <select
                value={debitAccountId}
                onChange={(e) => setDebitAccountId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
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
              <label className="block text-xs font-bold text-amber-800 mb-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                Credit Leg (Giving Account)
              </label>
              <select
                value={creditAccountId}
                onChange={(e) => setCreditAccountId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
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
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
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
            <span className="font-mono text-xs font-semibold text-emerald-800">
              Ref: {successResult.referenceId}
            </span>
          </div>
          <p className="text-xs text-emerald-700">
            Journal Entry ID: <code className="font-mono">{successResult.id}</code> — Posted at{' '}
            {new Date(successResult.postedAtUtc).toLocaleString()}
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
    </div>
  );
};