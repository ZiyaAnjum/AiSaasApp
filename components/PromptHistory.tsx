'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/context';
import { AiRequestLog } from '@/lib/types';
import {
  History,
  Search,
  Star,
  Trash2,
  Copy,
  Check,
  Calendar,
  Filter,
  RefreshCw,
  Clock,
  Coins,
  Volume2,
  VolumeX,
  Swords,
  Tag,
  Folder,
  Download,
} from 'lucide-react';

export default function PromptHistory() {
  const { token, showToast } = useAuth();

  const [history, setHistory] = useState<AiRequestLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedToolFilter, setSelectedToolFilter] = useState('all');
  const [selectedWorkspace, setSelectedWorkspace] = useState('all');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [arenaOnly, setArenaOnly] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Audio Voice Narration (TTS)
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedToolFilter !== 'all') params.append('toolId', selectedToolFilter);
      if (selectedWorkspace !== 'all') params.append('workspace', selectedWorkspace);
      if (searchQuery) params.append('search', searchQuery);
      if (favoritesOnly) params.append('favorites', 'true');
      if (arenaOnly) params.append('arena', 'true');

      const res = await fetch(`/api/ai/history?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
      }
    } catch {
      showToast('Failed to load history', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [token, selectedToolFilter, selectedWorkspace, searchQuery, favoritesOnly, arenaOnly, showToast]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchHistory();
  };

  const handleToggleFavorite = async (id: string, currentFav: boolean) => {
    try {
      const res = await fetch('/api/ai/history', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id, isFavorite: !currentFav }),
      });

      if (res.ok) {
        setHistory((prev) =>
          prev.map((item) => (item.id === id ? { ...item, isFavorite: !currentFav } : item))
        );
        showToast(!currentFav ? 'Added to favorites' : 'Removed from favorites', 'success');
      }
    } catch {
      showToast('Failed to toggle favorite', 'error');
    }
  };

  const handleSetArenaWinner = async (id: string, winner: 'modelA' | 'modelB' | 'tie') => {
    try {
      const res = await fetch('/api/ai/history', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id, arenaWinner: winner }),
      });

      if (res.ok) {
        setHistory((prev) =>
          prev.map((item) => (item.id === id ? { ...item, arenaWinner: winner } : item))
        );
        showToast(`Arena winner preference saved`, 'success');
      }
    } catch {
      showToast('Failed to update arena preference', 'error');
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      const res = await fetch(`/api/ai/history?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setHistory((prev) => prev.filter((item) => item.id !== id));
        showToast('History item removed', 'info');
      }
    } catch {
      showToast('Failed to delete item', 'error');
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to clear your entire prompt history? This cannot be undone.')) {
      return;
    }

    try {
      const res = await fetch('/api/ai/history?clearAll=true', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setHistory([]);
        showToast('All prompt history cleared', 'info');
      }
    } catch {
      showToast('Failed to clear history', 'error');
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    showToast('Response copied to clipboard', 'info');
  };

  const handleToggleVoice = (text: string, id: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      showToast('Speech synthesis not available', 'info');
      return;
    }

    if (speakingId === id) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.replace(/[#*`_]/g, ''));
    utterance.onstart = () => setSpeakingId(id);
    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);
    window.speechSynthesis.speak(utterance);
  };

  const handleExportItem = (item: AiRequestLog) => {
    const data = JSON.stringify(item, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexus-log-${item.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Exported log entry as JSON', 'info');
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-6 dark:border-zinc-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
            Prompt Request History & Telemetry
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Search, bookmark, export, and listen to previous prompts, streaming outputs, and arena battle comparisons.
          </p>
        </div>

        {history.length > 0 && (
          <button
            id="clear-all-history-btn"
            onClick={handleClearAll}
            className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
          >
            <Trash2 className="h-4 w-4" />
            Clear All History
          </button>
        )}
      </div>

      {/* Filter and Search Controls */}
      <div className="mb-6 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search within prompts, responses, tags, or tools..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 bg-white py-2 pl-9 pr-20 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1.5 rounded-lg bg-zinc-900 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900"
          >
            Filter
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2">
          {/* Workspace Filter */}
          <div className="flex items-center gap-1.5">
            <Folder className="h-3.5 w-3.5 text-zinc-400" />
            <select
              value={selectedWorkspace}
              onChange={(e) => setSelectedWorkspace(e.target.value)}
              className="rounded-xl border border-zinc-200 bg-white px-2.5 py-2 text-xs font-semibold text-zinc-700 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
            >
              <option value="all">All Workspaces</option>
              <option value="Default">Default</option>
              <option value="Production">Production</option>
              <option value="Marketing">Marketing</option>
              <option value="DevOps">DevOps</option>
              <option value="Research">Research</option>
            </select>
          </div>

          {/* Tool Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-zinc-400" />
            <select
              value={selectedToolFilter}
              onChange={(e) => setSelectedToolFilter(e.target.value)}
              className="rounded-xl border border-zinc-200 bg-white px-2.5 py-2 text-xs font-semibold text-zinc-700 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
            >
              <option value="all">All AI Tools</option>
              <option value="ai-chat">AI Chat</option>
              <option value="ai-code-generator">AI Code Generator</option>
              <option value="ai-text-summarizer">AI Text Summarizer</option>
              <option value="ai-image-prompt">AI Image Prompt</option>
              <option value="ai-email-writer">AI Email Writer</option>
              <option value="ai-sql-builder">AI SQL Builder</option>
            </select>
          </div>

          {/* Arena Battle Toggle */}
          <button
            onClick={() => setArenaOnly(!arenaOnly)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
              arenaOnly
                ? 'border-purple-300 bg-purple-50 text-purple-800 dark:border-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300'
            }`}
          >
            <Swords className="h-3.5 w-3.5 text-purple-500" />
            Arena Only
          </button>

          {/* Favorites Toggle */}
          <button
            onClick={() => setFavoritesOnly(!favoritesOnly)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
              favoritesOnly
                ? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300'
            }`}
          >
            <Star className={`h-3.5 w-3.5 ${favoritesOnly ? 'fill-amber-500 text-amber-500' : 'text-zinc-400'}`} />
            Favorites
          </button>

          <button
            onClick={fetchHistory}
            className="rounded-xl border border-zinc-200 bg-white p-2 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
            title="Refresh History"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* History Items List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
          <p className="mt-3 text-xs text-zinc-500">Loading prompt history from MongoDB...</p>
        </div>
      ) : history.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-800">
          <History className="mx-auto h-10 w-10 text-zinc-400" />
          <h3 className="mt-3 text-sm font-bold text-zinc-900 dark:text-white">No prompt history found</h3>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
            {searchQuery || favoritesOnly || arenaOnly || selectedToolFilter !== 'all'
              ? 'No records match your active search filters. Try clearing some filters.'
              : 'Start executing requests in the AI Studio or Arena Mode to see your history logged in MongoDB.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((item) => (
            <div
              key={item.id}
              className={`rounded-2xl border bg-white p-5 shadow-sm transition-all dark:bg-zinc-900 ${
                item.isArena
                  ? 'border-purple-200 dark:border-purple-900/60'
                  : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'
              }`}
            >
              {/* Item Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-3 dark:border-zinc-800">
                <div className="flex flex-wrap items-center gap-2">
                  {item.isArena ? (
                    <span className="flex items-center gap-1 rounded-md bg-purple-100 px-2 py-0.5 text-xs font-bold text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                      <Swords className="h-3 w-3" /> Arena Battle
                    </span>
                  ) : (
                    <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                      {item.toolName}
                    </span>
                  )}

                  <span className="text-xs text-zinc-400">·</span>
                  <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    {item.model}
                  </span>

                  {item.workspace && (
                    <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                      📁 {item.workspace}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {item.latencyMs}ms
                    </span>
                    <span className="flex items-center gap-1">
                      <Coins className="h-3 w-3 text-amber-500" />
                      {item.tokensUsed?.totalTokens || 0} tokens
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(item.date).toLocaleDateString()} {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* TTS Narration */}
                    <button
                      onClick={() => handleToggleVoice(item.response, item.id)}
                      className={`rounded-lg p-1.5 ${
                        speakingId === item.id
                          ? 'text-indigo-600 animate-pulse bg-indigo-50 dark:bg-indigo-950'
                          : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                      }`}
                      title="Audio Voice Narration"
                    >
                      {speakingId === item.id ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    </button>

                    {/* Favorite */}
                    <button
                      onClick={() => handleToggleFavorite(item.id, item.isFavorite)}
                      className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-amber-500 dark:hover:bg-zinc-800"
                      title={item.isFavorite ? 'Remove Favorite' : 'Save Favorite'}
                    >
                      <Star
                        className={`h-4 w-4 ${
                          item.isFavorite ? 'fill-amber-500 text-amber-500' : 'text-zinc-400'
                        }`}
                      />
                    </button>

                    {/* Copy */}
                    <button
                      onClick={() => handleCopy(item.response, item.id)}
                      className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                      title="Copy Response"
                    >
                      {copiedId === item.id ? (
                        <Check className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>

                    {/* Export */}
                    <button
                      onClick={() => handleExportItem(item)}
                      className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                      title="Export JSON"
                    >
                      <Download className="h-4 w-4" />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="rounded-lg p-1.5 text-zinc-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                      title="Delete Entry"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Tags Row */}
              {item.tags && item.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {item.tags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-0.5 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                    >
                      <Tag className="h-2.5 w-2.5" />
                      {t}
                    </span>
                  ))}
                </div>
              )}

              {/* Prompt Box */}
              <div className="mt-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  User Prompt:
                </span>
                <p className="mt-0.5 text-xs font-semibold text-zinc-900 dark:text-zinc-100 bg-zinc-50 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800">
                  {item.prompt}
                </p>
              </div>

              {/* Response Preview */}
              <div className="mt-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    {item.isArena ? 'Model A Output:' : 'AI Output:'}
                  </span>
                  {item.isArena && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-[11px] text-zinc-400">Winner:</span>
                      <button
                        onClick={() => handleSetArenaWinner(item.id, 'modelA')}
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          item.arenaWinner === 'modelA'
                            ? 'bg-purple-600 text-white'
                            : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800'
                        }`}
                      >
                        Model A {item.arenaWinner === 'modelA' ? '👑' : ''}
                      </button>
                      <button
                        onClick={() => handleSetArenaWinner(item.id, 'modelB')}
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          item.arenaWinner === 'modelB'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800'
                        }`}
                      >
                        Model B {item.arenaWinner === 'modelB' ? '👑' : ''}
                      </button>
                      <button
                        onClick={() => handleSetArenaWinner(item.id, 'tie')}
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          item.arenaWinner === 'tie'
                            ? 'bg-zinc-700 text-white'
                            : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800'
                        }`}
                      >
                        Tie
                      </button>
                    </div>
                  )}
                </div>
                <div className="mt-0.5 max-h-56 overflow-y-auto rounded-lg bg-zinc-50/50 p-3 text-xs leading-relaxed text-zinc-700 dark:bg-zinc-950/40 dark:text-zinc-300 border border-zinc-100 dark:border-zinc-800/80">
                  <pre className="whitespace-pre-wrap font-sans">{item.response}</pre>
                </div>

                {/* If Arena, show Model B Output too */}
                {item.isArena && item.arenaResponseB && (
                  <div className="mt-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                      Model B Output ({item.arenaModelB || 'Model B'}):
                    </span>
                    <div className="mt-0.5 max-h-56 overflow-y-auto rounded-lg bg-indigo-50/30 p-3 text-xs leading-relaxed text-zinc-700 dark:bg-indigo-950/20 dark:text-zinc-300 border border-indigo-100 dark:border-indigo-900/40">
                      <pre className="whitespace-pre-wrap font-sans">{item.arenaResponseB}</pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
