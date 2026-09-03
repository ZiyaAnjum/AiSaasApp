export type UserRole = 'user' | 'admin';
export type UserStatus = 'active' | 'blocked';
export type PlanTier = 'free' | 'starter' | 'pro' | 'enterprise';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  planId: PlanTier;
  createdAt: string;
  lastLoginAt?: string;
  apiKeys: ApiKey[];
}

export interface ApiKey {
  id: string;
  key: string;
  name: string;
  createdAt: string;
  lastUsedAt?: string;
  totalCalls: number;
  status: 'active' | 'revoked';
}

export interface Plan {
  id: PlanTier;
  name: string;
  price: number;
  period: 'month' | 'year';
  dailyRequestLimit: number; // -1 for unlimited
  allowedModels: string[];
  maxUploadMb: number;
  features: string[];
  badge?: string;
  description: string;
  popular?: boolean;
  priorityProcessing?: boolean;
  teamSeats?: number;
}

export interface Tool {
  id: string;
  name: string;
  description: string;
  category: 'chat' | 'coding' | 'writing' | 'image' | 'analysis' | 'productivity';
  minPlan: PlanTier;
  systemPrompt: string;
  iconName: string;
  inputPlaceholder: string;
  samplePrompts: string[];
  enabled: boolean;
  availableModels: string[];
}

export interface AiRequestLog {
  id: string;
  userId: string;
  userEmail: string;
  toolId: string;
  toolName: string;
  prompt: string;
  response: string;
  model: string;
  tokensUsed: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latencyMs: number;
  date: string; // ISO string
  isFavorite: boolean;
  source: 'web' | 'api';
  apiKeyId?: string;
  tags?: string[];
  workspace?: string;
  isArena?: boolean;
  arenaModelB?: string;
  arenaResponseB?: string;
  arenaWinner?: 'modelA' | 'modelB' | 'tie';
}

export interface PromptTemplate {
  id: string;
  title: string;
  description: string;
  category: 'Engineering' | 'Marketing' | 'Business' | 'Data' | 'Writing' | 'Productivity';
  toolId: string;
  template: string;
  variables: {
    name: string;
    label: string;
    placeholder: string;
    defaultValue?: string;
    type?: 'text' | 'textarea' | 'select';
    options?: string[];
  }[];
  tags: string[];
}

export interface ArenaComparisonResult {
  id: string;
  prompt: string;
  modelA: {
    name: string;
    response: string;
    latencyMs: number;
    tokens: { promptTokens: number; completionTokens: number; totalTokens: number };
  };
  modelB: {
    name: string;
    response: string;
    latencyMs: number;
    tokens: { promptTokens: number; completionTokens: number; totalTokens: number };
  };
  winner?: 'modelA' | 'modelB' | 'tie';
  date: string;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: PlanTier;
  status: 'active' | 'cancelled' | 'past_due';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  updatedAt: string;
}

export interface UsageSummary {
  dailyUsed: number;
  dailyLimit: number;
  dailyRemaining: number;
  monthlyUsed: number;
  totalTokensUsed: number;
  toolBreakdown: { [toolName: string]: number };
  dailyTrend: { date: string; requests: number; tokens: number }[];
  modelBreakdown: { [model: string]: number };
}
