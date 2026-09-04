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

      {/* Global Enterprise Footer */}
      <footer className="border-t border-zinc-200 bg-white dark:border-zinc-800/80 dark:bg-zinc-950">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-5">
            <div className="col-span-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white font-bold text-sm shadow-sm dark:bg-white dark:text-zinc-900">
                  N
                </div>
                <span className="text-base font-bold tracking-tight text-zinc-900 dark:text-white">
                  NexusAI
                </span>
                <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  v2.4
                </span>
              </div>
              <p className="mt-3 max-w-sm text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                Enterprise AI infrastructure delivering low-latency inference, real-time telemetry, model benchmarking, and intelligent workflow automation.
              </p>
              <div className="mt-4 flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Systems Operational
                </span>
                <span className="text-xs text-zinc-400">· 99.99% SLA</span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-200">
                Platform
              </h4>
              <ul className="mt-3 space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
                <li>
                  <button
                    onClick={() => setActiveTab('playground')}
                    className="hover:text-zinc-900 dark:hover:text-white transition-colors"
                  >
                    AI Studio & Arena
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setActiveTab('history')}
                    className="hover:text-zinc-900 dark:hover:text-white transition-colors"
                  >
                    Request Telemetry
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setActiveTab('usage')}
                    className="hover:text-zinc-900 dark:hover:text-white transition-colors"
                  >
                    Usage & Analytics
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-200">
                Developers
              </h4>
              <ul className="mt-3 space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
                <li>
                  <button
                    onClick={() => setActiveTab('apikeys')}
                    className="hover:text-zinc-900 dark:hover:text-white transition-colors flex items-center gap-1"
                  >
                    <Terminal className="h-3 w-3" />
                    API Credentials
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setActiveTab('pricing')}
                    className="hover:text-zinc-900 dark:hover:text-white transition-colors"
                  >
                    Rate Limits & Tiers
                  </button>
                </li>
                <li>
                  <a
                    href="#docs"
                    onClick={(e) => {
                      e.preventDefault();
                      setActiveTab('apikeys');
                    }}
                    className="hover:text-zinc-900 dark:hover:text-white transition-colors"
                  >
                    Documentation
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-200">
                Security & Trust
              </h4>
              <ul className="mt-3 space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
                <li className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                  SOC2 Certified
                </li>
                <li className="text-zinc-500 dark:text-zinc-400">
                  256-bit SSL Encrypted
                </li>
                <li className="text-zinc-500 dark:text-zinc-400">
                  Zero Data Retention
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-between border-t border-zinc-100 pt-6 text-xs text-zinc-500 dark:border-zinc-800/80 dark:text-zinc-400 gap-3">
            <p>© 2026 NexusAI Inc. All rights reserved. Enterprise AI Platform.</p>
            <div className="flex items-center gap-4">
              <span className="hover:underline cursor-pointer">Privacy Policy</span>
              <span className="hover:underline cursor-pointer">Terms of Service</span>
              <span className="hover:underline cursor-pointer">Security Portal</span>
            </div>
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
