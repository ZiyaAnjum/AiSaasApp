'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/context';
import { Plan, Tool, PlanTier } from '@/lib/types';
import {
  ShieldCheck,
  Users,
  Wrench,
  BarChart3,
  CreditCard,
  Search,
  CheckCircle2,
  Ban,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  Layers,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface AdminUserItem {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  status: 'active' | 'blocked';
  planId: PlanTier;
  createdAt: string;
  lastLoginAt?: string;
  apiKeysCount: number;
  stats: {
    totalRequests: number;
    todayRequests: number;
    totalTokens: number;
  };
}

export default function AdminPanel() {
  const { token, showToast } = useAuth();

  const [adminTab, setAdminTab] = useState<'users' | 'tools' | 'plans' | 'analytics' | 'subscriptions'>('users');
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filter
  const [userSearch, setUserSearch] = useState('');
  const [userPlanFilter, setUserPlanFilter] = useState('all');
  const [userStatusFilter, setUserStatusFilter] = useState('all');

  // Tool Creation Modal
  const [showToolModal, setShowToolModal] = useState(false);
  const [editingTool, setEditingTool] = useState<Tool | null>(null);
  const [toolName, setToolName] = useState('');
  const [toolDesc, setToolDesc] = useState('');
  const [toolCategory, setToolCategory] = useState<'chat' | 'coding' | 'writing' | 'image' | 'analysis' | 'productivity'>('productivity');
  const [toolMinPlan, setToolMinPlan] = useState<PlanTier>('free');
  const [toolSysPrompt, setToolSysPrompt] = useState('');
  const [toolPlaceholder, setToolPlaceholder] = useState('');

  // Plan Edit Modal
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

  const fetchAdminData = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      if (adminTab === 'users') {
        const params = new URLSearchParams();
        if (userSearch) params.append('search', userSearch);
        if (userPlanFilter !== 'all') params.append('plan', userPlanFilter);
        if (userStatusFilter !== 'all') params.append('status', userStatusFilter);

        const res = await fetch(`/api/admin/users?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setUsers(data.users || []);
        }
      } else if (adminTab === 'tools') {
        const res = await fetch('/api/admin/tools', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setTools(data.tools || []);
        }
      } else if (adminTab === 'plans') {
        const res = await fetch('/api/admin/plans', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setPlans(data.plans || []);
        }
      } else if (adminTab === 'analytics') {
        const res = await fetch('/api/admin/analytics', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setAnalytics(data);
        }
      } else if (adminTab === 'subscriptions') {
        const res = await fetch('/api/admin/subscriptions', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setSubscriptions(data.subscriptions || []);
        }
      }
    } catch {
      showToast('Failed to load admin data', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [token, adminTab, userSearch, userPlanFilter, userStatusFilter, showToast]);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  // User Actions: Block/Unblock, Change Role, Change Plan
  const handleUpdateUser = async (
    userId: string,
    updates: { status?: 'active' | 'blocked'; role?: 'user' | 'admin'; planId?: PlanTier }
  ) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, ...updates }),
      });

      const data = await res.json();
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, ...updates } : u))
        );
        showToast(data.message, 'success');
      } else {
        showToast(data.error || 'Failed to update user', 'error');
      }
    } catch {
      showToast('Network error updating user', 'error');
    }
  };

  // Tool Save / Delete Actions
  const handleSaveTool = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = '/api/admin/tools';
      const method = editingTool ? 'PUT' : 'POST';
      const body = {
        id: editingTool?.id,
        name: toolName,
        description: toolDesc,
        category: toolCategory,
        minPlan: toolMinPlan,
        systemPrompt: toolSysPrompt,
        inputPlaceholder: toolPlaceholder || 'Ask anything...',
        iconName: 'Sparkles',
      };

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(data.message, 'success');
        setShowToolModal(false);
        setEditingTool(null);
        fetchAdminData();
      } else {
        showToast(data.error || 'Failed to save tool', 'error');
      }
    } catch {
      showToast('Network error saving tool', 'error');
    }
  };

  const handleDeleteTool = async (toolId: string) => {
    if (!window.confirm('Are you sure you want to delete this AI tool?')) return;
    try {
      const res = await fetch(`/api/admin/tools?id=${toolId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setTools((prev) => prev.filter((t) => t.id !== toolId));
        showToast(data.message, 'info');
      }
    } catch {
      showToast('Failed to delete tool', 'error');
    }
  };

  const handleToggleTool = async (tool: Tool) => {
    try {
      const res = await fetch('/api/admin/tools', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: tool.id, enabled: !tool.enabled }),
      });
      if (res.ok) {
        setTools((prev) =>
          prev.map((t) => (t.id === tool.id ? { ...t, enabled: !t.enabled } : t))
        );
        showToast(`Tool ${!tool.enabled ? 'Enabled' : 'Disabled'}`, 'info');
      }
    } catch {
      showToast('Failed to toggle tool', 'error');
    }
  };

  // Plan Save Action
  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;
    try {
      const res = await fetch('/api/admin/plans', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editingPlan),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message, 'success');
        setEditingPlan(null);
        fetchAdminData();
      }
    } catch {
      showToast('Failed to save plan', 'error');
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-6 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600 text-white shadow">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
              Platform Administration Console
            </h1>
            <p className="text-xs text-zinc-500">
              Manage accounts, enforce access control policies, configure AI tools, and monitor system telemetry.
            </p>
          </div>
        </div>

        <button
          onClick={fetchAdminData}
          className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Subtabs Navigation */}
      <div className="mb-6 flex flex-wrap gap-2 border-b border-zinc-200 pb-3 dark:border-zinc-800">
        <button
          id="admin-subtab-users"
          onClick={() => setAdminTab('users')}
          className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition-all ${
            adminTab === 'users'
              ? 'bg-purple-600 text-white shadow'
              : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300'
          }`}
        >
          <Users className="h-4 w-4" />
          Users & Access Control
        </button>

        <button
          id="admin-subtab-tools"
          onClick={() => setAdminTab('tools')}
          className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition-all ${
            adminTab === 'tools'
              ? 'bg-purple-600 text-white shadow'
              : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300'
          }`}
        >
          <Wrench className="h-4 w-4" />
          AI Tools Manager
        </button>

        <button
          id="admin-subtab-plans"
          onClick={() => setAdminTab('plans')}
          className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition-all ${
            adminTab === 'plans'
              ? 'bg-purple-600 text-white shadow'
              : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300'
          }`}
        >
          <CreditCard className="h-4 w-4" />
          Subscription Plans
        </button>

        <button
          id="admin-subtab-analytics"
          onClick={() => setAdminTab('analytics')}
          className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition-all ${
            adminTab === 'analytics'
              ? 'bg-purple-600 text-white shadow'
              : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300'
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          Platform Analytics & Audit Logs
        </button>

        <button
          id="admin-subtab-subscriptions"
          onClick={() => setAdminTab('subscriptions')}
          className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition-all ${
            adminTab === 'subscriptions'
              ? 'bg-purple-600 text-white shadow'
              : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300'
          }`}
        >
          <Layers className="h-4 w-4" />
          All Subscriptions
        </button>
      </div>

      {/* TAB 1: USERS & ACCESS CONTROL */}
      {adminTab === 'users' && (
        <div className="space-y-4">
          {/* User Search & Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search user name or email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchAdminData()}
                className="w-full rounded-xl border border-zinc-200 bg-white py-2 pl-9 pr-3 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-purple-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={userPlanFilter}
                onChange={(e) => setUserPlanFilter(e.target.value)}
                className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
              >
                <option value="all">All Plans</option>
                <option value="free">Free</option>
                <option value="starter">Starter</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>

              <select
                value={userStatusFilter}
                onChange={(e) => setUserStatusFilter(e.target.value)}
                className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
              >
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
                <option value="blocked">Blocked Only</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/50 text-zinc-400">
                  <tr>
                    <th className="py-3 px-4 font-semibold">User / Email</th>
                    <th className="py-3 px-4 font-semibold">Role</th>
                    <th className="py-3 px-4 font-semibold">Subscription Plan</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold">Usage (Today/Total)</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                      <td className="py-3 px-4">
                        <p className="font-bold text-zinc-900 dark:text-white">{u.name}</p>
                        <p className="text-[11px] text-zinc-400">{u.email}</p>
                      </td>

                      <td className="py-3 px-4">
                        <select
                          value={u.role}
                          onChange={(e) => handleUpdateUser(u.id, { role: e.target.value as 'user' | 'admin' })}
                          className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs font-semibold text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>

                      <td className="py-3 px-4">
                        <select
                          value={u.planId}
                          onChange={(e) => handleUpdateUser(u.id, { planId: e.target.value as PlanTier })}
                          className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs font-semibold capitalize text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                        >
                          <option value="free">Free ($0)</option>
                          <option value="starter">Starter ($19)</option>
                          <option value="pro">Pro ($49)</option>
                          <option value="enterprise">Enterprise ($199)</option>
                        </select>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                            u.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                          }`}
                        >
                          {u.status === 'active' ? <CheckCircle2 className="h-3 w-3" /> : <Ban className="h-3 w-3" />}
                          {u.status}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                          {u.stats.todayRequests} reqs today
                        </span>
                        <span className="block text-[10px] text-zinc-400">
                          {u.stats.totalRequests} total · {u.stats.totalTokens.toLocaleString()} tokens
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        {u.status === 'active' ? (
                          <button
                            onClick={() => handleUpdateUser(u.id, { status: 'blocked' })}
                            className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300"
                          >
                            Block User
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUpdateUser(u.id, { status: 'active' })}
                            className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
                          >
                            Unblock
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AI TOOLS MANAGER */}
      {adminTab === 'tools' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Active AI Engine Tools ({tools.length})</h3>
            <button
              onClick={() => {
                setEditingTool(null);
                setToolName('');
                setToolDesc('');
                setToolCategory('productivity');
                setToolMinPlan('free');
                setToolSysPrompt('');
                setToolPlaceholder('');
                setShowToolModal(true);
              }}
              className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-3 py-2 text-xs font-bold text-white shadow hover:bg-purple-700"
            >
              <Plus className="h-4 w-4" />
              Add Custom AI Tool
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tools.map((tool) => (
              <div
                key={tool.id}
                className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-zinc-900 dark:text-white">{tool.name}</span>
                      <span className="rounded bg-purple-50 px-2 py-0.5 text-[10px] font-bold uppercase text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                        {tool.minPlan}
                      </span>
                    </div>

                    <button
                      onClick={() => handleToggleTool(tool)}
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        tool.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-200 text-zinc-600'
                      }`}
                    >
                      {tool.enabled ? 'Active' : 'Disabled'}
                    </button>
                  </div>

                  <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">{tool.description}</p>

                  <div className="mt-3 rounded-lg bg-zinc-50 p-2.5 font-mono text-[11px] text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300 line-clamp-2">
                    {tool.systemPrompt}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                  <span className="text-[11px] text-zinc-400 capitalize">Category: {tool.category}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingTool(tool);
                        setToolName(tool.name);
                        setToolDesc(tool.description);
                        setToolCategory(tool.category);
                        setToolMinPlan(tool.minPlan);
                        setToolSysPrompt(tool.systemPrompt);
                        setToolPlaceholder(tool.inputPlaceholder);
                        setShowToolModal(true);
                      }}
                      className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteTool(tool.id)}
                      className="rounded-lg p-1.5 text-zinc-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: PLANS MANAGER */}
      {adminTab === 'plans' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans.map((p) => (
              <div
                key={p.id}
                className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-zinc-900 dark:text-white">{p.name}</h4>
                    <span className="text-lg font-black text-zinc-900 dark:text-white">${p.price}/mo</span>
                  </div>

                  <p className="mt-2 text-xs text-zinc-500">{p.description}</p>

                  <div className="mt-4 space-y-1.5 text-xs text-zinc-700 dark:text-zinc-300">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Daily Requests:</span>
                      <strong>{p.dailyRequestLimit === -1 ? 'Unlimited' : p.dailyRequestLimit}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Upload Limit:</span>
                      <strong>{p.maxUploadMb} MB</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Models:</span>
                      <span className="truncate max-w-[120px]">{p.allowedModels.join(', ')}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                  <button
                    onClick={() => setEditingPlan({ ...p })}
                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                  >
                    Edit Plan Limits
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: PLATFORM ANALYTICS & AUDIT LOGS */}
      {adminTab === 'analytics' && analytics && (
        <div className="space-y-8">
          {/* Top Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Total Registered Users</span>
              <div className="mt-2 text-2xl font-extrabold text-zinc-900 dark:text-white">
                {analytics.metrics.totalUsers}
              </div>
              <span className="text-[11px] text-emerald-600 font-semibold">{analytics.metrics.activeUsers} active</span>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Platform AI Requests</span>
              <div className="mt-2 text-2xl font-extrabold text-zinc-900 dark:text-white">
                {analytics.metrics.totalRequests.toLocaleString()}
              </div>
              <span className="text-[11px] text-zinc-500">across web and API gateway</span>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Total Token Burn</span>
              <div className="mt-2 text-2xl font-extrabold text-zinc-900 dark:text-white">
                {analytics.metrics.totalTokens.toLocaleString()}
              </div>
              <span className="text-[11px] text-purple-600 font-semibold">tokens computed</span>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Estimated MRR</span>
              <div className="mt-2 text-2xl font-extrabold text-emerald-600">
                ${analytics.metrics.estimatedMonthlyRevenue.toLocaleString()}
              </div>
              <span className="text-[11px] text-zinc-500">monthly recurring revenue</span>
            </div>
          </div>

          {/* 14-Day Timeline Chart */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-4">
              14-Day Global Request Telemetry (Web vs Developer API)
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.timeline || []}>
                  <defs>
                    <linearGradient id="colorAdminReqs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" opacity={0.5} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181b',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="requests"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorAdminReqs)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Real-time System Request Audit Logs */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-4">
              Recent AI Request Audit Logs (Latest 50)
            </h3>
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/50 text-zinc-400">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">User</th>
                    <th className="py-2.5 px-3 font-semibold">Tool</th>
                    <th className="py-2.5 px-3 font-semibold">Prompt Extract</th>
                    <th className="py-2.5 px-3 font-semibold">Model</th>
                    <th className="py-2.5 px-3 font-semibold">Tokens</th>
                    <th className="py-2.5 px-3 font-semibold">Latency</th>
                    <th className="py-2.5 px-3 font-semibold">Channel</th>
                    <th className="py-2.5 px-3 font-semibold">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {analytics.recentLogs?.map((log: any) => (
                    <tr key={log.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                      <td className="py-2 px-3 font-semibold text-zinc-800 dark:text-zinc-200 truncate max-w-[140px]">
                        {log.userEmail}
                      </td>
                      <td className="py-2 px-3">{log.toolName}</td>
                      <td className="py-2 px-3 text-zinc-500 font-mono text-[11px] truncate max-w-[200px]">
                        {log.promptPreview}...
                      </td>
                      <td className="py-2 px-3">{log.model}</td>
                      <td className="py-2 px-3 font-semibold">{log.tokens}</td>
                      <td className="py-2 px-3 text-zinc-500">{log.latencyMs}ms</td>
                      <td className="py-2 px-3">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                            log.source === 'api'
                              ? 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                              : 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                          }`}
                        >
                          {log.source}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-zinc-400">
                        {new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: ALL SUBSCRIPTIONS */}
      {adminTab === 'subscriptions' && (
        <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/50 text-zinc-400">
                <tr>
                  <th className="py-3 px-4 font-semibold">User</th>
                  <th className="py-3 px-4 font-semibold">Subscribed Plan</th>
                  <th className="py-3 px-4 font-semibold">Monthly Rate</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Period End</th>
                  <th className="py-3 px-4 font-semibold">Auto-Renew</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {subscriptions.map((s) => (
                  <tr key={s.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                    <td className="py-3 px-4">
                      <p className="font-bold text-zinc-900 dark:text-white">{s.userName}</p>
                      <p className="text-[11px] text-zinc-400">{s.userEmail}</p>
                    </td>
                    <td className="py-3 px-4 font-semibold uppercase text-blue-600 dark:text-blue-400">
                      {s.planName}
                    </td>
                    <td className="py-3 px-4 font-bold text-zinc-900 dark:text-white">${s.price}/mo</td>
                    <td className="py-3 px-4">
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-zinc-500">
                      {new Date(s.currentPeriodEnd).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 font-semibold">
                      {s.cancelAtPeriodEnd ? (
                        <span className="text-rose-600">Cancels at period end</span>
                      ) : (
                        <span className="text-emerald-600">Active Recurring</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create / Edit Tool Modal */}
      {showToolModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">
              {editingTool ? 'Edit AI Tool Configuration' : 'Create New Custom AI Engine Tool'}
            </h3>

            <form onSubmit={handleSaveTool} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Tool Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., AI Regex Explainer"
                  value={toolName}
                  onChange={(e) => setToolName(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 bg-white p-2 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  required
                  placeholder="Explain complex regular expressions with step-by-step breakdowns."
                  value={toolDesc}
                  onChange={(e) => setToolDesc(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 bg-white p-2 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Minimum Plan Tier
                  </label>
                  <select
                    value={toolMinPlan}
                    onChange={(e) => setToolMinPlan(e.target.value as PlanTier)}
                    className="w-full rounded-lg border border-zinc-300 bg-white p-2 text-xs font-semibold capitalize text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  >
                    <option value="free">Free</option>
                    <option value="starter">Starter</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Category
                  </label>
                  <select
                    value={toolCategory}
                    onChange={(e) => setToolCategory(e.target.value as any)}
                    className="w-full rounded-lg border border-zinc-300 bg-white p-2 text-xs font-semibold capitalize text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  >
                    <option value="chat">Chat</option>
                    <option value="coding">Coding</option>
                    <option value="writing">Writing</option>
                    <option value="image">Image</option>
                    <option value="productivity">Productivity</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  System Instruction Prompt
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="You are an expert in parsing and explaining regular expressions..."
                  value={toolSysPrompt}
                  onChange={(e) => setToolSysPrompt(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 bg-white p-2 font-mono text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowToolModal(false)}
                  className="rounded-lg px-3 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-purple-600 px-4 py-2 text-xs font-bold text-white hover:bg-purple-700"
                >
                  Save Tool
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Plan Modal */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">
              Edit Plan: {editingPlan.name}
            </h3>

            <form onSubmit={handleSavePlan} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Monthly Price ($)
                </label>
                <input
                  type="number"
                  value={editingPlan.price}
                  onChange={(e) => setEditingPlan({ ...editingPlan, price: parseInt(e.target.value) || 0 })}
                  className="w-full rounded-lg border border-zinc-300 bg-white p-2 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Daily Requests Limit (-1 for unlimited)
                </label>
                <input
                  type="number"
                  value={editingPlan.dailyRequestLimit}
                  onChange={(e) => setEditingPlan({ ...editingPlan, dailyRequestLimit: parseInt(e.target.value) || 0 })}
                  className="w-full rounded-lg border border-zinc-300 bg-white p-2 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  File Upload Limit (MB)
                </label>
                <input
                  type="number"
                  value={editingPlan.maxUploadMb}
                  onChange={(e) => setEditingPlan({ ...editingPlan, maxUploadMb: parseInt(e.target.value) || 0 })}
                  className="w-full rounded-lg border border-zinc-300 bg-white p-2 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  className="rounded-lg px-3 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-purple-600 px-4 py-2 text-xs font-bold text-white hover:bg-purple-700"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
