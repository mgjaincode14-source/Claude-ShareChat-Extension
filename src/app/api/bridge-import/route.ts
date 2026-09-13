import { NextResponse } from 'next/server';
import { parseClaudeConversationObject } from '@/phase1/parser';
import fs from 'fs';
import path from 'path';

const CACHE_FILE_PATH = path.join(process.cwd(), 'src', 'phase1', 'bridged_cache.json');

interface BridgeCache {
  lastImportId: string | null;
  conversations: any[];
}

function readCache(): BridgeCache {
  try {
    if (fs.existsSync(CACHE_FILE_PATH)) {
      const fileData = fs.readFileSync(CACHE_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(fileData);
      // Handle legacy format (plain array)
      if (Array.isArray(parsed)) {
        return {
          lastImportId: parsed.length > 0 ? parsed[0].id : null,
          conversations: parsed
        };
      }
      return parsed;
    }
  } catch (err) {
    console.warn('Error reading bridged cache file:', err);
  }
  return { lastImportId: null, conversations: [] };
}

function writeCache(cache: BridgeCache) {
  try {
    const dir = path.dirname(CACHE_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(cache, null, 2), 'utf-8');
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

    if (!rawPayload || !(rawPayload.chat_messages || rawPayload.messages)) {
      return NextResponse.json(
        { success: false, error: 'Invalid payload structure' },
        {
          status: 400,
          headers: { 'Access-Control-Allow-Origin': '*' }
        }
      );
    }

    // Use 'browser_extension' source — the bookmarklet fetches from Claude's
    // internal API which returns the FULL conversation with per-message
    // created_at timestamps (real ISO strings). The parser will trust those
    // and NOT apply any synthetic date fallback.
    const unifiedConv = parseClaudeConversationObject(rawPayload, 'browser_extension');

    const cache = readCache();

    // Deduplicate: remove existing conversation with the same id
    cache.conversations = cache.conversations.filter((c) => c.id !== unifiedConv.id);
    cache.conversations.unshift(unifiedConv);

    // Track latest import for polling detection
    cache.lastImportId = unifiedConv.id;

    writeCache(cache);

    return NextResponse.json(
      {
        success: true,
        conversation: unifiedConv,
        message: `Successfully bridged ${unifiedConv.messages.length} message(s) with original timestamps`
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
  const cache = readCache();
  return NextResponse.json(
    {
      success: true,
      lastImportId: cache.lastImportId,
      latestConversations: cache.conversations
    },
    {
      status: 200,
      headers: { 'Access-Control-Allow-Origin': '*' }
    }
  );
}
