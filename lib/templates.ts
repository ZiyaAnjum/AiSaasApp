import { PromptTemplate } from './types';

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'ts-refactor-security',
    title: 'TypeScript Refactor & Security Hardening',
    description: 'Refactors existing code into production-grade TypeScript with strict types and sanitization.',
    category: 'Engineering',
    toolId: 'ai-code-generator',
    tags: ['TypeScript', 'Security', 'Refactor'],
    template: `Refactor the following {{language}} code to adhere to production standards:
1. Strict type definitions and null safety.
2. Defend against vulnerabilities (XSS, prototype pollution, unhandled exceptions).
3. Optimized algorithms and clear JSDoc comments.

Code to refactor:
\`\`\`{{language}}
{{sourceCode}}
\`\`\``,
    variables: [
      { name: 'language', label: 'Programming Language', placeholder: 'TypeScript / Python / Go', defaultValue: 'TypeScript', type: 'text' },
      { name: 'sourceCode', label: 'Source Code', placeholder: 'Paste your raw snippet or function here...', defaultValue: 'async function fetchUser(id) { const res = await fetch("/api/user/" + id); return res.json(); }', type: 'textarea' },
    ],
  },
  {
    id: 'unit-test-suite',
    title: 'Comprehensive Unit & Edge Test Suite',
    description: 'Generates isolated test suites with mocking, boundary cases, and failure mode assertions.',
    category: 'Engineering',
    toolId: 'ai-code-generator',
    tags: ['Testing', 'Jest', 'Vitest'],
    template: `Write a comprehensive test suite in {{testFramework}} for the following function/component:
- Include happy path test cases.
- Test edge cases, null/undefined inputs, and network latency/timeout failures.
- Provide clear mock setup and teardown routines.

Target Code:
\`\`\`{{language}}
{{targetCode}}
\`\`\``,
    variables: [
      { name: 'testFramework', label: 'Test Framework', placeholder: 'Vitest / Jest / PyTest', defaultValue: 'Vitest', type: 'select', options: ['Vitest', 'Jest', 'PyTest', 'Mocha'] },
      { name: 'language', label: 'Language', placeholder: 'TypeScript', defaultValue: 'TypeScript', type: 'text' },
      { name: 'targetCode', label: 'Target Code', placeholder: 'Paste the module or function to test...', defaultValue: 'export function calculateDiscount(price: number, tier: string): number {\n  if (tier === "pro") return price * 0.8;\n  if (tier === "enterprise") return price * 0.7;\n  return price;\n}', type: 'textarea' },
    ],
  },
  {
    id: 'complex-sql-cte',
    title: 'Optimized SQL Query with CTEs & Indexes',
    description: 'Crafts high-performance analytical or transactional SQL with indexing recommendations.',
    category: 'Data',
    toolId: 'ai-sql-builder',
    tags: ['PostgreSQL', 'SQL', 'Optimization'],
    template: `Generate an optimized SQL query for {{databaseEngine}} to achieve the following:
Requirement: {{queryGoal}}
Table Schema / Context: {{tableSchema}}
Performance Requirements: Ensure it uses CTEs or window functions where appropriate and suggest covering indexes.`,
    variables: [
      { name: 'databaseEngine', label: 'Database Dialect', placeholder: 'PostgreSQL 16 / MySQL 8', defaultValue: 'PostgreSQL 16', type: 'select', options: ['PostgreSQL 16', 'MySQL 8', 'Snowflake', 'BigQuery'] },
      { name: 'queryGoal', label: 'Query Objective', placeholder: 'Calculate monthly recurring revenue (MRR) per cohort...', defaultValue: 'Calculate monthly active users (MAU) and 30-day retention rates segmented by plan tier over the last 12 months.', type: 'textarea' },
      { name: 'tableSchema', label: 'Table Schema Details', placeholder: 'users(id, created_at, plan_id), sessions(id, user_id, timestamp)', defaultValue: 'users(id, email, plan_id, created_at), user_events(id, user_id, event_type, created_at)', type: 'textarea' },
    ],
  },
  {
    id: 'viral-linkedin-post',
    title: 'High-Impact B2B SaaS Post',
    description: 'Generates viral thought leadership posts with punchy hooks, storytelling, and high engagement.',
    category: 'Marketing',
    toolId: 'ai-text-summarizer',
    tags: ['Marketing', 'LinkedIn', 'Growth'],
    template: `Write an engaging, high-retention LinkedIn post about {{topic}}.
Target Audience: {{targetAudience}}
Tone: {{tone}}
Structure:
- Hook in the first 2 lines (stop the scroll).
- Story/Insight breakdown with bullet points.
- Key takeaway and call-to-conversation question.`,
    variables: [
      { name: 'topic', label: 'Topic / Insight', placeholder: 'Why migrating from monolithic databases to event-driven architectures 10xed our throughput...', defaultValue: 'Why we stopped using generic AI wrappers and built purpose-engineered LLM microservices', type: 'textarea' },
      { name: 'targetAudience', label: 'Target Audience', placeholder: 'CTOs, Engineering Leads, SaaS Founders', defaultValue: 'Software Engineers, Technical Founders, and Product Managers', type: 'text' },
      { name: 'tone', label: 'Tone', placeholder: 'Authoritative, authentic, and actionable', defaultValue: 'Authentic, high-energy, and actionable', type: 'select', options: ['Authentic & Actionable', 'Authoritative & Data-Driven', 'Contrarian & Provocative', 'Inspirational'] },
    ],
  },
  {
    id: 'enterprise-cold-email',
    title: 'Personalized Enterprise Cold Outreach',
    description: 'High-converting enterprise outbound email with clear value propositions and low-friction CTA.',
    category: 'Marketing',
    toolId: 'ai-email-writer',
    tags: ['Sales', 'Outreach', 'Email'],
    template: `Compose a high-converting cold email addressed to {{prospectRole}} at {{companyType}}.
Value Proposition: {{valueProposition}}
Social Proof / Case Metric: {{socialProof}}
Call to Action: Low-friction 10-minute discovery or sandbox review.`,
    variables: [
      { name: 'prospectRole', label: 'Prospect Role / Title', placeholder: 'VP of Engineering / Head of Product', defaultValue: 'VP of Engineering', type: 'text' },
      { name: 'companyType', label: 'Target Company Profile', placeholder: 'Series-B FinTech scaleup with 50+ developers', defaultValue: 'High-growth B2B SaaS company managing high-volume API workflows', type: 'text' },
      { name: 'valueProposition', label: 'Core Value Proposition', placeholder: 'Reduce LLM latency by 40% with automated model routing', defaultValue: 'Automate developer API key lifecycle, eliminate quota throttling, and reduce AI latency by 45%', type: 'textarea' },
      { name: 'socialProof', label: 'Social Proof / Stat', placeholder: 'Helped 120+ teams scale to 10M API calls/month', defaultValue: 'Trusted by engineering teams handling over 15M monthly AI requests with 99.99% uptime', type: 'text' },
    ],
  },
  {
    id: 'midjourney-cinematic-prompt',
    title: 'Photorealistic Cinematic Midjourney v6 Prompt',
    description: 'Engineers photorealistic visual prompts with optical lenses, volumetric lighting, and camera params.',
    category: 'Writing',
    toolId: 'ai-image-prompt',
    tags: ['Midjourney', 'DALL-E', 'Art'],
    template: `Generate a production-grade Midjourney v6 and DALL-E 3 master prompt specification for:
Subject: {{subject}}
Aesthetic Style: {{aestheticStyle}}
Lighting & Environment: {{lighting}}
Aspect Ratio: {{aspectRatio}}`,
    variables: [
      { name: 'subject', label: 'Visual Subject', placeholder: 'A futuristic cybernetic laboratory in Tokyo...', defaultValue: 'An autonomous quantum computing server room glowing with neon cobalt fiber-optics and sleek obsidian cooling pipes', type: 'textarea' },
      { name: 'aestheticStyle', label: 'Aesthetic & Rendering Style', placeholder: 'Cinematic photorealism, Octane 3D render, 8k resolution', defaultValue: 'Cinematic hyperrealism, Hasselblad 80mm f/1.8 lens, subtle film grain', type: 'text' },
      { name: 'lighting', label: 'Lighting & Mood', placeholder: 'Moody rim lighting, volumetric mist, golden hour', defaultValue: 'Volumetric atmospheric lighting, deep shadow contrast, moody teal and cyan accents', type: 'text' },
      { name: 'aspectRatio', label: 'Aspect Ratio', placeholder: '16:9 / 21:9 / 1:1', defaultValue: '16:9', type: 'select', options: ['16:9', '21:9', '1:1', '9:16', '4:5'] },
    ],
  },
  {
    id: 'prd-feature-brief',
    title: 'Executive Product Requirement Document (PRD)',
    description: 'Generates a structured, engineering-ready PRD with user stories, acceptance criteria, and edge cases.',
    category: 'Business',
    toolId: 'ai-text-summarizer',
    tags: ['Product', 'PRD', 'Agile'],
    template: `Draft an executive Product Requirements Document (PRD) for the feature: "{{featureName}}".
Problem Statement: {{problemStatement}}
Target Users: {{targetUsers}}
Include:
1. Executive Summary & Success Metrics (KPIs)
2. User Personas & Core User Stories
3. Detailed Functional Requirements & Non-Functional Constraints (Latency, Security, SLA)
4. Out-of-Scope Items & Future Roadmap Phase`,
    variables: [
      { name: 'featureName', label: 'Feature Name', placeholder: 'Multi-Tenant Team Workspaces', defaultValue: 'Automated Real-Time AI Usage Quota Alerts & Webhooks', type: 'text' },
      { name: 'problemStatement', label: 'Problem Statement', placeholder: 'Users exceed daily API limits without warning...', defaultValue: 'Developers and enterprise accounts currently experience API throttling unexpectedly when exceeding quotas without proactive notifications or automated threshold alerts.', type: 'textarea' },
      { name: 'targetUsers', label: 'Target Users', placeholder: 'SaaS Admins, Enterprise Developers', defaultValue: 'Enterprise Tech Leads, Platform Administrators, and FinOps Engineers', type: 'text' },
    ],
  },
];
