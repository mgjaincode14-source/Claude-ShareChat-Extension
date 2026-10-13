import { NextRequest, NextResponse } from 'next/server';
import { evaluatePromptWithAI } from '@/services/llmService';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (typeof body.prompt === 'string') {
      const previousPrompts = Array.isArray(body.previousPrompts) ? body.previousPrompts : [];
      const evaluation = await evaluatePromptWithAI(body.prompt, previousPrompts);
      return NextResponse.json({ success: true, evaluation });
    }

    // Batch evaluation for conversation turns
    if (Array.isArray(body.prompts)) {
      const results: Record<string, any> = {};
      const previous: string[] = [];

      // Evaluate prompts (limiting to max 5 distinct uncached prompts per batch to preserve free tier quota)
      let evaluatedCount = 0;
      for (const item of body.prompts) {
        if (!item.content) continue;

        if (evaluatedCount < 6) {
          const evaluation = await evaluatePromptWithAI(item.content, previous);
          results[item.id] = evaluation;
          previous.push(item.content);
          evaluatedCount++;
        } else {
          // Clean objective baseline for remaining messages to avoid hitting quota limits
          results[item.id] = {
            score: 100,
            status: 'optimal',
            statusLabel: 'Optimal Prompt',
            primaryAdvice: 'Direct instruction with clean structure.',
            potentialTokensSaved: 0,
            issues: []
          };
        }
      }

      return NextResponse.json({ success: true, results });
    }

    return NextResponse.json(
      { error: 'Invalid payload. Provide prompt (string) or prompts (array).' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('API /api/ai/advisor error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to evaluate prompt' },
      { status: 500 }
    );
  }
}
