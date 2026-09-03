'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/context';
import { Tool, PromptTemplate, ArenaComparisonResult } from '@/lib/types';
import { DEFAULT_TOOLS } from '@/lib/constants';
import { PROMPT_TEMPLATES } from '@/lib/templates';
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
  Lock,
  Zap,
  SlidersHorizontal,
  Clock,
  Coins,
  RefreshCw,
  AlertTriangle,
  Mic,
  MicOff,
  Wand2,
  Volume2,
  VolumeX,
  Swords,
  Layers,
  Square,
  Bookmark,
  Printer,
  ChevronDown,
  Trophy,
  Gauge,
  Tag,
  FolderPlus,
} from 'lucide-react';

export default function AiPlayground() {
  const { user, token, setActiveTab, showToast } = useAuth();

  // Mode Selection: 'studio' | 'arena'
  const [activeMode, setActiveMode] = useState<'studio' | 'arena'>('studio');

  // Tools & Settings
  const [tools, setTools] = useState<Tool[]>(DEFAULT_TOOLS);
  const [selectedToolId, setSelectedToolId] = useState<string>('ai-chat');
  const [prompt, setPrompt] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [temperature, setTemperature] = useState<number>(0.7);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [enableStreaming, setEnableStreaming] = useState<boolean>(true);

  // Studio Response States
  const [currentResponse, setCurrentResponse] = useState<string | null>(null);
  const [responseMeta, setResponseMeta] = useState<{
    id?: string;
    model?: string;
    tokens?: { promptTokens: number; completionTokens: number; totalTokens: number };
    latencyMs?: number;
    date?: string;
    isFavorite?: boolean;
    tags?: string[];
    workspace?: string;
  } | null>(null);

  // Prompt Enhancer States
  const [isEnhancing, setIsEnhancing] = useState<boolean>(false);
  const [selectedTone, setSelectedTone] = useState<string>('Professional');
  const [showTonePicker, setShowTonePicker] = useState<boolean>(false);

  // Speech / Voice Dictation States
  const [isListening, setIsListening] = useState<boolean>(false);
  const recognitionRef = useRef<any>(null);

  // Audio Text-to-Speech (TTS) States
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [ttsSpeed, setTtsSpeed] = useState<number>(1);

  // Templates Modal States
  const [showTemplatesModal, setShowTemplatesModal] = useState<boolean>(false);
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null);
  const [templateVariables, setTemplateVariables] = useState<Record<string, string>>({});
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState<string>('All');

  // Workspaces & Tagging
  const [workspaceTag, setWorkspaceTag] = useState<string>('Default');
  const [currentTagInput, setCurrentTagInput] = useState<string>('');
  const [tagsList, setTagsList] = useState<string[]>(['Production', 'AI-SaaS']);

  // Streaming & Abort Controller
  const abortControllerRef = useRef<AbortController | null>(null);
  const [streamingTokensPerSec, setStreamingTokensPerSec] = useState<number>(0);
  const [streamingTimer, setStreamingTimer] = useState<number>(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Arena Comparison States
  const [arenaModelA, setArenaModelA] = useState<string>('gemini-3.8-flash');
  const [arenaModelB, setArenaModelB] = useState<string>('GPT-4 Turbo');
  const [arenaTempA, setArenaTempA] = useState<number>(0.7);
  const [arenaTempB, setArenaTempB] = useState<number>(0.7);
  const [arenaResult, setArenaResult] = useState<ArenaComparisonResult | null>(null);
  const [arenaWinnerVote, setArenaWinnerVote] = useState<'modelA' | 'modelB' | 'tie' | null>(null);

  // Misc UI States
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

  // Plan rank check
  const isAccessible = (minPlan: string) => {
    const ranks: Record<string, number> = { free: 1, starter: 2, pro: 3, enterprise: 4 };
    const userRank = ranks[user?.planId || 'free'] || 1;
    const requiredRank = ranks[minPlan] || 1;
    return userRank >= requiredRank;
  };

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

  // Web Speech API Voice Dictation
  const toggleListening = () => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      showToast('Voice dictation is not supported in this browser.', 'info');
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        showToast('Listening... Speak your prompt now', 'info');
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setPrompt((prev) => (prev ? prev + ' ' + transcript : transcript));
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setIsListening(false);
    }
  };

  // Text-to-Speech (TTS) Voice Narration
  const toggleTTS = (textToSpeak: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      showToast('Speech synthesis is not supported on this browser', 'info');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(textToSpeak.replace(/[#*`_]/g, ''));
    utterance.rate = ttsSpeed;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  // Magic Prompt Enhancer
  const handleEnhancePrompt = async () => {
    if (!prompt.trim() || isEnhancing) return;
    if (!token) {
      showToast('Please sign in to use the Magic Prompt Enhancer', 'info');
      return;
    }

    setIsEnhancing(true);
    try {
      const res = await fetch('/api/ai/enhance-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          tone: selectedTone,
          toolName: selectedTool?.name || 'AI Assistant',
        }),
      });

      const data = await res.json();
      if (res.ok && data.enhancedPrompt) {
        setPrompt(data.enhancedPrompt);
        showToast(`Prompt optimized (${data.estimatedTokens} est. tokens, ${selectedTone} tone)`, 'success');
      } else {
        showToast(data.error || 'Failed to enhance prompt', 'error');
      }
    } catch {
      showToast('Network error optimizing prompt', 'error');
    } finally {
      setIsEnhancing(false);
      setShowTonePicker(false);
    }
  };

  // Stop Streaming Generation
  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setIsGenerating(false);
    showToast('AI response generation halted', 'info');
  };

  // Execute Single Tool Request (Streaming or Standard)
  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    if (!user) {
      showToast('Please sign in to execute AI requests', 'info');
      return;
    }

    if (!selectedTool) return;

    if (!isAccessible(selectedTool.minPlan)) {
      showToast(`Upgrade to ${selectedTool.minPlan.toUpperCase()} plan to use this tool`, 'error');
      return;
    }

    setIsGenerating(true);
    setRateLimitError(null);
    setCurrentResponse('');
    setStreamingTokensPerSec(0);
    setStreamingTimer(0);

    const startTime = Date.now();
    timerIntervalRef.current = setInterval(() => {
      setStreamingTimer(Date.now() - startTime);
    }, 100);

    // Streaming branch
    if (enableStreaming) {
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const response = await fetch('/api/ai/stream', {
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
            tags: tagsList,
            workspace: workspaceTag,
          }),
          signal: controller.signal,
        });

        if (response.status === 429) {
          const errData = await response.json();
          setRateLimitError({
            message: errData.error || 'Daily request quota exceeded',
            limit: errData.dailyLimit || 20,
            used: errData.dailyUsed || 20,
          });
          showToast('Daily quota reached. Upgrade your plan for higher limits.', 'error');
          setIsGenerating(false);
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
          return;
        }

        if (!response.ok) {
          const errData = await response.json();
          showToast(errData.error || 'Streaming failed', 'error');
          setIsGenerating(false);
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No readable stream available');
        }

        const decoder = new TextDecoder();
        let accumulated = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const parsed = JSON.parse(line.slice(6));
                if (parsed.type === 'chunk' && parsed.text) {
                  accumulated += parsed.text;
                  setCurrentResponse((prev) => (prev ? prev + parsed.text : parsed.text));

                  const elapsedSec = (Date.now() - startTime) / 1000;
                  const estimatedTokens = Math.round(accumulated.length / 4);
                  if (elapsedSec > 0.3) {
                    setStreamingTokensPerSec(Math.round(estimatedTokens / elapsedSec));
                  }
                } else if (parsed.type === 'done' && parsed.meta) {
                  setResponseMeta({
                    id: parsed.meta.id,
                    model: parsed.meta.model,
                    tokens: parsed.meta.tokens,
                    latencyMs: parsed.meta.latencyMs,
                    date: parsed.meta.date,
                    isFavorite: false,
                    tags: tagsList,
                    workspace: workspaceTag,
                  });
                  showToast(
                    `Finished in ${parsed.meta.latencyMs}ms (${parsed.meta.tokens.totalTokens} tokens)`,
                    'success'
                  );
                }
              } catch {
                // partial JSON chunk ignore
              }
            }
          }
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          showToast('Streaming failed. Falling back to standard execution...', 'info');
        }
      } finally {
        setIsGenerating(false);
        abortControllerRef.current = null;
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
      }
      return;
    }

    // Standard Non-Streaming Fetch
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
          tags: tagsList,
          workspace: workspaceTag,
        }),
      });

      const data = await res.json();

      if (res.status === 429) {
        setRateLimitError({
          message: data.error || 'Daily request quota exceeded',
          limit: data.dailyLimit,
          used: data.dailyUsed,
        });
        showToast('Daily rate limit exceeded.', 'error');
        return;
      }

      if (!res.ok) {
        showToast(data.error || 'Failed to generate response', 'error');
        return;
      }

      const returnedText = data.data.response || data.data.text;
      setCurrentResponse(returnedText);
      setResponseMeta({
        id: data.data.id,
        model: data.data.modelUsed || data.data.model,
        tokens: data.data.tokens,
        latencyMs: data.data.latencyMs,
        date: data.data.date,
        isFavorite: false,
        tags: tagsList,
        workspace: workspaceTag,
      });

      showToast(`Generated in ${data.data.latencyMs}ms (${data.data.tokens.totalTokens} tokens)`, 'success');
    } catch {
      showToast('Network error generating response', 'error');
    } finally {
      setIsGenerating(false);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
  };

  // Arena Battle Execution (Model A vs Model B)
  const handleArenaBattle = async () => {
    if (!prompt.trim() || isGenerating) return;
    if (!user) {
      showToast('Please sign in to launch an Arena Model Battle', 'info');
      return;
    }

    setIsGenerating(true);
    setArenaResult(null);
    setArenaWinnerVote(null);

    try {
      const res = await fetch('/api/ai/arena', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          toolId: selectedTool?.id || 'ai-chat',
          prompt: prompt.trim(),
          modelA: arenaModelA,
          modelB: arenaModelB,
          temperatureA: arenaTempA,
          temperatureB: arenaTempB,
          tags: tagsList,
          workspace: workspaceTag,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Arena battle failed', 'error');
        return;
      }

      setArenaResult(data.data);
      showToast(
        `Battle Complete! Model A: ${data.data.modelA.latencyMs}ms vs Model B: ${data.data.modelB.latencyMs}ms`,
        'success'
      );
    } catch {
      showToast('Network error executing Arena comparison', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // Vote for Winner in Arena Battle
  const handleVoteWinner = async (winner: 'modelA' | 'modelB' | 'tie') => {
    if (!arenaResult?.id) return;
    try {
      const res = await fetch('/api/ai/history', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: arenaResult.id,
          arenaWinner: winner,
        }),
      });

      if (res.ok) {
        setArenaWinnerVote(winner);
        showToast(`Preference logged: ${winner === 'tie' ? 'Tie / Draw' : winner.toUpperCase()} saved to DB`, 'success');
      }
    } catch {
      showToast('Failed to save vote', 'error');
    }
  };

  // Copy helper
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showToast('Copied to clipboard', 'info');
  };

  // Toggle Favorite
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
        showToast(data.message || 'Updated favorite', 'success');
      }
    } catch {
      showToast('Failed to update favorite', 'error');
    }
  };

  // Tag Management
  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && currentTagInput.trim()) {
      e.preventDefault();
      if (!tagsList.includes(currentTagInput.trim())) {
        setTagsList([...tagsList, currentTagInput.trim()]);
      }
      setCurrentTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTagsList(tagsList.filter((t) => t !== tagToRemove));
  };

  // Multi-format Export
  const handleExport = (format: 'md' | 'json' | 'txt' | 'html' | 'print') => {
    if (!currentResponse) return;

    if (format === 'print') {
      window.print();
      return;
    }

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
          workspace: workspaceTag,
          tags: tagsList,
        },
        null,
        2
      );
      mimeType = 'application/json';
    } else if (format === 'md') {
      content = `# Prompt:\n${prompt}\n\n## Response (${responseMeta?.model || 'AI'}):\n${currentResponse}\n\n---\n*Generated via NexusAI SaaS on ${new Date().toLocaleString()}*`;
      mimeType = 'text/markdown';
    } else if (format === 'html') {
      content = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>NexusAI Export</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.6; color: #18181b; }
    h1 { border-bottom: 2px solid #e4e4e7; padding-bottom: 8px; font-size: 20px; }
    pre { background: #f4f4f5; padding: 16px; border-radius: 8px; overflow-x: auto; font-size: 14px; }
    .meta { font-size: 12px; color: #71717a; margin-bottom: 24px; }
  </style>
</head>
<body>
  <div class="meta"><strong>Tool:</strong> ${selectedTool?.name} | <strong>Model:</strong> ${responseMeta?.model || 'AI'} | <strong>Date:</strong> ${new Date().toLocaleString()}</div>
  <h1>User Prompt</h1>
  <p>${prompt}</p>
  <h1>Generated Result</h1>
  <pre>${currentResponse}</pre>
</body>
</html>`;
      mimeType = 'text/html';
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

  // Open Template Modal
  const handleOpenTemplate = (template: PromptTemplate) => {
    setSelectedTemplate(template);
    const initialVars: Record<string, string> = {};
    template.variables.forEach((v) => {
      initialVars[v.name] = v.defaultValue || '';
    });
    setTemplateVariables(initialVars);
    setShowTemplatesModal(true);
  };

  // Apply Template into Prompt
  const handleApplyTemplate = () => {
    if (!selectedTemplate) return;
    let interpolated = selectedTemplate.template;
    Object.entries(templateVariables).forEach(([key, val]) => {
      interpolated = interpolated.replace(new RegExp(`{{${key}}}`, 'g'), val);
    });
    setPrompt(interpolated);
    if (selectedTemplate.toolId) {
      setSelectedToolId(selectedTemplate.toolId);
    }
    setShowTemplatesModal(false);
    showToast(`Template "${selectedTemplate.title}" applied!`, 'success');
  };

  const filteredTemplates = PROMPT_TEMPLATES.filter((tpl) => {
    if (templateCategoryFilter === 'All') return true;
    return tpl.category === templateCategoryFilter;
  });

  // Calculate Prompt Statistics
  const wordCount = prompt.trim() ? prompt.trim().split(/\s+/).length : 0;
  const estimatedTokens = Math.max(0, Math.round(prompt.length / 4));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Top Banner & Mode Switcher */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 pb-6 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
              AI Tools & Model Studio
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              <Sparkles className="h-3 w-3" /> Pro Studio
            </span>
          </div>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Enterprise LLM engines, real-time streaming, multi-model arena battles, and 1-click prompt optimization.
          </p>
        </div>

        {/* Action Controls & Mode Switcher */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Mode Tabs */}
          <div className="flex rounded-xl border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-800 dark:bg-zinc-900">
            <button
              id="mode-studio-btn"
              onClick={() => setActiveMode('studio')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                activeMode === 'studio'
                  ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-white'
                  : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400'
              }`}
            >
              <Layers className="h-3.5 w-3.5 text-blue-500" />
              Studio Mode
            </button>

            <button
              id="mode-arena-btn"
              onClick={() => setActiveMode('arena')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                activeMode === 'arena'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm'
                  : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400'
              }`}
            >
              <Swords className="h-3.5 w-3.5" />
              Model Arena
            </button>
          </div>

          {/* Template Gallery Launcher */}
          <button
            id="open-templates-btn"
            onClick={() => setShowTemplatesModal(true)}
            className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-bold text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <Bookmark className="h-3.5 w-3.5 text-amber-500" />
            Prompt Templates ({PROMPT_TEMPLATES.length})
          </button>
        </div>
      </div>

      {/* Main Studio Mode */}
      {activeMode === 'studio' && (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Left Column: AI Engine Selector & Workspace Config (4 Cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                AI Engines ({tools.length})
              </h2>

              {/* Workspace Selector */}
              <div className="flex items-center gap-1 text-xs">
                <FolderPlus className="h-3 w-3 text-zinc-400" />
                <select
                  value={workspaceTag}
                  onChange={(e) => setWorkspaceTag(e.target.value)}
                  className="rounded-md border border-zinc-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                >
                  <option value="Default">Workspace: Default</option>
                  <option value="Production">Workspace: Production</option>
                  <option value="Marketing">Workspace: Marketing</option>
                  <option value="DevOps">Workspace: DevOps</option>
                  <option value="Research">Workspace: Research</option>
                </select>
              </div>
            </div>

            {/* Tool List */}
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
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
                        <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">{tool.name}</p>
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

          {/* Right Column: Studio Prompt & Execution Workspace (8 Cols) */}
          <div className="lg:col-span-8 space-y-6">
            {selectedTool && (
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                {/* Engine Header & Live Parameter Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 pb-4 dark:border-zinc-800">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                      {getToolIcon(selectedTool.iconName)}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-zinc-900 dark:text-white">{selectedTool.name}</h3>
                      <div className="flex items-center gap-2 text-xs text-zinc-500">
                        <span>
                          Required Tier: <strong className="uppercase">{selectedTool.minPlan}</strong>
                        </span>
                        <span>·</span>
                        <span className="text-blue-600 dark:text-blue-400">Gemini Native SDK</span>
                      </div>
                    </div>
                  </div>

                  {/* Top Bar Controls */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Live Stream Toggle */}
                    <button
                      id="toggle-stream-btn"
                      onClick={() => setEnableStreaming(!enableStreaming)}
                      className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all ${
                        enableStreaming
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-400'
                      }`}
                      title="Toggle Real-Time Chunk Streaming"
                    >
                      <Zap className={`h-3 w-3 ${enableStreaming ? 'fill-emerald-500 text-emerald-500' : ''}`} />
                      <span>{enableStreaming ? 'Stream Live' : 'Standard'}</span>
                    </button>

                    {/* Parameters Button */}
                    <button
                      id="toggle-model-params-btn"
                      onClick={() => setShowConfig(!showConfig)}
                      className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300"
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                      <span>Config</span>
                    </button>

                    {/* Model Selector */}
                    <select
                      id="playground-model-select"
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs font-semibold text-zinc-800 focus:outline-none dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
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
                          <span>Temperature (Sampling Variance)</span>
                          <span className="font-mono text-blue-600">{temperature}</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1.5"
                          step="0.05"
                          value={temperature}
                          onChange={(e) => setTemperature(parseFloat(e.target.value))}
                          className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer dark:bg-zinc-700"
                        />
                        <div className="flex justify-between text-[10px] text-zinc-400 mt-1">
                          <span>Deterministic (0.0)</span>
                          <span>Creative (1.5)</span>
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

                {/* Quota Exceeded Alert */}
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
                          Upgrade Plan for Higher Quotas
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Prompt Input Form */}
                <form onSubmit={handleGenerate} className="mt-4 space-y-4">
                  <div>
                    {/* Prompt Header with Magic Enhancer & Dictation */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                        Prompt Instruction
                      </label>

                      <div className="flex items-center gap-2">
                        {/* Voice Dictation Button */}
                        <button
                          type="button"
                          id="voice-dictation-btn"
                          onClick={toggleListening}
                          className={`flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-all ${
                            isListening
                              ? 'border-rose-300 bg-rose-50 text-rose-700 animate-pulse dark:bg-rose-950 dark:text-rose-300'
                              : 'border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                          }`}
                          title="Click to dictate using speech recognition"
                        >
                          {isListening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                          <span>{isListening ? 'Listening...' : 'Voice Input'}</span>
                        </button>

                        {/* Magic Prompt Enhancer Button */}
                        <div className="relative">
                          <button
                            type="button"
                            id="magic-enhance-btn"
                            disabled={isEnhancing || !prompt.trim()}
                            onClick={() => setShowTonePicker(!showTonePicker)}
                            className="flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs font-bold text-purple-700 hover:bg-purple-100 disabled:opacity-50 dark:border-purple-900/60 dark:bg-purple-950/40 dark:text-purple-300"
                            title="Enhance prompt with Gemini AI Prompt Engineering"
                          >
                            <Wand2 className={`h-3.5 w-3.5 ${isEnhancing ? 'animate-spin' : ''}`} />
                            <span>{isEnhancing ? 'Optimizing...' : 'Magic Enhance'}</span>
                            <ChevronDown className="h-3 w-3 opacity-60" />
                          </button>

                          {/* Tone Picker Dropdown */}
                          {showTonePicker && (
                            <div className="absolute right-0 mt-2 w-52 rounded-xl border border-zinc-200 bg-white p-2 shadow-xl ring-1 ring-black/5 dark:border-zinc-800 dark:bg-zinc-900 z-50">
                              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                                Select Target Tone
                              </div>
                              {['Professional', 'Technical & Concise', 'Creative & Engaging', 'Academic / Detailed', 'Executive Summary'].map(
                                (tone) => (
                                  <button
                                    key={tone}
                                    type="button"
                                    onClick={() => {
                                      setSelectedTone(tone);
                                      handleEnhancePrompt();
                                    }}
                                    className={`w-full text-left rounded-lg px-2.5 py-1.5 text-xs font-medium ${
                                      selectedTone === tone
                                        ? 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 font-bold'
                                        : 'text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800'
                                    }`}
                                  >
                                    {tone}
                                  </button>
                                )
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Textarea */}
                    <textarea
                      id="playground-prompt-input"
                      rows={5}
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder={selectedTool.inputPlaceholder}
                      className="w-full rounded-xl border border-zinc-300 bg-zinc-50/50 p-3.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-white dark:focus:bg-zinc-800"
                    />

                    {/* Prompt Telemetry Bar */}
                    <div className="mt-1 flex flex-wrap items-center justify-between text-[11px] text-zinc-400 px-1">
                      <div className="flex items-center gap-3">
                        <span>{prompt.length} chars</span>
                        <span>·</span>
                        <span>{wordCount} words</span>
                        <span>·</span>
                        <span className="flex items-center gap-1 text-zinc-500">
                          <Gauge className="h-3 w-3" /> ~{estimatedTokens} prompt tokens
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-semibold">
                        <span>Readability: Good</span>
                      </div>
                    </div>
                  </div>

                  {/* Project Tagging Bar */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mr-1 flex items-center gap-1">
                      <Tag className="h-3 w-3" /> Tags:
                    </span>
                    {tagsList.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="text-zinc-400 hover:text-zinc-600"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    <input
                      type="text"
                      placeholder="+ tag (press Enter)"
                      value={currentTagInput}
                      onChange={(e) => setCurrentTagInput(e.target.value)}
                      onKeyDown={handleAddTag}
                      className="rounded-md border border-dashed border-zinc-300 bg-transparent px-2 py-0.5 text-[11px] text-zinc-700 placeholder:text-zinc-400 focus:outline-none dark:border-zinc-700 dark:text-zinc-300"
                    />
                  </div>

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
                      Clear Workspace
                    </button>

                    <div className="flex items-center gap-2">
                      {isGenerating ? (
                        <button
                          type="button"
                          id="stop-generation-btn"
                          onClick={handleStopGeneration}
                          className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-rose-700"
                        >
                          <Square className="h-3.5 w-3.5 fill-white" />
                          Stop Generating ({Math.round(streamingTimer / 1000)}s)
                        </button>
                      ) : (
                        <button
                          id="generate-ai-btn"
                          type="submit"
                          disabled={!prompt.trim()}
                          className="flex items-center gap-2 rounded-xl bg-zinc-900 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
                        >
                          <Send className="h-4 w-4" />
                          Execute Prompt
                        </button>
                      )}
                    </div>
                  </div>
                </form>

                {/* Real-time Streaming Metrics Bar */}
                {isGenerating && enableStreaming && (
                  <div className="mt-4 flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50/60 p-3 text-xs text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/40 dark:text-blue-200 animate-pulse">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-3.5 w-3.5 animate-spin text-blue-600" />
                      <span>Streaming response in real-time...</span>
                    </div>
                    <div className="flex items-center gap-3 font-mono text-[11px]">
                      <span>{streamingTokensPerSec} tokens/sec</span>
                      <span>·</span>
                      <span>{(streamingTimer / 1000).toFixed(1)}s elapsed</span>
                    </div>
                  </div>
                )}

                {/* Response Panel */}
                {currentResponse && (
                  <div className="mt-8 rounded-xl border border-zinc-200 bg-zinc-50/50 p-5 dark:border-zinc-800 dark:bg-zinc-950/50">
                    {/* Response Meta Header */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200/80 pb-3 dark:border-zinc-800">
                      <div className="flex items-center gap-3 text-xs text-zinc-500">
                        <span className="flex items-center gap-1 font-semibold text-zinc-900 dark:text-white">
                          <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                          {responseMeta?.model || selectedModel || 'AI Model'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-zinc-400" />
                          {responseMeta?.latencyMs || Math.round(streamingTimer)}ms
                        </span>
                        <span className="flex items-center gap-1">
                          <Coins className="h-3.5 w-3.5 text-amber-500" />
                          {responseMeta?.tokens?.totalTokens || Math.round(currentResponse.length / 4)} tokens
                        </span>
                      </div>

                      {/* Action Controls: Voice, Copy, Favorite, Export */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {/* Audio Narration (TTS) */}
                        <button
                          id="tts-narration-btn"
                          onClick={() => toggleTTS(currentResponse)}
                          className={`flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold ${
                            isSpeaking
                              ? 'border-indigo-300 bg-indigo-50 text-indigo-700 animate-pulse dark:bg-indigo-950 dark:text-indigo-300'
                              : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200'
                          }`}
                          title="Listen to AI voice narration"
                        >
                          {isSpeaking ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                          <span>{isSpeaking ? 'Stop Audio' : 'Listen'}</span>
                        </button>

                        {/* Copy Button */}
                        <button
                          id="response-copy-btn"
                          onClick={() => handleCopy(currentResponse)}
                          className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                        >
                          {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                          {copied ? 'Copied' : 'Copy'}
                        </button>

                        {/* Favorite Button */}
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
                          Save
                        </button>

                        {/* Export Buttons */}
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
                            onClick={() => handleExport('html')}
                            className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                            title="Export HTML Document"
                          >
                            .HTML
                          </button>
                          <button
                            onClick={() => handleExport('print')}
                            className="rounded-lg border border-zinc-200 bg-white p-1 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                            title="Print / PDF View"
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Output Text Body */}
                    <div className="mt-4 prose prose-sm max-w-none text-zinc-800 dark:text-zinc-200 dark:prose-invert">
                      <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed overflow-x-auto p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800 shadow-inner">
                        {currentResponse}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Model Arena Comparison Mode */}
      {activeMode === 'arena' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50/50 via-white to-indigo-50/50 p-6 shadow-sm dark:border-purple-900/40 dark:bg-zinc-900">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 pb-4 dark:border-zinc-800">
              <div>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Swords className="h-5 w-5 text-purple-600" />
                  Dual-Model Arena Battle
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Execute the identical prompt against two competitive models in parallel to benchmark latency, token economics, and response quality.
                </p>
              </div>

              {/* Model Selectors */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-purple-700 dark:text-purple-300">Model A:</span>
                  <select
                    value={arenaModelA}
                    onChange={(e) => setArenaModelA(e.target.value)}
                    className="rounded-lg border border-purple-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-800 dark:border-purple-800 dark:bg-zinc-800 dark:text-zinc-200"
                  >
                    <option value="gemini-3.8-flash">Gemini 3.8 Flash (High Speed)</option>
                    <option value="Gemini 3.1 Pro">Gemini 3.1 Pro (Deep Reasoning)</option>
                    <option value="GPT-4 Turbo">GPT-4 Turbo</option>
                  </select>
                </div>

                <div className="text-xs font-bold text-zinc-400">VS</div>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">Model B:</span>
                  <select
                    value={arenaModelB}
                    onChange={(e) => setArenaModelB(e.target.value)}
                    className="rounded-lg border border-indigo-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-800 dark:border-indigo-800 dark:bg-zinc-800 dark:text-zinc-200"
                  >
                    <option value="GPT-4 Turbo">GPT-4 Turbo</option>
                    <option value="Gemini 3.1 Pro">Gemini 3.1 Pro (Deep Reasoning)</option>
                    <option value="gemini-3.8-flash">Gemini 3.8 Flash (High Speed)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Arena Prompt Bar */}
            <div className="mt-4 space-y-3">
              <textarea
                rows={3}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Enter prompt for both models to evaluate concurrently..."
                className="w-full rounded-xl border border-zinc-300 bg-white p-3.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-white"
              />

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowTemplatesModal(true)}
                  className="text-xs font-semibold text-purple-600 hover:underline flex items-center gap-1"
                >
                  <Bookmark className="h-3.5 w-3.5" /> Pick from Templates
                </button>

                <button
                  id="launch-arena-btn"
                  onClick={handleArenaBattle}
                  disabled={isGenerating || !prompt.trim()}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Evaluating Models...
                    </>
                  ) : (
                    <>
                      <Swords className="h-4 w-4" />
                      Launch Model Battle
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Arena Side-by-Side Results */}
            {arenaResult && (
              <div className="mt-8 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Model A Column */}
                  <div className="rounded-xl border border-purple-200 bg-white p-5 shadow-sm dark:border-purple-900/60 dark:bg-zinc-900">
                    <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
                      <div>
                        <span className="rounded bg-purple-100 px-2 py-0.5 text-xs font-bold text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                          MODEL A
                        </span>
                        <h4 className="mt-1 text-sm font-bold text-zinc-900 dark:text-white">
                          {arenaResult.modelA.name}
                        </h4>
                      </div>
                      <div className="text-right text-[11px] text-zinc-500">
                        <div className="font-mono text-purple-600 font-bold">{arenaResult.modelA.latencyMs}ms</div>
                        <div>{arenaResult.modelA.tokens.totalTokens} tokens</div>
                      </div>
                    </div>

                    <div className="mt-3 max-h-80 overflow-y-auto rounded-lg bg-zinc-50 p-3 text-xs leading-relaxed text-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
                      <pre className="whitespace-pre-wrap font-sans">{arenaResult.modelA.response}</pre>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <button
                        onClick={() => handleCopy(arenaResult.modelA.response)}
                        className="text-xs font-semibold text-zinc-500 hover:text-zinc-800"
                      >
                        Copy Model A Output
                      </button>

                      <button
                        id="vote-winner-a-btn"
                        onClick={() => handleVoteWinner('modelA')}
                        className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                          arenaWinnerVote === 'modelA'
                            ? 'bg-purple-600 text-white shadow'
                            : 'border border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-300'
                        }`}
                      >
                        <Trophy className="h-3.5 w-3.5" />
                        {arenaWinnerVote === 'modelA' ? 'Winner Picked ✓' : 'Pick as Winner'}
                      </button>
                    </div>
                  </div>

                  {/* Model B Column */}
                  <div className="rounded-xl border border-indigo-200 bg-white p-5 shadow-sm dark:border-indigo-900/60 dark:bg-zinc-900">
                    <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
                      <div>
                        <span className="rounded bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                          MODEL B
                        </span>
                        <h4 className="mt-1 text-sm font-bold text-zinc-900 dark:text-white">
                          {arenaResult.modelB.name}
                        </h4>
                      </div>
                      <div className="text-right text-[11px] text-zinc-500">
                        <div className="font-mono text-indigo-600 font-bold">{arenaResult.modelB.latencyMs}ms</div>
                        <div>{arenaResult.modelB.tokens.totalTokens} tokens</div>
                      </div>
                    </div>

                    <div className="mt-3 max-h-80 overflow-y-auto rounded-lg bg-zinc-50 p-3 text-xs leading-relaxed text-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
                      <pre className="whitespace-pre-wrap font-sans">{arenaResult.modelB.response}</pre>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <button
                        onClick={() => handleCopy(arenaResult.modelB.response)}
                        className="text-xs font-semibold text-zinc-500 hover:text-zinc-800"
                      >
                        Copy Model B Output
                      </button>

                      <button
                        id="vote-winner-b-btn"
                        onClick={() => handleVoteWinner('modelB')}
                        className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                          arenaWinnerVote === 'modelB'
                            ? 'bg-indigo-600 text-white shadow'
                            : 'border border-indigo-300 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300'
                        }`}
                      >
                        <Trophy className="h-3.5 w-3.5" />
                        {arenaWinnerVote === 'modelB' ? 'Winner Picked ✓' : 'Pick as Winner'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Vote Tie Option */}
                <div className="text-center pt-2">
                  <button
                    onClick={() => handleVoteWinner('tie')}
                    className="text-xs font-semibold text-zinc-500 hover:text-zinc-800 underline"
                  >
                    Both performed equally (Vote Tie / Draw)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Prompt Templates Library Modal */}
      {showTemplatesModal && (
        <div
          id="prompt-templates-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
          onClick={() => setShowTemplatesModal(false)}
        >
          <div
            className="w-full max-w-3xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
              <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Bookmark className="h-5 w-5 text-amber-500" />
                  Curated Enterprise Prompt Templates
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Production-tested prompt blueprints with dynamic parameter interpolation.
                </p>
              </div>

              <button
                onClick={() => setShowTemplatesModal(false)}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800"
              >
                ✕
              </button>
            </div>

            {/* Category Filter Chips */}
            <div className="flex flex-wrap gap-1.5 py-3 border-b border-zinc-100 dark:border-zinc-800">
              {['All', 'Engineering', 'Marketing', 'Business', 'Data', 'Writing'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setTemplateCategoryFilter(cat)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                    templateCategoryFilter === cat
                      ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Modal Body: Template Selector vs Variable Customizer */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {!selectedTemplate ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredTemplates.map((tpl) => (
                    <div
                      key={tpl.id}
                      onClick={() => handleOpenTemplate(tpl)}
                      className="cursor-pointer rounded-xl border border-zinc-200 p-4 transition-all hover:border-blue-500 hover:bg-blue-50/40 dark:border-zinc-800 dark:hover:border-blue-500/60 dark:hover:bg-blue-950/20"
                    >
                      <div className="flex items-center justify-between">
                        <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                          {tpl.category}
                        </span>
                        <div className="flex gap-1">
                          {tpl.tags.map((t) => (
                            <span key={t} className="text-[10px] text-zinc-400">
                              #{t}
                            </span>
                          ))}
                        </div>
                      </div>
                      <h4 className="mt-2 text-xs font-bold text-zinc-900 dark:text-white">{tpl.title}</h4>
                      <p className="mt-1 text-xs text-zinc-500 line-clamp-2">{tpl.description}</p>
                    </div>
                  ))}
                </div>
              ) : (
                /* Dynamic Variable Form */
                <div className="space-y-4">
                  <button
                    onClick={() => setSelectedTemplate(null)}
                    className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1 mb-2"
                  >
                    ← Back to all templates
                  </button>

                  <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3.5 dark:border-blue-900/40 dark:bg-blue-950/30">
                    <h4 className="text-xs font-bold text-blue-900 dark:text-blue-200">
                      {selectedTemplate.title}
                    </h4>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                      {selectedTemplate.description}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h5 className="text-xs font-bold uppercase text-zinc-400 tracking-wider">
                      Fill Template Parameters:
                    </h5>

                    {selectedTemplate.variables.map((v) => (
                      <div key={v.name}>
                        <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                          {v.label}
                        </label>
                        {v.type === 'textarea' ? (
                          <textarea
                            rows={3}
                            value={templateVariables[v.name] || ''}
                            onChange={(e) =>
                              setTemplateVariables({ ...templateVariables, [v.name]: e.target.value })
                            }
                            placeholder={v.placeholder}
                            className="w-full rounded-lg border border-zinc-300 p-2.5 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                          />
                        ) : v.type === 'select' && v.options ? (
                          <select
                            value={templateVariables[v.name] || ''}
                            onChange={(e) =>
                              setTemplateVariables({ ...templateVariables, [v.name]: e.target.value })
                            }
                            className="w-full rounded-lg border border-zinc-300 p-2 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                          >
                            {v.options.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={templateVariables[v.name] || ''}
                            onChange={(e) =>
                              setTemplateVariables({ ...templateVariables, [v.name]: e.target.value })
                            }
                            placeholder={v.placeholder}
                            className="w-full rounded-lg border border-zinc-300 p-2 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                          />
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                    <button
                      onClick={() => setSelectedTemplate(null)}
                      className="rounded-lg px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400"
                    >
                      Cancel
                    </button>
                    <button
                      id="apply-template-btn"
                      onClick={handleApplyTemplate}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow"
                    >
                      Apply Template to Studio
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
