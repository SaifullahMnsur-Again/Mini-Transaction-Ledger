import { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { AccountsView } from './components/AccountsView';
import { fetchAccounts, createAccount } from './services/api';
import type { Account, CreateAccountRequest } from './types/ledger';

export default function App() {
  const [activeTab, setActiveTab] = useState<'accounts' | 'transaction' | 'statement'>('accounts');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);

  const loadAccounts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchAccounts();
      setAccounts(data);
    } catch (err) {
      console.error('Error fetching accounts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const handleCreateAccount = async (req: CreateAccountRequest) => {
    await createAccount(req);
    await loadAccounts();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        {activeTab === 'accounts' && (
          <AccountsView
            accounts={accounts}
            loading={loading}
            onRefresh={loadAccounts}
            onCreateAccount={handleCreateAccount}
          />
        )}

        {activeTab === 'transaction' && (
          <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-500 shadow-xs">
            <h3 className="text-base font-bold text-slate-800 mb-1">Post Transaction</h3>
            <p className="text-xs text-slate-500">Coming up in Phase 2</p>
          </div>
        )}

        {activeTab === 'statement' && (
          <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-500 shadow-xs">
            <h3 className="text-base font-bold text-slate-800 mb-1">Account Statement</h3>
            <p className="text-xs text-slate-500">Coming up in Phase 3</p>
          </div>
        )}
      </main>
    </div>
  );
}