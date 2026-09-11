import { NextResponse } from 'next/server';
import { parseClaudeConversationObject } from '@/phase1/parser';
import fs from 'fs';
import path from 'path';

const CACHE_FILE_PATH = path.join(process.cwd(), 'src', 'phase1', 'bridged_cache.json');

function getCachedBridgedConversations(): any[] {
  try {
    if (fs.existsSync(CACHE_FILE_PATH)) {
      const fileData = fs.readFileSync(CACHE_FILE_PATH, 'utf-8');
      return JSON.parse(fileData) || [];
    }
  } catch (err) {
    console.warn('Error reading bridged cache file:', err);
  }
  return [];
}

function saveCachedBridgedConversations(conversations: any[]) {
  try {
    const dir = path.dirname(CACHE_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(conversations, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Error writing bridged cache file:', err);
  }
}

// Handle CORS Pre-flight OPTIONS request
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

export async function POST(req: Request) {
  try {
    const rawPayload = await req.json();

    if (!rawPayload || !rawPayload.chat_messages) {
      return NextResponse.json(
        { success: false, error: 'Invalid payload structure' },
        {
          status: 400,
          headers: { 'Access-Control-Allow-Origin': '*' }
        }
      );
    }

    const unifiedConv = parseClaudeConversationObject(rawPayload, 'browser_extension');
    const currentCache = getCachedBridgedConversations();

    // Filter out duplicates by id
    const filteredCache = currentCache.filter((c) => c.id !== unifiedConv.id);
    filteredCache.unshift(unifiedConv);

    saveCachedBridgedConversations(filteredCache);

    return NextResponse.json(
      {
        success: true,
        conversation: unifiedConv,
        message: `Successfully bridged ${unifiedConv.messages.length} message(s)`
      },
      {
        status: 200,
        headers: { 'Access-Control-Allow-Origin': '*' }
      }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Bridge import error' },
      {
        status: 500,
        headers: { 'Access-Control-Allow-Origin': '*' }
      }
    );
  }
}

export async function GET() {
  const cached = getCachedBridgedConversations();
  return NextResponse.json(
    {
      success: true,
      latestConversations: cached
    },
    {
      status: 200,
      headers: { 'Access-Control-Allow-Origin': '*' }
    }
  );
}
