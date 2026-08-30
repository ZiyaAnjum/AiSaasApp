'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/context';
import {
  Sparkles,
  Bot,
  History,
  BarChart3,
  CreditCard,
  KeyRound,
  ShieldCheck,
  LogOut,
  LogIn,
  UserPlus,
  Zap,
  ChevronDown,
  User as UserIcon,
} from 'lucide-react';

export default function Navbar() {
  const {
    user,
    plan,
    logout,
    activeTab,
    setActiveTab,
    setShowAuthModal,
    setAuthModalMode,
    switchDemoAccount,
  } = useAuth();

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showDemoMenu, setShowDemoMenu] = useState(false);

  const getTierBadgeStyle = (tier?: string) => {
    switch (tier) {
      case 'enterprise':
        return 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800';
      case 'pro':
        return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800';
      case 'starter':
        return 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800';
      default:
        return 'bg-zinc-100 text-zinc-800 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700';
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-200 bg-white/95 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <button
            id="brand-logo-btn"
            onClick={() => setActiveTab('playground')}
            className="flex items-center gap-2 text-left focus:outline-none"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-900 text-white shadow-sm dark:bg-white dark:text-zinc-900">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white">
                NexusAI
              </span>
              <span className="ml-1 text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                SaaS
              </span>
            </div>
          </button>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1">
          <button
            id="nav-tab-playground"
            onClick={() => setActiveTab('playground')}
            className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === 'playground'
                ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white'
                : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-200'
            }`}
          >
            <Bot className="h-4 w-4 text-blue-500" />
            AI Tools
          </button>

          <button
            id="nav-tab-history"
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === 'history'
                ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white'
                : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-200'
            }`}
          >
            <History className="h-4 w-4 text-indigo-500" />
            History
          </button>

          <button
            id="nav-tab-usage"
            onClick={() => setActiveTab('usage')}
            className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === 'usage'
                ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white'
                : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-200'
            }`}
          >
            <BarChart3 className="h-4 w-4 text-emerald-500" />
            Usage
          </button>

          <button
            id="nav-tab-pricing"
            onClick={() => setActiveTab('pricing')}
            className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === 'pricing'
                ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white'
                : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-200'
            }`}
          >
            <CreditCard className="h-4 w-4 text-amber-500" />
            Plans
          </button>

          <button
            id="nav-tab-apikeys"
            onClick={() => setActiveTab('apikeys')}
            className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === 'apikeys'
                ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white'
                : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-200'
            }`}
          >
            <KeyRound className="h-4 w-4 text-rose-500" />
            API Keys
          </button>

          {/* Admin Tab */}
          {user?.role === 'admin' && (
            <button
              id="nav-tab-admin"
              onClick={() => setActiveTab('admin')}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === 'admin'
                  ? 'bg-purple-100 text-purple-900 dark:bg-purple-900/50 dark:text-purple-200'
                  : 'text-purple-700 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-950/40'
              }`}
            >
              <ShieldCheck className="h-4 w-4 text-purple-600" />
              Admin Panel
            </button>
          )}
        </nav>

        {/* User Controls & Demo Switcher */}
        <div className="flex items-center gap-3">
          {/* Quick Demo Role Switcher Dropdown */}
          <div className="relative">
            <button
              id="demo-switcher-btn"
              onClick={() => setShowDemoMenu(!showDemoMenu)}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              title="Test role switcher"
            >
              <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
              <span className="hidden sm:inline">Switch Demo:</span>
              <span className="capitalize text-blue-600 dark:text-blue-400">
                {user?.role === 'admin' ? 'Admin' : user?.planId || 'Guest'}
              </span>
              <ChevronDown className="h-3 w-3 opacity-60" />
            </button>

            {showDemoMenu && (
              <div
                className="absolute right-0 mt-2 w-56 rounded-xl border border-zinc-200 bg-white p-2 shadow-xl ring-1 ring-black/5 dark:border-zinc-800 dark:bg-zinc-900 z-50"
                onClick={() => setShowDemoMenu(false)}
              >
                <div className="px-2 py-1.5 text-[11px] font-medium uppercase text-zinc-400">
                  Instant 1-Click Role Switch
                </div>
                <button
                  id="switch-admin-btn"
                  onClick={() => switchDemoAccount('admin')}
                  className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs font-medium text-purple-700 hover:bg-purple-50 dark:text-purple-300 dark:hover:bg-purple-950/40"
                >
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Super Admin
                  </span>
                  <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] text-purple-800 dark:bg-purple-900">
                    Enterprise
                  </span>
                </button>
                <button
                  id="switch-pro-btn"
                  onClick={() => switchDemoAccount('pro')}
                  className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs font-medium text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-950/40"
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5" />
                    Pro User ($49/mo)
                  </span>
                  <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] text-blue-800 dark:bg-blue-900">
                    Pro
                  </span>
                </button>
                <button
                  id="switch-starter-btn"
                  onClick={() => switchDemoAccount('starter')}
                  className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs font-medium text-amber-700 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-950/40"
                >
                  <span className="flex items-center gap-2">
                    <Bot className="h-3.5 w-3.5" />
                    Starter User ($19/mo)
                  </span>
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-800 dark:bg-amber-900">
                    Starter
                  </span>
                </button>
                <button
                  id="switch-free-btn"
                  onClick={() => switchDemoAccount('free')}
                  className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  <span className="flex items-center gap-2">
                    <UserIcon className="h-3.5 w-3.5" />
                    Free Tier User ($0)
                  </span>
                  <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    Free
                  </span>
                </button>
              </div>
            )}
          </div>

          {user ? (
            /* User Profile */
            <div className="relative">
              <button
                id="user-profile-menu-btn"
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white p-1.5 pl-2 pr-3 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800/80"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600 text-xs font-bold text-white uppercase">
                  {user.name.charAt(0)}
                </div>
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-semibold leading-none">{user.name}</span>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 capitalize">
                    {user.role === 'admin' ? 'Administrator' : `${user.planId} plan`}
                  </span>
                </div>
                <span
                  className={`hidden sm:inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getTierBadgeStyle(
                    user.planId
                  )}`}
                >
                  {user.planId}
                </span>
                <ChevronDown className="h-3 w-3 text-zinc-400" />
              </button>

              {showUserMenu && (
                <div
                  className="absolute right-0 mt-2 w-64 rounded-xl border border-zinc-200 bg-white p-2 shadow-2xl ring-1 ring-black/5 dark:border-zinc-800 dark:bg-zinc-900 z-50"
                  onClick={() => setShowUserMenu(false)}
                >
                  <div className="border-b border-zinc-100 p-2.5 dark:border-zinc-800">
                    <p className="text-xs font-semibold text-zinc-900 dark:text-white">{user.name}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{user.email}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[11px] text-zinc-500">Active Plan:</span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${getTierBadgeStyle(
                          user.planId
                        )}`}
                      >
                        {plan?.name || user.planId}
                      </span>
                    </div>
                  </div>

                  <div className="py-1">
                    <button
                      id="menu-plans-btn"
                      onClick={() => setActiveTab('pricing')}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      <CreditCard className="h-4 w-4 text-zinc-400" />
                      Manage Subscription
                    </button>
                    <button
                      id="menu-apikeys-btn"
                      onClick={() => setActiveTab('apikeys')}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      <KeyRound className="h-4 w-4 text-zinc-400" />
                      Developer API Keys
                    </button>
                    {user.role === 'admin' && (
                      <button
                        id="menu-admin-btn"
                        onClick={() => setActiveTab('admin')}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-purple-700 hover:bg-purple-50 dark:text-purple-300 dark:hover:bg-purple-950/40"
                      >
                        <ShieldCheck className="h-4 w-4 text-purple-600" />
                        Admin Control Panel
                      </button>
                    )}
                  </div>

                  <div className="border-t border-zinc-100 pt-1 dark:border-zinc-800">
                    <button
                      id="logout-btn"
                      onClick={logout}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Auth Buttons */
            <div className="flex items-center gap-2">
              <button
                id="sign-in-btn"
                onClick={() => {
                  setAuthModalMode('login');
                  setShowAuthModal(true);
                }}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                <LogIn className="h-3.5 w-3.5" />
                Sign In
              </button>
              <button
                id="sign-up-btn"
                onClick={() => {
                  setAuthModalMode('signup');
                  setShowAuthModal(true);
                }}
                className="flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
              >
                <UserPlus className="h-3.5 w-3.5" />
                Get Started
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Sub-Navigation Bar */}
      <div className="flex md:hidden overflow-x-auto border-t border-zinc-200 px-4 py-2 gap-2 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 scrollbar-none">
        <button
          onClick={() => setActiveTab('playground')}
          className={`flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium ${
            activeTab === 'playground' ? 'bg-white shadow-sm font-semibold dark:bg-zinc-800' : 'text-zinc-600'
          }`}
        >
          <Bot className="h-3.5 w-3.5 text-blue-500" />
          AI Tools
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium ${
            activeTab === 'history' ? 'bg-white shadow-sm font-semibold dark:bg-zinc-800' : 'text-zinc-600'
          }`}
        >
          <History className="h-3.5 w-3.5 text-indigo-500" />
          History
        </button>
        <button
          onClick={() => setActiveTab('usage')}
          className={`flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium ${
            activeTab === 'usage' ? 'bg-white shadow-sm font-semibold dark:bg-zinc-800' : 'text-zinc-600'
          }`}
        >
          <BarChart3 className="h-3.5 w-3.5 text-emerald-500" />
          Usage
        </button>
        <button
          onClick={() => setActiveTab('pricing')}
          className={`flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium ${
            activeTab === 'pricing' ? 'bg-white shadow-sm font-semibold dark:bg-zinc-800' : 'text-zinc-600'
          }`}
        >
          <CreditCard className="h-3.5 w-3.5 text-amber-500" />
          Plans
        </button>
        <button
          onClick={() => setActiveTab('apikeys')}
          className={`flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium ${
            activeTab === 'apikeys' ? 'bg-white shadow-sm font-semibold dark:bg-zinc-800' : 'text-zinc-600'
          }`}
        >
          <KeyRound className="h-3.5 w-3.5 text-rose-500" />
          API Keys
        </button>
        {user?.role === 'admin' && (
          <button
            onClick={() => setActiveTab('admin')}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium ${
              activeTab === 'admin' ? 'bg-purple-100 text-purple-900 font-semibold dark:bg-purple-900' : 'text-purple-600'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Admin
          </button>
        )}
      </div>
    </header>
  );
}
