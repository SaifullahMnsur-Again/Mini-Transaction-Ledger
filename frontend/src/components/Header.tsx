import React from 'react';

export type TabType = 'accounts' | 'transaction' | 'journal' | 'statement';

interface HeaderProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab }) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
              L
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-tight">Mini Transaction Ledger</h1>
              <p className="text-xs text-slate-500 font-medium">Double-Entry Accounting & Audit Trail</p>
            </div>
          </div>

          <nav className="flex space-x-1.5 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('accounts')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                activeTab === 'accounts'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Chart of Accounts
            </button>
            <button
              onClick={() => setActiveTab('transaction')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                activeTab === 'transaction'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Post Transaction
            </button>
            <button
              onClick={() => setActiveTab('journal')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                activeTab === 'journal'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Journal Log Book
            </button>
            <button
              onClick={() => setActiveTab('statement')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                activeTab === 'statement'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Account Statement
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};  