'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/context';
import { Tool } from '@/lib/types';
import { DEFAULT_TOOLS } from '@/lib/constants';
import {
  MessageSquare,
  FileText,
  Code2,
  Mail,
  Sparkles,
  Database,
  Send,
  Copy,
  Check,
  Star,
  Download,
  Lock,
  Zap,
  SlidersHorizontal,
  Clock,
  Coins,
  ArrowRight,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';

export default function AiPlayground() {
  const { user, plan, token, setActiveTab, showToast } = useAuth();

  const [tools, setTools] = useState<Tool[]>(DEFAULT_TOOLS);
  const [selectedToolId, setSelectedToolId] = useState<string>('ai-chat');
  const [prompt, setPrompt] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [temperature, setTemperature] = useState<number>(0.7);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [currentResponse, setCurrentResponse] = useState<string | null>(null);
  const [responseMeta, setResponseMeta] = useState<{
    id?: string;
    model?: string;
    tokens?: { promptTokens: number; completionTokens: number; totalTokens: number };
    latencyMs?: number;
    date?: string;
    isFavorite?: boolean;
  } | null>(null);
  const [rateLimitError, setRateLimitError] = useState<{ message: string; limit: number; used: number } | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [showConfig, setShowConfig] = useState<boolean>(false);

  // Fetch tools from server
  const fetchTools = useCallback(async () => {
    try {
      const res = await fetch('/api/tools', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setTools(data.tools || []);
      }
    } catch (err) {
      console.error('Failed to load tools:', err);
    }
  }, [token]);

  useEffect(() => {
    fetchTools();
  }, [fetchTools, user?.planId]);

  const selectedTool = tools.find((t) => t.id === selectedToolId) || tools[0];

  useEffect(() => {
    if (selectedTool && selectedTool.availableModels.length > 0) {
      setSelectedModel(selectedTool.availableModels[0]);
    }
  }, [selectedToolId, tools, selectedTool]);

  const getToolIcon = (iconName: string) => {
    switch (iconName) {
      case 'MessageSquare':
        return <MessageSquare className="h-5 w-5" />;
      case 'FileText':
        return <FileText className="h-5 w-5" />;
      case 'Code2':
        return <Code2 className="h-5 w-5" />;
      case 'Mail':
        return <Mail className="h-5 w-5" />;
      case 'Sparkles':
        return <Sparkles className="h-5 w-5" />;
      case 'Database':
        return <Database className="h-5 w-5" />;
      default:
        return <Zap className="h-5 w-5" />;
    }
  };

  // Plan check helper
  const isAccessible = (minPlan: string) => {
    const ranks: Record<string, number> = { free: 1, starter: 2, pro: 3, enterprise: 4 };
    const userRank = ranks[user?.planId || 'free'] || 1;
    const requiredRank = ranks[minPlan] || 1;
    return userRank >= requiredRank;
  };

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    if (!user) {
      showToast('Please sign in to run AI requests', 'info');
      return;
    }

    if (!selectedTool) return;

    if (!isAccessible(selectedTool.minPlan)) {
      showToast(`Upgrade to ${selectedTool.minPlan.toUpperCase()} plan to use this tool`, 'error');
      return;
    }

    setIsGenerating(true);
    setRateLimitError(null);
    setCurrentResponse(null);

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          toolId: selectedTool.id,
          prompt: prompt.trim(),
          model: selectedModel,
          temperature,
        }),
      });

      const data = await res.json();

      if (res.status === 429) {
        setRateLimitError({
          message: data.error || 'Daily request quota exceeded',
          limit: data.dailyLimit,
          used: data.dailyUsed,
        });
        showToast('Daily rate limit exceeded. Upgrade your plan for higher quota.', 'error');
        return;
      }

      if (!res.ok) {
        showToast(data.error || 'Failed to generate response', 'error');
        return;
      }

      setCurrentResponse(data.data.response);
      setResponseMeta({
        id: data.data.id,
        model: data.data.model,
        tokens: data.data.tokens,
        latencyMs: data.data.latencyMs,
        date: data.data.date,
        isFavorite: false,
      });

      showToast(`Generated in ${data.data.latencyMs}ms (${data.data.tokens.totalTokens} tokens)`, 'success');
    } catch {
      showToast('Network error generating response', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!currentResponse) return;
    navigator.clipboard.writeText(currentResponse);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showToast('Copied to clipboard', 'info');
  };

  const handleToggleFavorite = async () => {
    if (!responseMeta?.id) return;
    try {
      const res = await fetch('/api/ai/history', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: responseMeta.id,
          isFavorite: !responseMeta.isFavorite,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setResponseMeta((prev) => (prev ? { ...prev, isFavorite: data.isFavorite } : null));
        showToast(data.message, 'success');
      }
    } catch {
      showToast('Failed to update favorite', 'error');
    }
  };

  const handleExport = (format: 'md' | 'json' | 'txt') => {
    if (!currentResponse) return;
    let content = currentResponse;
    let mimeType = 'text/plain';
    const filename = `${selectedTool?.id || 'ai-response'}-${Date.now()}.${format}`;

    if (format === 'json') {
      content = JSON.stringify(
        {
          tool: selectedTool?.name,
          prompt,
          response: currentResponse,
          metadata: responseMeta,
        },
        null,
        2
      );
      mimeType = 'application/json';
    } else if (format === 'md') {
      content = `# Prompt:\n${prompt}\n\n## Response (${responseMeta?.model || 'AI'}):\n${currentResponse}`;
      mimeType = 'text/markdown';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Exported as ${format.toUpperCase()}`, 'info');
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header Banner */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 pb-6 dark:border-zinc-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
            AI SaaS Tools Studio
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Access enterprise-grade LLM models, code synthesis, summarization, and prompt engineering engines.
          </p>
        </div>

        {/* Current Plan Badge & Upgrade CTA */}
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">Plan Tier:</span>
              <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold uppercase text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                {plan?.name || user?.planId || 'Free'}
              </span>
            </div>
            <div className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
              {plan?.dailyRequestLimit === -1 ? 'Unlimited requests' : `${plan?.dailyRequestLimit || 20} requests/day`}
            </div>
          </div>

          {user?.planId !== 'enterprise' && (
            <button
              id="playground-upgrade-btn"
              onClick={() => setActiveTab('pricing')}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-xs font-bold text-white shadow-md hover:from-blue-700 hover:to-indigo-700"
            >
              <Zap className="h-4 w-4 fill-white" />
              Upgrade Plan
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Tool Picker on Left, Playground on Right */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Tools Selection List (4 Cols) */}
        <div className="lg:col-span-4 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 px-1">
            Available AI Engines ({tools.length})
          </h2>

          <div className="space-y-2">
            {tools.map((tool) => {
              const unlocked = isAccessible(tool.minPlan);
              const isSelected = selectedTool?.id === tool.id;

              return (
                <button
                  key={tool.id}
                  id={`tool-select-${tool.id}`}
                  onClick={() => {
                    setSelectedToolId(tool.id);
                    setPrompt('');
                    setCurrentResponse(null);
                    setRateLimitError(null);
                  }}
                  className={`w-full flex items-start gap-3.5 rounded-xl border p-3.5 text-left transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50/70 shadow-sm dark:border-blue-500/80 dark:bg-blue-950/30'
                      : 'border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-zinc-700'
                  }`}
                >
                  <div
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                    }`}
                  >
                    {getToolIcon(tool.iconName)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                        {tool.name}
                      </p>
                      {!unlocked && (
                        <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                          <Lock className="h-2.5 w-2.5" />
                          {tool.minPlan.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                      {tool.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Playground Workspace (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          {selectedTool && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              {/* Tool Header & Configuration Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 pb-4 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
                    {getToolIcon(selectedTool.iconName)}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                      {selectedTool.name}
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Tier required: <span className="font-semibold uppercase">{selectedTool.minPlan}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    id="toggle-model-params-btn"
                    onClick={() => setShowConfig(!showConfig)}
                    className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300"
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    <span>Parameters</span>
                  </button>

                  <select
                    id="playground-model-select"
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-800 focus:outline-none dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
                  >
                    {selectedTool.availableModels.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Parameter Drawer */}
              {showConfig && (
                <div className="my-4 rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="flex justify-between text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                        <span>Temperature (Creativity)</span>
                        <span className="font-mono text-blue-600">{temperature}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={temperature}
                        onChange={(e) => setTemperature(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer dark:bg-zinc-700"
                      />
                      <div className="flex justify-between text-[10px] text-zinc-400 mt-1">
                        <span>Precise (0.0)</span>
                        <span>Creative (1.0)</span>
                      </div>
                    </div>

                    <div>
                      <span className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                        System Prompt Guardrail
                      </span>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 font-mono text-[11px] line-clamp-2">
                        {selectedTool.systemPrompt}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Locked State Warning Banner if Plan Insufficient */}
              {!isAccessible(selectedTool.minPlan) && (
                <div className="my-6 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/40">
                  <div className="flex items-start gap-3">
                    <Lock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wide">
                        Plan Upgrade Required
                      </h4>
                      <p className="mt-1 text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                        This tool requires a{' '}
                        <strong className="underline uppercase">{selectedTool.minPlan}</strong> plan or higher. You are
                        currently on the <strong>{user?.planId.toUpperCase()}</strong> tier.
                      </p>
                      <button
                        onClick={() => setActiveTab('pricing')}
                        className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-amber-700"
                      >
                        Upgrade Now to Unlock
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Rate Limit Exceeded Warning */}
              {rateLimitError && (
                <div className="my-4 rounded-xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/60 dark:bg-rose-950/40">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-xs font-bold text-rose-900 dark:text-rose-200">
                        Daily Rate Limit Reached
                      </h4>
                      <p className="mt-1 text-xs text-rose-700 dark:text-rose-300">
                        {rateLimitError.message} ({rateLimitError.used}/{rateLimitError.limit} requests used today).
                      </p>
                      <button
                        onClick={() => setActiveTab('pricing')}
                        className="mt-2.5 inline-flex items-center gap-1 rounded-md bg-rose-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-rose-700"
                      >
                        Upgrade Plan for More Requests
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Prompt Input Form */}
              <form onSubmit={handleGenerate} className="mt-4 space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                      Your Prompt
                    </label>
                    <span className="text-[11px] text-zinc-400">{prompt.length} characters</span>
                  </div>
                  <textarea
                    id="playground-prompt-input"
                    rows={4}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={selectedTool.inputPlaceholder}
                    className="w-full rounded-xl border border-zinc-300 bg-zinc-50/50 p-3.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-white dark:focus:bg-zinc-800"
                  />
                </div>

                {/* Sample Prompt Chips */}
                {selectedTool.samplePrompts && selectedTool.samplePrompts.length > 0 && (
                  <div>
                    <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                      Try Sample Prompts:
                    </span>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {selectedTool.samplePrompts.map((sample, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setPrompt(sample)}
                          className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-left text-xs text-zinc-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-zinc-800 dark:bg-zinc-800/80 dark:text-zinc-300 dark:hover:border-blue-700 dark:hover:bg-blue-950/40"
                        >
                          &quot;{sample.slice(0, 55)}...&quot;
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPrompt('');
                      setCurrentResponse(null);
                    }}
                    className="rounded-lg px-3 py-2 text-xs font-semibold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    Clear Input
                  </button>

                  <button
                    id="generate-ai-btn"
                    type="submit"
                    disabled={isGenerating || !prompt.trim()}
                    className="flex items-center gap-2 rounded-xl bg-zinc-900 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Generating Response...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Execute Request
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Response Panel */}
              {currentResponse && (
                <div className="mt-8 rounded-xl border border-zinc-200 bg-zinc-50/50 p-5 dark:border-zinc-800 dark:bg-zinc-950/50">
                  {/* Response Meta Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200/80 pb-3 dark:border-zinc-800">
                    <div className="flex items-center gap-3 text-xs text-zinc-500">
                      <span className="flex items-center gap-1 font-semibold text-zinc-900 dark:text-white">
                        <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                        {responseMeta?.model || 'AI Model'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-zinc-400" />
                        {responseMeta?.latencyMs || 0}ms
                      </span>
                      <span className="flex items-center gap-1">
                        <Coins className="h-3.5 w-3.5 text-amber-500" />
                        {responseMeta?.tokens?.totalTokens || 0} tokens
                      </span>
                    </div>

                    {/* Action Controls: Copy, Favorite, Export */}
                    <div className="flex items-center gap-1.5">
                      <button
                        id="response-copy-btn"
                        onClick={handleCopy}
                        className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                      >
                        {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                        {copied ? 'Copied' : 'Copy'}
                      </button>

                      <button
                        id="response-fav-btn"
                        onClick={handleToggleFavorite}
                        className={`flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold ${
                          responseMeta?.isFavorite
                            ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300'
                            : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200'
                        }`}
                      >
                        <Star
                          className={`h-3.5 w-3.5 ${
                            responseMeta?.isFavorite ? 'fill-amber-500 text-amber-500' : 'text-zinc-400'
                          }`}
                        />
                        Favorite
                      </button>

                      {/* Export Dropdown */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleExport('md')}
                          className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                          title="Export Markdown"
                        >
                          .MD
                        </button>
                        <button
                          onClick={() => handleExport('json')}
                          className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                          title="Export JSON"
                        >
                          .JSON
                        </button>
                        <button
                          onClick={() => handleExport('txt')}
                          className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                          title="Export TXT"
                        >
                          <Download className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Formatted Output Display */}
                  <div className="mt-4 prose prose-sm max-w-none text-zinc-800 dark:text-zinc-200 dark:prose-invert">
                    <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed overflow-x-auto p-3 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200/80 dark:border-zinc-800">
                      {currentResponse}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
