'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Plan, Subscription } from './types';

interface AuthContextType {
  user: User | null;
  plan: Plan | null;
  subscription: Subscription | null;
  token: string | null;
  isLoading: boolean;
  activeTab: 'playground' | 'history' | 'usage' | 'pricing' | 'apikeys' | 'admin';
  setActiveTab: (tab: 'playground' | 'history' | 'usage' | 'pricing' | 'apikeys' | 'admin') => void;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  switchDemoAccount: (role: 'admin' | 'pro' | 'starter' | 'free') => Promise<void>;
  showAuthModal: boolean;
  setShowAuthModal: (show: boolean) => void;
  authModalMode: 'login' | 'signup' | 'reset';
  setAuthModalMode: (mode: 'login' | 'signup' | 'reset') => void;
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'playground' | 'history' | 'usage' | 'pricing' | 'apikeys' | 'admin'>('playground');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const refreshSession = useCallback(async () => {
    const savedToken = token || (typeof window !== 'undefined' ? localStorage.getItem('ai_saas_token') : null);
    if (!savedToken) {
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${savedToken}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setPlan(data.plan);
        setSubscription(data.subscription);
        setToken(savedToken);
      } else {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('ai_saas_token');
        }
        setUser(null);
        setPlan(null);
        setSubscription(null);
        setToken(null);
      }
    } catch (err) {
      console.error('Session refresh error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Login failed' };
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('ai_saas_token', data.token);
      }
      setToken(data.token);
      setUser(data.user);
      if (data.plan) setPlan(data.plan);
      if (data.subscription) setSubscription(data.subscription);
      setShowAuthModal(false);
      showToast(`Welcome back, ${data.user.name}!`, 'success');
      return { success: true };
    } catch {
      return { success: false, error: 'Network error during login' };
    }
  }, [showToast]);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Signup failed' };
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('ai_saas_token', data.token);
      }
      setToken(data.token);
      setUser(data.user);
      if (data.plan) setPlan(data.plan);
      if (data.subscription) setSubscription(data.subscription);
      setShowAuthModal(false);
      showToast(`Welcome to NexusAI, ${data.user.name}!`, 'success');
      return { success: true };
    } catch {
      return { success: false, error: 'Network error during signup' };
    }
  }, [showToast]);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    if (typeof window !== 'undefined') {
      localStorage.removeItem('ai_saas_token');
    }
    setToken(null);
    setUser(null);
    setPlan(null);
    setSubscription(null);
    showToast('Logged out successfully', 'info');
  }, [showToast]);

  const switchDemoAccount = useCallback(async (accountType: 'admin' | 'pro' | 'starter' | 'free') => {
    try {
      const res = await fetch('/api/auth/demo-switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: accountType }),
      });

      const data = await res.json();
      if (res.ok && data.user) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('ai_saas_token', data.token);
        }
        setToken(data.token);
        setUser(data.user);
        setPlan(data.plan);
        setSubscription(data.subscription);
        setShowAuthModal(false);

        if (accountType === 'admin') {
          setActiveTab('admin');
        } else {
          setActiveTab('playground');
        }

        showToast(`Switched to ${data.user.name} (${data.user.planId?.toUpperCase() || accountType.toUpperCase()} Tier)`, 'success');
      } else {
        // Fallback login
        const creds = {
          admin: { email: 'admin@aisaas.com', password: 'Admin@123' },
          pro: { email: 'pro@example.com', password: 'User@123' },
          starter: { email: 'starter@example.com', password: 'User@123' },
          free: { email: 'free@example.com', password: 'User@123' },
        };
        const target = creds[accountType];
        await login(target.email, target.password);
        if (accountType === 'admin') {
          setActiveTab('admin');
        } else {
          setActiveTab('playground');
        }
      }
    } catch {
      showToast(`Switched to ${accountType.toUpperCase()} Demo Mode`, 'info');
    }
  }, [login, showToast]);

  useEffect(() => {
    const initAuth = async () => {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('ai_saas_token') : null;
      if (saved) {
        try {
          const res = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${saved}` },
          });
          if (res.ok) {
            const data = await res.json();
            setUser(data.user);
            setPlan(data.plan);
            setSubscription(data.subscription);
            setToken(saved);
          } else {
            localStorage.removeItem('ai_saas_token');
            await switchDemoAccount('pro');
          }
        } catch {
          await switchDemoAccount('pro');
        } finally {
          setIsLoading(false);
        }
      } else {
        await switchDemoAccount('pro');
        setIsLoading(false);
      }
    };

    initAuth();
  }, [switchDemoAccount]);

  return (
    <AuthContext.Provider
      value={{
        user,
        plan,
        subscription,
        token,
        isLoading,
        activeTab,
        setActiveTab,
        login,
        signup,
        logout,
        refreshSession,
        switchDemoAccount,
        showAuthModal,
        setShowAuthModal,
        authModalMode,
        setAuthModalMode,
        toast,
        showToast,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
