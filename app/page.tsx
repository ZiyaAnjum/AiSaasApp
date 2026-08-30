'use client';

import React from 'react';
import { AuthProvider, useAuth } from '@/lib/context';
import Navbar from '@/components/Navbar';
import AuthModal from '@/components/AuthModal';
import AiPlayground from '@/components/AiPlayground';
import PromptHistory from '@/components/PromptHistory';
import UsageDashboard from '@/components/UsageDashboard';
import PricingPlans from '@/components/PricingPlans';
import ApiKeyManager from '@/components/ApiKeyManager';
import AdminPanel from '@/components/AdminPanel';
import { ShieldCheck, Terminal } from 'lucide-react';

function AppContent() {
  const { activeTab, setActiveTab, user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 selection:bg-blue-500 selection:text-white">
      {/* Navigation Bar */}
      <Navbar />

      {/* Main Dynamic View */}
      <main className="flex-1">
        {activeTab === 'playground' && <AiPlayground />}
        {activeTab === 'history' && <PromptHistory />}
        {activeTab === 'usage' && <UsageDashboard />}
        {activeTab === 'pricing' && <PricingPlans />}
        {activeTab === 'apikeys' && <ApiKeyManager />}
        {activeTab === 'admin' && (
          user?.role === 'admin' ? (
            <AdminPanel />
          ) : (
            <div className="mx-auto max-w-lg px-4 py-20 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-xl font-bold text-zinc-900 dark:text-white">
                Admin Privilege Required
              </h2>
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                You must have an administrator account to view the platform administration console.
                Use the top demo switcher to quickly test the Admin view.
              </p>
              <button
                onClick={() => setActiveTab('playground')}
                className="mt-6 rounded-lg bg-zinc-900 px-4 py-2 text-xs font-bold text-white dark:bg-white dark:text-zinc-900"
              >
                Return to AI Tools
              </button>
            </div>
          )
        )}
      </main>

      {/* Global Footer */}
      <footer className="border-t border-zinc-200 bg-white py-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-600 text-white font-bold text-xs">
              N
            </div>
            <span className="text-xs font-bold tracking-tight text-zinc-900 dark:text-white">
              NexusAI SaaS Platform
            </span>
            <span className="text-xs text-zinc-400">· Next.js 15 & Gemini SDK</span>
          </div>

          <div className="flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
            <button
              onClick={() => setActiveTab('apikeys')}
              className="flex items-center gap-1 hover:text-zinc-900 dark:hover:text-white"
            >
              <Terminal className="h-3.5 w-3.5" />
              Developer API
            </button>
            <button
              onClick={() => setActiveTab('pricing')}
              className="hover:text-zinc-900 dark:hover:text-white"
            >
              Subscription Plans
            </button>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              All Systems Operational
            </span>
          </div>
        </div>
      </footer>

      {/* Interactive Authentication & Switcher Modal */}
      <AuthModal />
    </div>
  );
}

export default function Home() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
