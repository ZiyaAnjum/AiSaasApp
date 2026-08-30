'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/context';
import { Plan, PlanTier } from '@/lib/types';
import {
  Check,
  RefreshCw,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function PricingPlans() {
  const { user, plan: currentPlan, subscription, token, refreshSession, showToast, setShowAuthModal } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);

  const fetchPlans = useCallback(async () => {
    try {
      const res = await fetch('/api/plans');
      if (res.ok) {
        const data = await res.json();
        setPlans(data.plans || []);
      }
    } catch {
      showToast('Failed to load plans', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const handlePlanAction = async (targetPlanId: PlanTier) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    if (user.planId === targetPlanId) {
      showToast(`You are already subscribed to the ${targetPlanId.toUpperCase()} plan`, 'info');
      return;
    }

    setProcessingPlanId(targetPlanId);
    try {
      const res = await fetch('/api/subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ planId: targetPlanId }),
      });

      const data = await res.json();
      if (res.ok) {
        // Trigger celebratory confetti on upgrade
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });

        showToast(data.message || `Switched to ${targetPlanId.toUpperCase()} plan!`, 'success');
        await refreshSession();
      } else {
        showToast(data.error || 'Failed to update plan', 'error');
      }
    } catch {
      showToast('Network error while updating subscription', 'error');
    } finally {
      setProcessingPlanId(null);
    }
  };

  const handleCancelSubscription = async () => {
    if (!window.confirm('Are you sure you want to cancel your subscription renewal? Your plan features will remain active until the end of the billing period.')) {
      return;
    }

    try {
      const res = await fetch('/api/subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'cancel' }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(data.message, 'info');
        await refreshSession();
      }
    } catch {
      showToast('Failed to cancel subscription', 'error');
    }
  };

  const handleReactivate = async () => {
    try {
      const res = await fetch('/api/subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'reactivate' }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(data.message, 'success');
        await refreshSession();
      }
    } catch {
      showToast('Failed to reactivate subscription', 'error');
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mx-auto max-w-3xl text-center mb-12">
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
          Transparent AI SaaS Subscriptions
        </span>
        <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
          Predictable Pricing for High-Performance AI
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Scale effortlessly from individual prototyping to high-concurrency enterprise pipelines.
        </p>

        {/* Current Active Plan Banner */}
        {user && (
          <div className="mt-6 inline-flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <span className="text-xs text-zinc-500">Current Active Subscription:</span>
            <span className="rounded-full bg-blue-600 px-3 py-0.5 text-xs font-bold uppercase text-white">
              {currentPlan?.name || user.planId} (${currentPlan?.price || 0}/mo)
            </span>

            {subscription?.cancelAtPeriodEnd ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold">
                  (Cancels at period end)
                </span>
                <button
                  onClick={handleReactivate}
                  className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700"
                >
                  Resume Subscription
                </button>
              </div>
            ) : user.planId !== 'free' ? (
              <button
                onClick={handleCancelSubscription}
                className="text-xs font-semibold text-rose-600 hover:underline dark:text-rose-400"
              >
                Cancel Renewal
              </button>
            ) : null}
          </div>
        )}
      </div>

      {/* Pricing Cards Grid */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {plans.map((p) => {
            const isCurrent = user?.planId === p.id;
            const isProcessing = processingPlanId === p.id;

            return (
              <div
                key={p.id}
                id={`plan-card-${p.id}`}
                className={`relative flex flex-col justify-between rounded-2xl border p-6 transition-all ${
                  p.popular
                    ? 'border-blue-500 bg-white shadow-xl ring-2 ring-blue-500/20 dark:border-blue-500 dark:bg-zinc-900'
                    : isCurrent
                    ? 'border-zinc-400 bg-white shadow-md dark:border-zinc-600 dark:bg-zinc-900'
                    : 'border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/70 dark:hover:border-zinc-700'
                }`}
              >
                {/* Popular or Tier Badge */}
                {p.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white shadow-sm">
                    Most Popular
                  </div>
                )}

                <div>
                  {/* Plan Name & Description */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white">{p.name}</h3>
                    {p.badge && !p.popular && (
                      <span className="rounded bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                        {p.badge}
                      </span>
                    )}
                  </div>

                  <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 min-h-[36px]">
                    {p.description}
                  </p>

                  {/* Pricing Display */}
                  <div className="mt-4 flex items-baseline">
                    <span className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white">
                      ${p.price}
                    </span>
                    <span className="ml-1 text-xs text-zinc-500">/month</span>
                  </div>

                  {/* Key Quota Limits Box */}
                  <div className="mt-4 rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800">
                    <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center justify-between">
                      <span>Daily Limit:</span>
                      <strong className="text-blue-600 dark:text-blue-400">
                        {p.dailyRequestLimit === -1 ? 'Unlimited' : `${p.dailyRequestLimit} reqs/day`}
                      </strong>
                    </div>
                    <div className="mt-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center justify-between">
                      <span>Upload Limit:</span>
                      <span>{p.maxUploadMb} MB</span>
                    </div>
                  </div>

                  {/* Feature Checklist */}
                  <div className="mt-6 space-y-2.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                      Included Capabilities:
                    </p>
                    {p.features.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-zinc-600 dark:text-zinc-300">
                        <Check className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Subscription Action Button */}
                <div className="mt-8 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                  <button
                    id={`btn-subscribe-${p.id}`}
                    disabled={isCurrent || isProcessing}
                    onClick={() => handlePlanAction(p.id)}
                    className={`w-full rounded-xl py-2.5 text-center text-xs font-bold transition-all ${
                      isCurrent
                        ? 'bg-zinc-100 text-zinc-500 cursor-default dark:bg-zinc-800 dark:text-zinc-400'
                        : p.popular
                        ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700'
                        : 'bg-zinc-900 text-white shadow-sm hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100'
                    }`}
                  >
                    {isProcessing ? (
                      <RefreshCw className="mx-auto h-4 w-4 animate-spin" />
                    ) : isCurrent ? (
                      'Current Active Plan'
                    ) : user ? (
                      p.price > (currentPlan?.price || 0) ? (
                        `Upgrade to ${p.name}`
                      ) : (
                        `Downgrade to ${p.name}`
                      )
                    ) : (
                      `Get Started with ${p.name}`
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Comparison Feature Matrix */}
      <div className="mt-16 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="text-base font-bold text-zinc-900 dark:text-white mb-4">
          Detailed Feature Comparison Matrix
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400">
                <th className="py-3 font-semibold">Feature / Spec</th>
                <th className="py-3 font-semibold">Free ($0)</th>
                <th className="py-3 font-semibold">Starter ($19)</th>
                <th className="py-3 font-semibold">Pro ($49)</th>
                <th className="py-3 font-semibold">Enterprise ($199)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300">
              <tr>
                <td className="py-3 font-medium">Daily Requests Quota</td>
                <td className="py-3">20 / day</td>
                <td className="py-3">200 / day</td>
                <td className="py-3 font-semibold text-blue-600">1,500 / day</td>
                <td className="py-3 font-semibold text-purple-600">10,000 / day</td>
              </tr>
              <tr>
                <td className="py-3 font-medium">Supported Models</td>
                <td className="py-3">GPT-3.5 & Gemini Flash</td>
                <td className="py-3">GPT-4 Turbo & Gemini Pro</td>
                <td className="py-3">GPT-4o, Claude 3.5 & DALL-E 3</td>
                <td className="py-3">All Models + Custom Finetuning</td>
              </tr>
              <tr>
                <td className="py-3 font-medium">AI Tools Suite</td>
                <td className="py-3">Chat & Summarizer</td>
                <td className="py-3">Code Gen & Email Writer</td>
                <td className="py-3 font-semibold">Full AI Suite (Image & SQL)</td>
                <td className="py-3 font-semibold">Full Suite + Custom Tools</td>
              </tr>
              <tr>
                <td className="py-3 font-medium">Developer API Key Access</td>
                <td className="py-3 text-zinc-400">—</td>
                <td className="py-3">Included (5k calls/mo)</td>
                <td className="py-3 font-semibold">Unlimited Keys</td>
                <td className="py-3 font-semibold">Dedicated High-Speed Gateway</td>
              </tr>
              <tr>
                <td className="py-3 font-medium">File Upload Limit</td>
                <td className="py-3">5 MB</td>
                <td className="py-3">25 MB</td>
                <td className="py-3">100 MB</td>
                <td className="py-3">500 MB</td>
              </tr>
              <tr>
                <td className="py-3 font-medium">Team Access</td>
                <td className="py-3 text-zinc-400">—</td>
                <td className="py-3 text-zinc-400">—</td>
                <td className="py-3 text-zinc-400">—</td>
                <td className="py-3 font-semibold text-purple-600">Up to 15 Seats</td>
              </tr>
              <tr>
                <td className="py-3 font-medium">Priority Queue & SLA</td>
                <td className="py-3 text-zinc-400">Standard</td>
                <td className="py-3">Fast</td>
                <td className="py-3 font-semibold">High Priority</td>
                <td className="py-3 font-semibold text-purple-600">Ultra Priority (99.99% SLA)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
