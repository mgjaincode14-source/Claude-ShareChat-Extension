import { NextRequest, NextResponse } from 'next/server';
import { countTokens } from '@anthropic-ai/tokenizer';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (Array.isArray(body.texts)) {
      const counts = body.texts.map((t: string) => (typeof t === 'string' ? countTokens(t) : 0));
      return NextResponse.json({ counts, success: true });
    }

    if (typeof body.text === 'string') {
      const count = countTokens(body.text);
      return NextResponse.json({ count, success: true });
    }

    return NextResponse.json(
      { error: 'Invalid payload. Provide text (string) or texts (string[])' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Tokenizer API error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to tokenize' },
      { status: 500 }
    );
  }
}
