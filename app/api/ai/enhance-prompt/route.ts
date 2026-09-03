import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { extractBearerToken, verifyToken } from '@/lib/auth';

let geminiClient: GoogleGenAI | null = null;

function getGemini(): GoogleGenAI | null {
  if (!geminiClient && process.env.GEMINI_API_KEY) {
    geminiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return geminiClient;
}

export async function POST(req: NextRequest) {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    const { prompt, tone = 'Professional', toolName = 'General Assistant' } = await req.json();

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const gemini = getGemini();

    if (gemini) {
      try {
        const systemInstruction = `You are a world-class prompt engineer specializing in enterprise LLMs.
Your task is to take a raw user prompt and rewrite it into a highly effective, clear, structured prompt for an AI tool named "${toolName}".
Apply the requested tone: "${tone}".

Rules:
1. Make the prompt clear, unambiguous, and directive.
2. Add output format constraints (e.g. Markdown headers, TypeScript code blocks, bullet points).
3. Include edge cases, role context, and constraints.
4. Return ONLY the enhanced prompt without markdown explanations or meta-commentary like "Here is your enhanced prompt:".`;

        const response = await gemini.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: `Raw User Prompt: "${prompt.trim()}"\n\nEnhance this prompt now.`,
          config: {
            systemInstruction,
            temperature: 0.4,
          },
        });

        const enhancedText = response.text?.trim() || prompt.trim();
        const estTokens = Math.max(10, Math.round(enhancedText.length / 4));

        return NextResponse.json({
          success: true,
          enhancedPrompt: enhancedText,
          originalLength: prompt.length,
          enhancedLength: enhancedText.length,
          estimatedTokens: estTokens,
          readabilityScore: 'Grade 11 · Professional',
        });
      } catch (err) {
        console.warn('Gemini API call for prompt enhancement failed, using heuristic enhancer:', err);
      }
    }

    // Heuristic Fallback Prompt Enhancer
    const trimmed = prompt.trim();
    const enhancedText = `Act as an expert ${toolName} with high-level domain mastery.\n\nTask:\n${trimmed}\n\nConstraints & Guidelines:\n- Tone: ${tone}\n- Provide step-by-step reasoning where applicable.\n- Use structured markdown formatting with clear headings.\n- Ensure all edge cases and best practices are fully addressed.`;
    const estTokens = Math.max(10, Math.round(enhancedText.length / 4));

    return NextResponse.json({
      success: true,
      enhancedPrompt: enhancedText,
      originalLength: prompt.length,
      enhancedLength: enhancedText.length,
      estimatedTokens: estTokens,
      readabilityScore: 'Grade 10 · Standard',
    });
  } catch (error) {
    console.error('Enhance prompt API error:', error);
    return NextResponse.json({ error: 'Failed to enhance prompt' }, { status: 500 });
  }
}
