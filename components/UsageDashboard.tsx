'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/context';
import { UsageSummary } from '@/lib/types';
import {
  Coins,
  Zap,
  Activity,
  Calendar,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export default function UsageDashboard() {
  const { token, user, plan, setActiveTab } = useAuth();
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUsage = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/usage', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSummary(data.summary);
      }
    } catch (err) {
      console.error('Failed to load usage summary:', err);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage, user?.planId]);

  const dailyPercentage =
    summary && summary.dailyLimit > 0
      ? Math.min(100, Math.round((summary.dailyUsed / summary.dailyLimit) * 100))
      : 0;

  const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#6366f1'];

  const toolPieData = summary
    ? Object.entries(summary.toolBreakdown || {}).map(([name, value]) => ({
        name,
        value,
      }))
    : [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-6 dark:border-zinc-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
            Usage Tracking & Telemetry
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Monitor real-time AI quota consumption, token burn rates, and tool activity logs.
          </p>
        </div>

        <button
          onClick={fetchUsage}
          className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Stats
        </button>
      </div>

      {isLoading && !summary ? (
        <div className="flex flex-col items-center justify-center py-20">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
          <p className="mt-3 text-xs text-zinc-500">Aggregating telemetry logs...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Daily Quota Card */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Daily Quota Used
                </span>
                <Activity className="h-4 w-4 text-blue-500" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-zinc-900 dark:text-white">
                  {summary?.dailyUsed || 0}
                </span>
                <span className="text-xs text-zinc-500">
                  / {summary?.dailyLimit === -1 ? 'Unlimited' : `${summary?.dailyLimit || 20} reqs`}
                </span>
              </div>

              {/* Progress Bar */}
              {summary?.dailyLimit !== -1 && (
                <div className="mt-3">
                  <div className="flex justify-between text-[10px] font-semibold text-zinc-500 mb-1">
                    <span>{dailyPercentage}% consumed</span>
                    <span>{summary?.dailyRemaining || 0} remaining</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        dailyPercentage > 85 ? 'bg-rose-500' : dailyPercentage > 60 ? 'bg-amber-500' : 'bg-blue-600'
                      }`}
                      style={{ width: `${dailyPercentage}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Remaining Requests Card */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Remaining Today
                </span>
                <Zap className="h-4 w-4 text-amber-500" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-zinc-900 dark:text-white">
                  {summary?.dailyLimit === -1 ? '∞' : summary?.dailyRemaining || 0}
                </span>
                <span className="text-xs text-zinc-500">requests left</span>
              </div>
              <p className="mt-2 text-[11px] text-zinc-500">
                Resets at 00:00 UTC daily for your tier.
              </p>
            </div>

            {/* Monthly Requests */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Monthly Total
                </span>
                <Calendar className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-zinc-900 dark:text-white">
                  {summary?.monthlyUsed || 0}
                </span>
                <span className="text-xs text-zinc-500">requests this billing cycle</span>
              </div>
              <p className="mt-2 text-[11px] text-zinc-500">
                Active plan: <strong className="capitalize">{plan?.name || user?.planId}</strong>
              </p>
            </div>

            {/* Total Tokens Card */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Total Tokens Burned
                </span>
                <Coins className="h-4 w-4 text-purple-500" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-zinc-900 dark:text-white">
                  {(summary?.totalTokensUsed || 0).toLocaleString()}
                </span>
                <span className="text-xs text-zinc-500">tokens</span>
              </div>
              <p className="mt-2 text-[11px] text-zinc-500">
                Computed across prompt & completion payloads.
              </p>
            </div>
          </div>

          {/* Near Limit Warning Banner */}
          {dailyPercentage > 85 && summary?.dailyLimit !== -1 && (
            <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/40">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                    Approaching Daily Quota Limit ({dailyPercentage}%)
                  </h4>
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    You only have {summary?.dailyRemaining} requests remaining today on the {plan?.name} plan.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('pricing')}
                className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700 shadow-sm"
              >
                Upgrade Plan
              </button>
            </div>
          )}

          {/* Charts Row */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            {/* Daily Request Timeline Chart (8 Cols) */}
            <div className="lg:col-span-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                    7-Day Activity & Token Consumption
                  </h3>
                  <p className="text-xs text-zinc-500">Daily breakdown of requests executed</p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 text-blue-600">
                    <span className="h-2 w-2 rounded-full bg-blue-600" /> Requests
                  </span>
                  <span className="flex items-center gap-1 text-purple-600">
                    <span className="h-2 w-2 rounded-full bg-purple-600" /> Tokens
                  </span>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={summary?.dailyTrend || []}>
                    <defs>
                      <linearGradient id="colorReqs" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" opacity={0.5} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#71717a' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#71717a' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#18181b',
                        borderColor: '#27272a',
                        borderRadius: '8px',
                        color: '#ffffff',
                        fontSize: '12px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="requests"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorReqs)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Tool Usage Breakdown (4 Cols) */}
            <div className="lg:col-span-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-1">
                Tool Usage Distribution
              </h3>
              <p className="text-xs text-zinc-500 mb-4">Requests processed per AI engine</p>

              {toolPieData.length > 0 ? (
                <div className="space-y-4">
                  <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={toolPieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={65}
                          paddingAngle={3}
                        >
                          {toolPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#18181b',
                            borderRadius: '8px',
                            color: '#ffffff',
                            fontSize: '12px',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Tool List with Counts */}
                  <div className="space-y-2 max-h-36 overflow-y-auto">
                    {toolPieData.map((item, idx) => (
                      <div key={item.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 truncate">
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                          />
                          <span className="text-zinc-700 dark:text-zinc-300 truncate">{item.name}</span>
                        </div>
                        <span className="font-semibold text-zinc-900 dark:text-white">{item.value} reqs</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex h-48 items-center justify-center text-center text-xs text-zinc-400">
                  No tool activity recorded yet
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
