import { NextRequest, NextResponse } from 'next/server';
import { analyzeSentimentWithAI } from '@/services/llmService';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (Array.isArray(body.messages)) {
      const sentimentMap = await analyzeSentimentWithAI(body.messages);
      return NextResponse.json({ success: true, sentimentMap });
    }

    if (typeof body.text === 'string') {
      const sender = body.sender || 'user';
      const singleId = body.id || 'single';
      const sentimentMap = await analyzeSentimentWithAI([{ id: singleId, content: body.text, sender }]);
      return NextResponse.json({ success: true, sentiment: sentimentMap[singleId] });
    }

    return NextResponse.json(
      { error: 'Invalid payload. Provide messages array or text string.' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('API /api/ai/sentiment error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to analyze sentiment' },
      { status: 500 }
    );
  }
}
