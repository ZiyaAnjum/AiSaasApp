'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/context';
import { ApiKey } from '@/lib/types';
import {
  KeyRound,
  Plus,
  Copy,
  Check,
  Trash2,
  RefreshCw,
  Eye,
  EyeOff,
  Code2,
  Terminal,
  Send,
  Lock,
} from 'lucide-react';

export default function ApiKeyManager() {
  const { user, plan, token, setActiveTab, showToast } = useAuth();

  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [stats, setStats] = useState<{ totalApiRequests: number; totalKeys: number; activeKeys: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [revealedKeyIds, setRevealedKeyIds] = useState<Record<string, boolean>>({});

  // Interactive Live Tester state
  const [testApiKey, setTestApiKey] = useState<string>('');
  const [testPrompt, setTestPrompt] = useState<string>('Hello! Summarize quantum computing in 2 sentences.');
  const [testOutput, setTestOutput] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [codeLang, setCodeLang] = useState<'curl' | 'js' | 'python'>('curl');

  const fetchKeys = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/api-keys', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setKeys(data.keys || []);
        setStats(data.stats || null);
        if (data.keys && data.keys.length > 0 && !testApiKey) {
          setTestApiKey(data.keys[0].key);
        }
      }
    } catch {
      showToast('Failed to load API keys', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [token, testApiKey, showToast]);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys, user?.planId]);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setIsGenerating(true);
    try {
      const res = await fetch('/api/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newKeyName.trim() }),
      });

      const data = await res.json();
      if (res.ok) {
        setKeys((prev) => [...prev, data.key]);
        setNewKeyName('');
        setShowCreateModal(false);
        showToast('API Key generated successfully!', 'success');
        setRevealedKeyIds((prev) => ({ ...prev, [data.key.id]: true }));
        setTestApiKey(data.key.key);
      } else {
        showToast(data.error || 'Failed to create API key', 'error');
      }
    } catch {
      showToast('Network error creating API key', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerateKey = async (keyId: string) => {
    if (!window.confirm('Regenerating this key will immediately invalidate the old secret. Continue?')) {
      return;
    }

    try {
      const res = await fetch('/api/api-keys/regenerate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ keyId }),
      });

      const data = await res.json();
      if (res.ok) {
        setKeys((prev) => prev.map((k) => (k.id === keyId ? data.newKey : k)));
        setRevealedKeyIds((prev) => ({ ...prev, [keyId]: true }));
        showToast(data.message, 'success');
      } else {
        showToast(data.error || 'Failed to regenerate key', 'error');
      }
    } catch {
      showToast('Network error regenerating key', 'error');
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    if (!window.confirm('Are you sure you want to permanently delete and revoke this API key?')) {
      return;
    }

    try {
      const res = await fetch(`/api/api-keys?id=${keyId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setKeys((prev) => prev.filter((k) => k.id !== keyId));
        showToast('API Key deleted and revoked', 'info');
      }
    } catch {
      showToast('Failed to delete API key', 'error');
    }
  };

  const handleCopyKey = (keyString: string, id: string) => {
    navigator.clipboard.writeText(keyString);
    setCopiedKeyId(id);
    setTimeout(() => setCopiedKeyId(null), 2000);
    showToast('Secret key copied to clipboard', 'info');
  };

  const toggleReveal = (id: string) => {
    setRevealedKeyIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleRunLiveTest = async () => {
    if (!testApiKey.trim() || !testPrompt.trim() || isTesting) return;

    setIsTesting(true);
    setTestOutput(null);

    try {
      const res = await fetch('/api/v1/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': testApiKey.trim(),
        },
        body: JSON.stringify({
          message: testPrompt.trim(),
        }),
      });

      const data = await res.json();
      setTestOutput(JSON.stringify(data, null, 2));
      if (res.ok) {
        showToast(`API Call Successful (${data.latency_ms}ms)`, 'success');
        fetchKeys(); // Refresh call counters
      } else {
        showToast(data.error || 'API call returned an error', 'error');
      }
    } catch {
      setTestOutput(JSON.stringify({ error: 'Network error executing API request' }, null, 2));
    } finally {
      setIsTesting(false);
    }
  };

  const maskKey = (keyString: string) => {
    if (keyString.length < 16) return '••••••••••••';
    return `${keyString.slice(0, 10)}••••••••••••••••${keyString.slice(-4)}`;
  };

  const isFreePlan = user?.planId === 'free';

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-6 dark:border-zinc-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
            Developer API Keys & Gateway
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Generate and manage secret keys to integrate NexusAI SaaS directly into your apps and backends.
          </p>
        </div>

        <button
          id="btn-create-api-key"
          disabled={isFreePlan}
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
        >
          <Plus className="h-4 w-4" />
          Create New API Key
        </button>
      </div>

      {/* Free Plan Warning if Locked */}
      {isFreePlan && (
        <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/60 dark:bg-amber-950/40">
          <div className="flex items-start gap-3">
            <Lock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                API Key Generation Requires Starter Plan or Higher
              </h3>
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                You are currently on the <strong>Free Tier</strong>. Upgrade to <strong>Starter ($19/mo)</strong> or{' '}
                <strong>Pro ($49/mo)</strong> to generate production API keys and access the developer endpoints.
              </p>
              <button
                onClick={() => setActiveTab('pricing')}
                className="mt-3 inline-flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-amber-700"
              >
                Upgrade to Starter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Active Secret Keys</span>
          <div className="mt-2 text-2xl font-extrabold text-zinc-900 dark:text-white">
            {stats?.activeKeys || keys.length}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Total API Gateway Calls</span>
          <div className="mt-2 text-2xl font-extrabold text-zinc-900 dark:text-white">
            {stats?.totalApiRequests || 0}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Rate Limit Quota</span>
          <div className="mt-2 text-2xl font-extrabold text-zinc-900 dark:text-white capitalize">
            {plan?.dailyRequestLimit === -1 ? 'Unlimited' : `${plan?.dailyRequestLimit || 200}/day`}
          </div>
        </div>
      </div>

      {/* Keys Table */}
      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 mb-12 overflow-hidden">
        <div className="border-b border-zinc-100 p-5 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Your Secret API Keys</h3>
            <p className="text-xs text-zinc-500">Do not expose these keys in client-side code or public GitHub repositories.</p>
          </div>
          <button
            onClick={fetchKeys}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {keys.length === 0 ? (
          <div className="p-10 text-center text-xs text-zinc-500 dark:text-zinc-400">
            <KeyRound className="mx-auto h-8 w-8 text-zinc-400 mb-2" />
            No API keys generated yet. Click &quot;Create New API Key&quot; to begin.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/50 text-zinc-400">
                <tr>
                  <th className="py-3 px-4 font-semibold">Key Name</th>
                  <th className="py-3 px-4 font-semibold">Secret Key Token</th>
                  <th className="py-3 px-4 font-semibold">Total Calls</th>
                  <th className="py-3 px-4 font-semibold">Created</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {keys.map((k) => {
                  const isRevealed = revealedKeyIds[k.id];

                  return (
                    <tr key={k.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                      <td className="py-3 px-4 font-bold text-zinc-900 dark:text-white">{k.name}</td>
                      <td className="py-3 px-4 font-mono text-[11px] text-zinc-700 dark:text-zinc-300">
                        {isRevealed ? k.key : maskKey(k.key)}
                      </td>
                      <td className="py-3 px-4 font-semibold text-zinc-800 dark:text-zinc-200">
                        {k.totalCalls} calls
                      </td>
                      <td className="py-3 px-4 text-zinc-500">
                        {new Date(k.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => toggleReveal(k.id)}
                            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800"
                            title={isRevealed ? 'Hide Key' : 'Reveal Key'}
                          >
                            {isRevealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>

                          <button
                            onClick={() => handleCopyKey(k.key, k.id)}
                            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800"
                            title="Copy Key"
                          >
                            {copiedKeyId === k.id ? (
                              <Check className="h-4 w-4 text-emerald-600" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </button>

                          <button
                            onClick={() => handleRegenerateKey(k.id)}
                            className="rounded-lg p-1.5 text-zinc-400 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950/40"
                            title="Regenerate Key"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => handleDeleteKey(k.id)}
                            className="rounded-lg p-1.5 text-zinc-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                            title="Revoke & Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Developer Documentation & Interactive Sandbox */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Code Snippets (7 Cols) */}
        <div className="lg:col-span-7 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800 mb-4">
            <div className="flex items-center gap-2">
              <Code2 className="h-5 w-5 text-blue-500" />
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">API Integration Reference</h3>
            </div>

            <div className="flex rounded-lg border border-zinc-200 bg-zinc-50 p-0.5 dark:border-zinc-800 dark:bg-zinc-800">
              <button
                onClick={() => setCodeLang('curl')}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-md ${
                  codeLang === 'curl' ? 'bg-white shadow text-zinc-900 dark:bg-zinc-700 dark:text-white' : 'text-zinc-500'
                }`}
              >
                cURL
              </button>
              <button
                onClick={() => setCodeLang('js')}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-md ${
                  codeLang === 'js' ? 'bg-white shadow text-zinc-900 dark:bg-zinc-700 dark:text-white' : 'text-zinc-500'
                }`}
              >
                Node.js
              </button>
              <button
                onClick={() => setCodeLang('python')}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-md ${
                  codeLang === 'python' ? 'bg-white shadow text-zinc-900 dark:bg-zinc-700 dark:text-white' : 'text-zinc-500'
                }`}
              >
                Python
              </button>
            </div>
          </div>

          {/* Snippet Display */}
          <div className="relative rounded-xl bg-zinc-950 p-4 font-mono text-xs text-zinc-200 overflow-x-auto">
            {codeLang === 'curl' && (
              <pre>{`curl -X POST https://your-domain.com/api/v1/chat \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${keys[0]?.key || 'sk_live_starter_your_key_here'}" \\
  -d '{
    "message": "Explain OAuth2 PKCE flow in 2 sentences.",
    "model": "GPT-4 Turbo",
    "temperature": 0.7
  }'`}</pre>
            )}

            {codeLang === 'js' && (
              <pre>{`const response = await fetch('https://your-domain.com/api/v1/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': '${keys[0]?.key || 'sk_live_starter_your_key_here'}'
  },
  body: JSON.stringify({
    message: 'Write a TypeScript utility for slugifying strings',
    model: 'GPT-4 Turbo'
  })
});

const data = await response.json();
console.log(data.choices[0].message.content);`}</pre>
            )}

            {codeLang === 'python' && (
              <pre>{`import requests

url = "https://your-domain.com/api/v1/chat"
headers = {
    "Content-Type": "application/json",
    "x-api-key": "${keys[0]?.key || 'sk_live_starter_your_key_here'}"
}
payload = {
    "message": "Draft a follow up email for a SaaS demo",
    "model": "GPT-4 Turbo"
}

res = requests.post(url, json=payload, headers=headers)
print(res.json()["choices"][0]["message"]["content"])`}</pre>
            )}
          </div>
        </div>

        {/* Live Interactive API Tester (5 Cols) */}
        <div className="lg:col-span-5 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-2 border-b border-zinc-100 pb-3 dark:border-zinc-800 mb-4">
            <Terminal className="h-5 w-5 text-emerald-500" />
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Live API Console Tester</h3>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-500 mb-1">API Key Header</label>
              <input
                type="text"
                value={testApiKey}
                onChange={(e) => setTestApiKey(e.target.value)}
                placeholder="sk_live_..."
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50 p-2 font-mono text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-500 mb-1">Test Prompt</label>
              <input
                type="text"
                value={testPrompt}
                onChange={(e) => setTestPrompt(e.target.value)}
                placeholder="Enter prompt payload..."
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50 p-2 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-800 dark:text-white"
              />
            </div>

            <button
              onClick={handleRunLiveTest}
              disabled={isTesting || !testApiKey}
              className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {isTesting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Send Test Request (/api/v1/chat)
            </button>

            {testOutput && (
              <div className="mt-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Response Payload:</span>
                <pre className="mt-1 max-h-48 overflow-y-auto rounded-lg bg-zinc-950 p-3 font-mono text-[11px] text-emerald-400">
                  {testOutput}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Key Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">Create New API Key</h3>
            <p className="mt-1 text-xs text-zinc-500">
              Provide a descriptive label for your key to identify where it is being used (e.g. &quot;Backend Service&quot;).
            </p>

            <form onSubmit={handleCreateKey} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Key Name / Purpose
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Next.js Production Backend"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 bg-white p-2.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-lg px-3 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isGenerating || !newKeyName.trim()}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-xs font-bold text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900"
                >
                  {isGenerating ? 'Generating...' : 'Generate Secret Key'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
