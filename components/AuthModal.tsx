'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/context';
import { X, Lock, Mail, User as UserIcon, ShieldCheck, Sparkles, Bot, AlertCircle } from 'lucide-react';

export default function AuthModal() {
  const {
    showAuthModal,
    setShowAuthModal,
    authModalMode,
    setAuthModalMode,
    login,
    signup,
    switchDemoAccount,
    showToast,
  } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!showAuthModal) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (authModalMode === 'signup') {
        const res = await signup(name, email, password);
        if (!res.success) {
          setError(res.error || 'Failed to sign up');
        }
      } else if (authModalMode === 'login') {
        const res = await login(email, password);
        if (!res.success) {
          setError(res.error || 'Failed to log in');
        }
      } else if (authModalMode === 'reset') {
        const res = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, newPassword: password, confirmPassword }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Failed to reset password');
        } else {
          showToast('Password reset successfully! Please sign in.', 'success');
          setAuthModalMode('login');
        }
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div
        className="relative w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          id="close-auth-modal-btn"
          onClick={() => setShowAuthModal(false)}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
            {authModalMode === 'signup' && <UserPlusIcon className="h-6 w-6" />}
            {authModalMode === 'login' && <Lock className="h-6 w-6" />}
            {authModalMode === 'reset' && <Mail className="h-6 w-6" />}
          </div>
          <h3 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
            {authModalMode === 'signup' && 'Create Your SaaS Account'}
            {authModalMode === 'login' && 'Sign In to NexusAI SaaS'}
            {authModalMode === 'reset' && 'Reset Your Password'}
          </h3>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {authModalMode === 'signup' && 'Get instant access to AI tools and developer APIs'}
            {authModalMode === 'login' && 'Enter your credentials to access your subscription & workspace'}
            {authModalMode === 'reset' && 'Enter your email and choose a new secure password'}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {authModalMode === 'signup' && (
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Full Name
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <input
                  id="auth-name-input"
                  type="text"
                  required
                  placeholder="Alex Rivera"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              <input
                id="auth-email-input"
                type="email"
                required
                placeholder="developer@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                {authModalMode === 'reset' ? 'New Password' : 'Password'}
              </label>
              {authModalMode === 'login' && (
                <button
                  type="button"
                  id="forgot-password-link"
                  onClick={() => {
                    setError(null);
                    setAuthModalMode('reset');
                  }}
                  className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              <input
                id="auth-password-input"
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              />
            </div>
          </div>

          {authModalMode === 'reset' && (
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <input
                  id="auth-confirm-password-input"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </div>
            </div>
          )}

          <button
            id="auth-submit-btn"
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-zinc-900 py-2.5 text-center text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
          >
            {isSubmitting
              ? 'Processing...'
              : authModalMode === 'signup'
              ? 'Create Account & Start'
              : authModalMode === 'login'
              ? 'Sign In'
              : 'Save New Password'}
          </button>
        </form>

        {/* Switch mode */}
        <div className="mt-4 text-center text-xs text-zinc-500 dark:text-zinc-400">
          {authModalMode === 'login' ? (
            <>
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setAuthModalMode('signup');
                }}
                className="font-semibold text-blue-600 hover:underline dark:text-blue-400"
              >
                Sign up free
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setAuthModalMode('login');
                }}
                className="font-semibold text-blue-600 hover:underline dark:text-blue-400"
              >
                Sign in
              </button>
            </>
          )}
        </div>

        {/* 1-Click Quick Demo Switcher */}
        <div className="mt-6 border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <p className="text-center text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Quick 1-Click Test Logins
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              id="quick-admin-btn"
              onClick={() => {
                switchDemoAccount('admin');
                setShowAuthModal(false);
              }}
              className="flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50/70 p-2 text-left text-xs font-semibold text-purple-800 hover:bg-purple-100 dark:border-purple-900/60 dark:bg-purple-950/40 dark:text-purple-300"
            >
              <ShieldCheck className="h-4 w-4 text-purple-600" />
              <span>Admin (Super)</span>
            </button>

            <button
              type="button"
              id="quick-pro-btn"
              onClick={() => {
                switchDemoAccount('pro');
                setShowAuthModal(false);
              }}
              className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50/70 p-2 text-left text-xs font-semibold text-blue-800 hover:bg-blue-100 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300"
            >
              <Sparkles className="h-4 w-4 text-blue-600" />
              <span>Pro ($49/mo)</span>
            </button>

            <button
              type="button"
              id="quick-starter-btn"
              onClick={() => {
                switchDemoAccount('starter');
                setShowAuthModal(false);
              }}
              className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50/70 p-2 text-left text-xs font-semibold text-amber-800 hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300"
            >
              <Bot className="h-4 w-4 text-amber-600" />
              <span>Starter ($19/mo)</span>
            </button>

            <button
              type="button"
              id="quick-free-btn"
              onClick={() => {
                switchDemoAccount('free');
                setShowAuthModal(false);
              }}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 p-2 text-left text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800/60 dark:text-zinc-300"
            >
              <UserIcon className="h-4 w-4 text-zinc-500" />
              <span>Free Tier ($0)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function UserPlusIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" x2="19" y1="8" y2="14" />
      <line x1="22" x2="16" y1="11" y2="11" />
    </svg>
  );
}
