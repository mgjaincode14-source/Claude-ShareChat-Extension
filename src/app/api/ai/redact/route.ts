import { NextRequest, NextResponse } from 'next/server';
import { detectPIIWithAI, detectPIIBatchWithAI } from '@/services/llmService';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const options = body.options || {};

    // Single text detection
    if (typeof body.text === 'string') {
      const entities = await detectPIIWithAI(body.text, options);
      return NextResponse.json({ success: true, entities });
    }

    // High-efficiency batch messages detection: runs in 1 single LLM call
    if (Array.isArray(body.messages)) {
      const results = await detectPIIBatchWithAI(body.messages, options);
      return NextResponse.json({ success: true, results });
    }

    return NextResponse.json(
      { error: 'Invalid payload. Provide text (string) or messages (array).' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('API /api/ai/redact error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to detect PII entities' },
      { status: 500 }
    );
  }
}
